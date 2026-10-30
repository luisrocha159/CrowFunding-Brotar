import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID,createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {ContactMail,ContactMailSender} from '../src/contacts/contact-mail'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {setTimeout as delay} from 'node:timers/promises'
import type {SupportAdminDetail,SupportDetail} from '../src/support-cases/application/support-cases'

test('soporte bidireccional y correo: propiedad, estados, reintentos concurrentes, rollback, privacidad y opt-in',{timeout:90000},async()=>{
 const cfg=readDatabaseConfig(process.env);assert.ok(cfg.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container}=readTestDatabaseTarget(cfg),sql=(query:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:query,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:15000}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}))
 const ip=`support-mail-${randomUUID()}`;app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:ip});next()});await app.listen(0,'127.0.0.1')
 const base=await app.getUrl(),campaign=randomUUID(),users:{id:string;email:string;cookie:string}[]=[],suffix=randomUUID(),password=randomBytes(24).toString('hex'),mail=app.get(ContactMail),sender=app.get(ContactMailSender)
 let fail=false,caseId='',raceCase='';const raceContribution=randomUUID(),raceDispute=randomUUID(),delivered:{to:string;subject:string;text:string}[]=[]
 sender.available=()=>true;sender.origin=()=>'http://127.0.0.1:5173';sender.send=async(to,subject,text)=>{if(fail)throw new Error('SMTP test');delivered.push({to,subject,text})}
 const call=(path:string,cookie='',body?:unknown,csrf=true)=>fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:'http://127.0.0.1:5173','Content-Type':'application/json',...(csrf?{'X-Brotar-Request':'1'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const reset=()=>sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN (${[`ip:${ip}`,...users.map(u=>`account:${u.id}`)].map(k=>`'${createHash('sha256').update('mvp-case-write:'+k).digest('hex')}'`).join(',')});`)
 const trigger='support_mail_test_'+suffix.replaceAll('-','')
 try{
  for(let i=0;i<3;i++){const email=`support-mail-${i}-${suffix}@example.invalid`,r=await call('auth/register','',{ legalVersion:'mvp-demo-legal-1.0-20261028',email,password,firstName:'DEMO',lastName:'Soporte',demoConsent:true});assert.equal(r.status,201);const {id}=await r.json() as{id:string};const login=await call('auth/login','',{email,password});assert.equal(login.status,200);users.push({id,email,cookie:login.headers.get('set-cookie')!.split(';')[0]!})}
  const [owner,other,staff]=users as [typeof users[number],typeof users[number],typeof users[number]]
  sql(`INSERT INTO public.user_role(user_id,role_id) SELECT '${staff.id}',id FROM public.role WHERE code='SUPPORT';
   INSERT INTO public.campaign(id,slug,creator_user_id,title,summary,campaign_type,goal_amount,currency_code,status,published_at)
   VALUES('${campaign}','support-mail-${campaign}','${other.id}','DEMO Campaña de soporte','DEMO Información pública para una prueba aislada','DONATION',100,'BOB','PUBLISHED',clock_timestamp());
   UPDATE public.app_user SET email_verified_at=clock_timestamp() WHERE id='${owner.id}';
   INSERT INTO brotar_extension.mail_preference(user_id,verified_email,enabled) SELECT id,email,true FROM public.app_user WHERE id='${owner.id}';`)
  const created=await call('me/support-cases',owner.cookie,{requestId:randomUUID(),campaignId:campaign,contributionId:null,category:'INCORRECT_INFORMATION',subject:'DEMO Solicitud de revisión',description:'PRIVADO_NO_ENVIAR: información particular del niño y su campaña.',evidenceFileIds:[],confirmed:true});assert.equal(created.status,201);caseId=(await created.json() as{id:string}).id
  const ownPath=`me/support-cases/${caseId}/messages`,staffPath=`admin/support-cases/${caseId}/messages`,statusPath=`admin/support-cases/${caseId}/actions`
  const body='Confirmo la información solicitada del niño y su campaña; pueden continuar la revisión.',key=randomUUID(),reply={requestId:key,body}
  assert.equal((await call(ownPath,'',reply)).status,401);assert.equal((await call(ownPath,other.cookie,reply)).status,404);assert.equal((await call(ownPath,owner.cookie,reply,false)).status,403)
  for(const patch of [{requestId:null},{body:' '},{body:'x'.repeat(19)},{body:'x'.repeat(5001)},{body:'Respuesta inválida con control \0'},{body:'Respuesta inválida con sustituto \uD800'},{body:'<script>Contenido inválido</script>'},{is_internal:true},{userId:other.id}])assert.equal((await call(ownPath,owner.cookie,{...reply,...patch})).status,400)
  reset()
  // La caída de la inserción del aviso revierte también mensaje, estado y clave.
  sql(`CREATE FUNCTION brotar_extension.${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.case_id='${caseId}'::uuid THEN RAISE EXCEPTION 'fallo inducido QA'; END IF; RETURN NEW; END$$;
   CREATE TRIGGER ${trigger} BEFORE INSERT ON brotar_extension.support_mail_event FOR EACH ROW EXECUTE FUNCTION brotar_extension.${trigger}();`)
  const staffKey=randomUUID(),staffReply={requestId:staffKey,body:'PRIVADO_MENSAJE: necesitamos confirmar los datos para continuar la atención.'}
  assert.equal((await call(staffPath,staff.cookie,staffReply)).status,500)
  assert.equal(sql(`SELECT status FROM public.support_case WHERE id='${caseId}'`),'OPEN');assert.equal(sql(`SELECT count(*) FROM public.support_case_message WHERE support_case_id='${caseId}'`),'0');assert.equal(sql(`SELECT count(*) FROM brotar_extension.support_reply_request WHERE case_id='${caseId}'`),'0')
  sql(`DROP TRIGGER ${trigger} ON brotar_extension.support_mail_event; DROP FUNCTION brotar_extension.${trigger}();`)
  for(const r of await Promise.all([call(staffPath,staff.cookie,staffReply),call(staffPath,staff.cookie,staffReply)]))assert.equal(r.status,200)
  assert.equal(sql(`SELECT count(*) FROM brotar_extension.support_mail_event WHERE case_id='${caseId}'`),'1','Un reintento no crea dos avisos.')
  assert.equal((await call(staffPath,staff.cookie,{body:staffReply.body})).status,400)
  assert.equal((await call(statusPath,staff.cookie,{status:'AWAITING_RESPONSE',reason:'Necesitamos que el titular confirme la información.'})).status,200)
  for(const r of await Promise.all([call(ownPath,owner.cookie,reply),call(ownPath,owner.cookie,reply)]))assert.equal(r.status,200)
  const detail=await (await call(`me/support-cases/${caseId}`,owner.cookie)).json() as SupportDetail
  assert.equal(detail.status,'IN_PROGRESS');assert.equal(detail.replyAllowed,true);assert.equal(detail.messages.length,2);assert.equal(detail.messages[1]!.from,'you');assert.equal(detail.messages[1]!.body,body)
  assert.equal((await call(ownPath,owner.cookie,{...reply,body:body+' Otro texto.'})).status,409)
  const admin=await (await call(`admin/support-cases/${caseId}`,staff.cookie)).json() as SupportAdminDetail
  assert.deepEqual(admin.messages.map(m=>m.from),['support','reporter']);assert.equal(admin.events.at(-1)!.status,'IN_PROGRESS')
  sql(`INSERT INTO public.support_case_message(support_case_id,author_user_id,body,is_internal) VALUES('${caseId}','${staff.id}','NOTA_INTERNA_NO_ENVIAR',true);`)
  assert.ok(!JSON.stringify(await (await call(`me/support-cases/${caseId}`,owner.cookie)).json()).includes('NOTA_INTERNA_NO_ENVIAR'))
  assert.equal(sql(`SELECT count(*) FROM brotar_extension.support_mail_event WHERE case_id='${caseId}'`),'2','El titular no se envía un correo a sí mismo.')
  await Promise.all([mail.collect(),mail.collect()]);const notices=()=>mail.notices(owner.id)
  assert.equal((await notices()).filter(n=>n.entityName==='SUPPORT_CASE').length,2)
  assert.equal(sql(`SELECT count(*) FROM brotar_extension.support_mail_event e JOIN public.notification n ON n.id=e.notification_id WHERE e.case_id='${caseId}' AND n.created_at<>e.created_at`),'0','Los avisos conservan la fecha y precisión del evento de soporte.')
  assert.equal((await mail.notices(other.id)).filter(n=>n.entityName==='SUPPORT_CASE').length,0)
  fail=true;await mail.tick();assert.equal(sql(`SELECT count(*) FROM brotar_extension.mail_delivery d JOIN public.notification n ON n.id=d.notification_id WHERE n.entity_id='${caseId}' AND d.result='RETRY' AND d.attempts=1`),'2')
  sql(`UPDATE brotar_extension.mail_delivery SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE notification_id IN(SELECT id FROM public.notification WHERE entity_id='${caseId}');`)
  fail=false;await mail.tick();const sent=delivered.filter(m=>m.to===owner.email);assert.equal(sent.length,2);await mail.tick();assert.equal(delivered.filter(m=>m.to===owner.email).length,2)
  for(const m of sent){assert.ok(m.text.includes(`/mis-incidencias/${caseId}`));assert.doesNotMatch(m.text,/PRIVADO_NO_ENVIAR|PRIVADO_MENSAJE|NOTA_INTERNA_NO_ENVIAR/)}
  reset()
  assert.equal((await call(statusPath,staff.cookie,{status:'RESOLVED',reason:'La información fue revisada y el caso quedó resuelto.'})).status,200);await mail.collect();await mail.preference(owner.id,false);await mail.tick()
  assert.equal((await notices()).find(n=>n.entityName==='SUPPORT_CASE')!.delivery,'CANCELLED','Cancelar el aviso si se retira la preferencia antes de enviar.')
  assert.equal((await call(statusPath,staff.cookie,{status:'CLOSED',reason:'Se registra el cierre del caso después de resolverlo.'})).status,200);await mail.collect()
  assert.equal((await notices()).find(n=>n.entityName==='SUPPORT_CASE')!.delivery,'IN_APP','Sin consentimiento conserva aviso interno, sin SMTP.')
  assert.equal((await call(ownPath,owner.cookie,reply)).status,200,'Se recupera una respuesta ya guardada incluso después del cierre.')
  assert.equal((await call(staffPath,staff.cookie,staffReply)).status,200)
  assert.equal((await call(ownPath,owner.cookie,{...reply,requestId:randomUUID()})).status,409)
  assert.equal((await call(staffPath,staff.cookie,{...staffReply,requestId:randomUUID()})).status,404)
  assert.equal((await (await call(`me/support-cases/${caseId}`,owner.cookie)).json() as SupportDetail).replyAllowed,false)
  reset()
  const race=await call('me/support-cases',owner.cookie,{requestId:randomUUID(),campaignId:campaign,contributionId:null,category:'INCORRECT_INFORMATION',subject:'DEMO Concurrencia de revisión',description:'DEMO Caso aislado para comprobar el cambio simultáneo hacia disputa.',evidenceFileIds:[],confirmed:true});assert.equal(race.status,201);raceCase=(await race.json() as{id:string}).id
  const runner=app.get(DatabaseService).connection().createQueryRunner();await runner.connect();await runner.startTransaction()
  try{
   await runner.query('SELECT id FROM public.support_case WHERE id=$1 FOR UPDATE',[raceCase])
   const [blocker]=await runner.query('SELECT pg_backend_pid() AS pid')
   const pending=call(`me/support-cases/${raceCase}/messages`,owner.cookie,{requestId:randomUUID(),body})
   let waiting=false
   for(let i=0;i<100;i++){const [state]=await app.get(DatabaseService).connection().query('SELECT EXISTS(SELECT 1 FROM pg_stat_activity a WHERE $1=ANY(pg_blocking_pids(a.pid))) AS waiting',[blocker.pid]);if(state.waiting){waiting=true;break}await delay(20)}
   assert.ok(waiting,'La respuesta debe esperar el bloqueo del caso antes de simular su conversión.')
   await runner.query('INSERT INTO public.contribution(id,user_id,campaign_id,amount,currency_code) VALUES($1,$2,$3,10,\'BOB\')',[raceContribution,owner.id,campaign])
   await runner.query("INSERT INTO public.dispute(id,contribution_id,campaign_id,support_case_id,raised_by,reason_code,description) VALUES($1,$2,$3,$4,$5,'OTHER','DEMO Conversión concurrente')",[raceDispute,raceContribution,campaign,raceCase,owner.id])
   await runner.commitTransaction()
   assert.equal((await pending).status,404,'Después de esperar, una disputa recién vinculada impide la respuesta general.')
   assert.equal(sql(`SELECT count(*) FROM public.support_case_message WHERE support_case_id='${raceCase}'`),'0')
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release()}
  sql(`INSERT INTO public.user_role(user_id,role_id) SELECT '${owner.id}',id FROM public.role WHERE code='AUDITOR';`)
  assert.equal((await call(ownPath,owner.cookie,reply)).status,403);assert.equal((await call(`me/support-cases/${caseId}`,owner.cookie)).status,200)
 }finally{
  await app.close();sql(`DROP TRIGGER IF EXISTS ${trigger} ON brotar_extension.support_mail_event; DROP FUNCTION IF EXISTS brotar_extension.${trigger}();`)
  sql(`DELETE FROM public.status_history WHERE entity_type='DISPUTE' AND entity_id='${raceDispute}';DELETE FROM public.dispute WHERE id='${raceDispute}';DELETE FROM public.contribution WHERE id='${raceContribution}';`)
  for(const c of [caseId,raceCase].filter(Boolean))sql(`DELETE FROM brotar_extension.support_case_event WHERE case_id='${c}';DELETE FROM brotar_extension.support_case_context WHERE case_id='${c}';DELETE FROM public.support_case WHERE id='${c}';`)
  sql(`DELETE FROM public.status_history WHERE entity_type='CAMPAIGN' AND entity_id='${campaign}';DELETE FROM public.campaign WHERE id='${campaign}';`)
  for(const u of users)sql(`DELETE FROM public.audit_log WHERE actor_user_id='${u.id}';DELETE FROM public.app_user WHERE id='${u.id}';`)
  if(users.length)reset()
 }
})
