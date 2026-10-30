import {createHash, randomBytes, randomUUID} from 'node:crypto'
import {BadRequestException, HttpException, Injectable, ServiceUnavailableException, type OnModuleDestroy, type OnModuleInit} from '@nestjs/common'
import {DatabaseService} from '../shared/infrastructure/database/database.service'
import {recordAudit,setAuditActor} from '../shared/infrastructure/database/audit'
import {transactionRegisteredAccess} from '../roles/infrastructure/transaction-access'
import type {EntityManager} from 'typeorm'
import {smtpRecoveryConfig,smtpRecoveryTransport} from '../auth/infrastructure/smtp-recovery-delivery'

const hash=(token:string)=>createHash('sha256').update(token).digest('hex')
export interface ContactNotice {id:string;title:string;body:string;entityName:string;createdAt:Date;readAt:Date|null;delivery:string;attempts:number}
const labels:Record<string,string>={CAMPAIGN:'campaña',VERIFICATION:'verificación',PAYMENT:'pago DEMO',REFUND:'devolución DEMO',DISPUTE:'reclamación',DISBURSEMENT:'desembolso DEMO',REWARD_FULFILLMENT:'recompensa'}
const states:Record<string,string>={DRAFT:'borrador',SUBMITTED:'enviada',PENDING_REVIEW:'pendiente de revisión',IN_REVIEW:'en revisión',REQUIRES_CHANGES:'con observaciones',CHANGES_REQUESTED:'con observaciones',PENDING_VERIFICATION:'pendiente de verificación',FUNDING_ENDED:'financiamiento finalizado',NOT_STARTED:'sin iniciar',INITIATED:'iniciado',DISPUTED:'en disputa',UNDER_REVIEW:'en revisión',AWAITING_RESPONSE:'esperando respuesta',ESCALATED:'escalada',IN_PROGRESS:'en atención',REQUIRES_INFO:'se requiere información',APPROVED:'aprobada',REJECTED:'rechazada',PUBLISHED:'publicada',ACTIVE:'activa',FUNDED:'meta alcanzada',SUCCESSFUL:'financiada',FAILED:'fallida',CANCELLED:'cancelada',EXPIRED:'vencida',CLOSED:'cerrada',COMPLETED:'completada',EXECUTING:'en ejecución',IN_EXECUTION:'en ejecución',PENDING:'pendiente',PROCESSING:'en proceso',CONFIRMED:'confirmado',SUCCEEDED:'completado',REFUNDED:'devuelto',REQUESTED:'solicitada',OPEN:'abierta',RESOLVED:'resuelta',FULFILLED:'cumplida'}
export function stateNotice(entity:string,state:string){return {title:`Cambio en tu ${labels[entity]??'registro'}`,body:`Estado registrado: ${states[state]??state}. Consulta los detalles y las observaciones en Brotar. Los movimientos económicos de este MVP son simulaciones; este aviso no acredita transferencias reales.`}}
export function supportNotice(kind:'MESSAGE'|'STATUS',status:string){
 const names:Record<string,string>={OPEN:'abierta',IN_PROGRESS:'en atención',AWAITING_RESPONSE:'esperando tu respuesta',RESOLVED:'resuelta',CLOSED:'cerrada'}
 return {title:kind==='MESSAGE'?'Nueva respuesta de soporte':'Cambio en tu incidencia',body:kind==='MESSAGE'
  ?'Soporte respondió a tu incidencia. Inicia sesión en Brotar para leer el mensaje privado. Este aviso no procesa pagos ni devoluciones.'
  :`Tu incidencia está ${names[status]??'actualizada'}. Inicia sesión en Brotar para consultar el motivo. Este aviso no procesa pagos ni devoluciones.`}
}

/** Único punto SMTP; los tests lo sustituyen sin enviar a cuentas ajenas. */
@Injectable()
export class ContactMailSender {
 available(){return smtpRecoveryConfig(process.env)!==null && process.env.PASSWORD_RESET_LOCAL_FILE!=='true'}
 async send(to:string,subject:string,text:string,id?:string){
  const config=smtpRecoveryConfig(process.env)
  if(!config||!this.available())throw new ServiceUnavailableException('Correo real no configurado.')
  const transport=smtpRecoveryTransport(config)
  try{const result=await transport.sendMail({from:config.from,to,subject,text,...(id?{messageId:`<${id}@brotar.local>`}:{})});if(!result.accepted.length)throw new Error('SMTP no aceptó el mensaje.')}
  finally{transport.close()}
 }
 origin(){return smtpRecoveryConfig(process.env)?.origin??''}
}

@Injectable()
export class ContactMail implements OnModuleInit, OnModuleDestroy {
 private timer:ReturnType<typeof setInterval>|undefined
 private working=false
 constructor(private readonly db:DatabaseService,private readonly sender:ContactMailSender){}
 onModuleInit(){if(process.env.DATABASE_ENABLED==='false'||process.env.NODE_ENV==='test'||process.env.ALLOW_DB_TEST_WRITES==='true')return;this.timer=setInterval(()=>{void this.tick().catch(()=>console.error('No se pudo procesar la cola de notificaciones; revisar disponibilidad del servicio.'))},15000);this.timer.unref()}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer)}
 async status(user:string){
  const [row]=await this.db.connection().query(`SELECT u.email,CASE WHEN p.verified_email=u.email THEN u.email_verified_at END AS "verifiedAt",u.phone_verified_at AS "phoneVerifiedAt",COALESCE(p.enabled AND p.verified_email=u.email AND u.email_verified_at IS NOT NULL,false) AS "emailNotifications"
   FROM public.app_user u LEFT JOIN brotar_extension.mail_preference p ON p.user_id=u.id WHERE u.id=$1`,[user])
  return {...row,channelAvailable:this.sender.available(),phoneChannelAvailable:false}
 }
 async request(user:string){
  if(!this.sender.available())throw new ServiceUnavailableException('Configura el canal de correo real; el buzón local no acredita posesión del correo.')
  const raw=randomBytes(32).toString('hex')
  const email=await this.db.connection().transaction(async m=>{
   await m.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE',[user]);await transactionRegisteredAccess(m,user)
   const [u]=await m.query(`SELECT u.email,CASE WHEN p.verified_email=u.email THEN u.email_verified_at END AS verified FROM public.app_user u LEFT JOIN brotar_extension.mail_preference p ON p.user_id=u.id WHERE u.id=$1`,[user])
   if(u.verified)return null
   await m.query('UPDATE public.app_user SET email_verified_at=NULL WHERE id=$1',[user])
   const [limit]=await m.query(`SELECT count(*) FILTER(WHERE requested_at>clock_timestamp()-interval '60 seconds')::int AS recent,
    count(*)::int AS hourly FROM brotar_extension.email_challenge WHERE user_id=$1 AND requested_at>clock_timestamp()-interval '1 hour'`,[user])
   if(limit.recent>0||limit.hourly>=5)throw new HttpException('Espera un minuto entre solicitudes; máximo cinco por hora.',429)
   await m.query(`UPDATE public.user_token SET revoked_at=clock_timestamp() WHERE user_id=$1 AND token_type='EMAIL_VERIFICATION' AND used_at IS NULL AND revoked_at IS NULL`,[user])
   const [t]=await m.query(`INSERT INTO public.user_token(user_id,token_type,token_hash,expires_at) VALUES($1,'EMAIL_VERIFICATION',$2,clock_timestamp()+interval '30 minutes') RETURNING id`,[user,hash(raw)])
   await m.query('INSERT INTO brotar_extension.email_challenge(token_id,user_id,email) VALUES($1,$2,$3)',[t.id,user,u.email])
   return u.email as string
  })
  if(!email)return {status:'already_verified'}
  try{await this.sender.send(email,'Brotar: verifica tu correo',`Confirma tu correo desde tu propia cuenta de Brotar. Este enlace vence en 30 minutos y se usa una sola vez:\n${this.sender.origin()}/verificar-correo#token=${raw}\nAbre la página y pulsa Confirmar correo. Si no lo solicitaste, ignora este mensaje. Verificar correo no verifica identidad, teléfono ni concede roles.`)}
  catch{await this.db.connection().query(`UPDATE public.user_token SET revoked_at=clock_timestamp() WHERE token_hash=$1 AND token_type='EMAIL_VERIFICATION'`,[hash(raw)]);throw new ServiceUnavailableException('El servidor de correo no confirmó la aceptación. Espera y vuelve a solicitar el enlace.')}
  return {status:'smtp_accepted'}
 }
 async confirm(user:string,token:string){
  return this.db.connection().transaction(async m=>{
   await m.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE',[user]);await transactionRegisteredAccess(m,user)
   const [t]=await m.query(`SELECT t.id FROM public.user_token t JOIN brotar_extension.email_challenge c ON c.token_id=t.id JOIN public.app_user u ON u.id=t.user_id
    WHERE t.user_id=$1 AND t.token_hash=$2 AND t.token_type='EMAIL_VERIFICATION' AND c.user_id=u.id AND c.email=u.email AND u.email_verified_at IS NULL
    AND t.used_at IS NULL AND t.revoked_at IS NULL AND t.expires_at>clock_timestamp() FOR UPDATE OF t`,[user,hash(token)])
   if(!t)throw new BadRequestException('Enlace vencido, usado o no disponible para esta cuenta. Solicita uno nuevo desde Mi cuenta.')
   await setAuditActor(m,user)
   await m.query('UPDATE public.app_user SET email_verified_at=clock_timestamp() WHERE id=$1',[user])
   await m.query(`INSERT INTO brotar_extension.mail_preference(user_id,verified_email) SELECT id,email FROM public.app_user WHERE id=$1 ON CONFLICT(user_id) DO UPDATE SET verified_email=EXCLUDED.verified_email,enabled=false,updated_at=clock_timestamp()`,[user])
   await m.query('UPDATE public.user_token SET used_at=clock_timestamp() WHERE id=$1',[t.id])
   await recordAudit(m,user,'UPDATE','app_user',user)
   return {verified:true}
  })
 }
 async preference(user:string,enabled:boolean){return this.db.connection().transaction(async m=>{
  await transactionRegisteredAccess(m,user)
  const [u]=await m.query('SELECT u.email_verified_at,p.verified_email=u.email AS matches FROM public.app_user u LEFT JOIN brotar_extension.mail_preference p ON p.user_id=u.id WHERE u.id=$1',[user])
  if(enabled&&(!u.email_verified_at||!u.matches))throw new BadRequestException('Verifica tu correo antes de activar avisos.')
  await m.query(`INSERT INTO brotar_extension.mail_preference(user_id,enabled) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET enabled=$2,updated_at=clock_timestamp()`,[user,enabled])
  await recordAudit(m,user,'UPDATE','app_user',user)
  return {enabled}
 })}
 async notices(user:string):Promise<ContactNotice[]>{
  return this.db.connection().query(`SELECT n.id,n.title,n.body,n.entity_name AS "entityName",n.created_at AS "createdAt",n.read_at AS "readAt",
   COALESCE(d.result,'IN_APP') AS "delivery",COALESCE(d.attempts,0) AS attempts FROM public.notification n LEFT JOIN brotar_extension.mail_delivery d ON d.notification_id=n.id
   WHERE n.user_id=$1 ORDER BY n.created_at DESC,n.id DESC LIMIT 50`,[user])
 }
 async read(user:string,id:string){return this.db.connection().transaction(async m=>{
  await transactionRegisteredAccess(m,user)
  const result=await m.query(`UPDATE public.notification SET status='READ',read_at=COALESCE(read_at,clock_timestamp()) WHERE id=$1 AND user_id=$2 RETURNING id`,[id,user]);const rows=Array.isArray(result[0])?result[0]:result;return {updated:rows.length>0}
 })}
 async collect(){return this.db.connection().transaction(async m=>{
  const [lock]=await m.query('SELECT pg_try_advisory_xact_lock(193026) AS locked');if(!lock.locked)return 0
  // Anti-join, no cursor de secuencia: una transacción que confirma tarde no pierde su evento.
  // Keep PostgreSQL microseconds: converting through JS Date would truncate them.
  const history=await m.query(`SELECT h.*,h.changed_at::text AS event_time FROM public.status_history h WHERE NOT EXISTS(SELECT 1 FROM brotar_extension.notification_source s WHERE s.history_id=h.id) ORDER BY h.id LIMIT 100`)
  for(const h of history){
   let owner: {id:string}|undefined
   const queries:Record<string,string>={
    CAMPAIGN:'SELECT creator_user_id AS id FROM public.campaign WHERE id=$1',
    VERIFICATION:'SELECT COALESCE(v.user_id,o.created_by) AS id FROM public.verification v LEFT JOIN public.organization o ON o.id=v.organization_id WHERE v.id=$1',
    PAYMENT:'SELECT c.user_id AS id FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1',
    REFUND:'SELECT c.user_id AS id FROM public.refund r JOIN public.contribution c ON c.id=r.contribution_id WHERE r.id=$1',
    DISPUTE:'SELECT raised_by AS id FROM public.dispute WHERE id=$1',
    DISBURSEMENT:'SELECT c.creator_user_id AS id FROM public.disbursement d JOIN public.campaign c ON c.id=d.campaign_id WHERE d.id=$1',
    REWARD_FULFILLMENT:'SELECT c.user_id AS id FROM public.reward_fulfillment r JOIN public.contribution c ON c.id=r.contribution_id WHERE r.id=$1'
   }
   if(h.from_status!==null&&queries[h.entity_type]) [owner]=await m.query(queries[h.entity_type]!,[h.entity_id])
   if(owner?.id){
    const notice=stateNotice(h.entity_type,h.to_status)
    const [n]=await m.query(`INSERT INTO public.notification(user_id,event_code,channel,title,body,entity_name,entity_id,created_at) VALUES($1,'STATE_CHANGED','IN_APP',$2,$3,$4,$5,$6) RETURNING id`,[owner.id,notice.title,notice.body,h.entity_type,h.entity_id,h.event_time])
    // Solo quien solicitó avisos y conserva un correo verificado. La UI sigue disponible sin SMTP.
    await this.queue(m,n.id,owner.id)
   }
   await m.query('INSERT INTO brotar_extension.notification_source(history_id) VALUES($1)',[h.id])
  }
  const pending:{id:string;recipient_user_id:string;case_id:string;kind:'MESSAGE'|'STATUS';status:string;event_time:string}[]=await m.query(`SELECT e.*,e.created_at::text AS event_time FROM brotar_extension.support_mail_event e
   WHERE e.processed_at IS NULL ORDER BY e.created_at,e.id LIMIT 100 FOR UPDATE OF e SKIP LOCKED`)
  for(const event of pending){
   let notification:string|null=null
   const [owner]=await m.query('SELECT user_id FROM public.support_case WHERE id=$1 AND user_id=$2',[event.case_id,event.recipient_user_id])
   if(owner){
    const notice=supportNotice(event.kind,event.status)
    const [n]=await m.query(`INSERT INTO public.notification(user_id,event_code,channel,title,body,entity_name,entity_id,created_at)
     VALUES($1,'STATE_CHANGED','IN_APP',$2,$3,'SUPPORT_CASE',$4,$5) RETURNING id`,[owner.user_id,notice.title,notice.body,event.case_id,event.event_time])
    notification=n.id;await this.queue(m,n.id,owner.user_id)
   }
   await m.query('UPDATE brotar_extension.support_mail_event SET notification_id=$2,processed_at=clock_timestamp() WHERE id=$1',[event.id,notification])
  }
  return history.length+pending.length
 })}
 private queue(m:EntityManager,id:string,user:string){return m.query(`INSERT INTO brotar_extension.mail_delivery(notification_id) SELECT $1 FROM public.app_user u JOIN brotar_extension.mail_preference p ON p.user_id=u.id
  WHERE u.id=$2 AND u.email_verified_at IS NOT NULL AND p.verified_email=u.email AND p.enabled AND u.deleted_at IS NULL AND u.status IN ('ACTIVE','PENDING_VERIFICATION')`,[id,user])}
 async tick(){
  if(this.working)return
  this.working=true
  try{
   for(let batch=0;batch<10;batch++){if(await this.collect()<100)break}
   if(!this.sender.available())return
   await this.db.connection().query(`UPDATE brotar_extension.mail_delivery SET result='FAILED',lease_id=NULL,leased_until=NULL WHERE result IN ('QUEUED','RETRY') AND attempts=3 AND leased_until<=clock_timestamp()`)
   for(let i=0;i<10;i++){
    const lease=randomUUID()
    const next=await this.db.connection().transaction(async m=>{
     const [row]=await m.query(`SELECT n.id,n.user_id,n.title,n.body,n.entity_name,n.entity_id,d.attempts FROM brotar_extension.mail_delivery d JOIN public.notification n ON n.id=d.notification_id
      WHERE d.result IN ('QUEUED','RETRY') AND d.attempts<3 AND d.next_attempt_at<=clock_timestamp() AND (d.leased_until IS NULL OR d.leased_until<=clock_timestamp())
      ORDER BY n.created_at LIMIT 1 FOR UPDATE OF d SKIP LOCKED`)
     if(!row)return null
     const [u]=await m.query(`SELECT u.email FROM public.app_user u JOIN brotar_extension.mail_preference p ON p.user_id=u.id WHERE u.id=$1 AND u.email_verified_at IS NOT NULL
      AND p.verified_email=u.email AND u.deleted_at IS NULL AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp()) AND p.enabled
      AND ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM public.support_case s WHERE s.id=$2 AND s.user_id=u.id))`,[row.user_id,row.entity_name==='SUPPORT_CASE'?row.entity_id:null])
     if(!u){await m.query(`UPDATE brotar_extension.mail_delivery SET result='CANCELLED' WHERE notification_id=$1`,[row.id]);return {cancelled:true} as const}
     await m.query(`UPDATE brotar_extension.mail_delivery SET lease_id=$2,leased_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1 WHERE notification_id=$1`,[row.id,lease])
     return {...row,email:u.email,cancelled:false} as {id:string;title:string;body:string;entity_name:string;entity_id:string;email:string;attempts:number;cancelled:false}
    })
    if(!next)break
    if(next.cancelled)continue
    let accepted=false
    const path=next.entity_name==='SUPPORT_CASE'?`/mis-incidencias/${next.entity_id}`:'/mi-cuenta'
    try{await this.sender.send(next.email,`Brotar: ${next.title}`,`${next.body}\nEntra a ${this.sender.origin()}${path} para consultar tus notificaciones.`,next.id);accepted=true}catch{/* Se registra el resultado, nunca la respuesta SMTP ni datos del destinatario. */}
    await this.db.connection().transaction(async m=>{
     const result=accepted?'SMTP_ACCEPTED':next.attempts>=2?'FAILED':'RETRY'
     await m.query(`UPDATE brotar_extension.mail_delivery SET result=$3,lease_id=NULL,leased_until=NULL,next_attempt_at=clock_timestamp()+interval '5 minutes' WHERE notification_id=$1 AND lease_id=$2`,[next.id,lease,result])
     if(accepted)await m.query(`UPDATE public.notification SET sent_at=clock_timestamp() WHERE id=$1`,[next.id])
    })
   }
  }finally{this.working=false}
 }
}
