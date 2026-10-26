import {Injectable,ForbiddenException,NotFoundException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {randomUUID} from 'node:crypto'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {decimal,LedgerConflict,LedgerInvalid,money,uuid} from '../../contributions/domain/payment'
import {assertDemoEnabled,demoProvider,lockDemo} from '../../demo-payments/infrastructure/demo-payments'
import {digest,requestKey} from '../../demo-payments/domain/demo'
import {refundCapacity,syncRefundState} from '../../refunds/infrastructure/demo-refunds'
import {caseText,disputeStates,disputeTransition} from '../domain/dispute'
export interface DisputeRequest{supportCaseId:string;paymentId:string;description:string;requestKey:string;demoConsent:true}
export interface DisputeAction{action:string;reason:string;expectedVersion:number;requestKey:string;demoConsent:true;priority?:number;recommendedAmount?:string}
export interface DisputeMessage{body:string;isInternal?:boolean;expectedVersion:number;requestKey:string;demoConsent:true}
const projection=`d.id,d.dispute_number AS reference,d.payment_id AS "paymentId",d.contribution_id AS "contributionId",d.campaign_id AS "campaignId",ca.title AS "campaignTitle",d.support_case_id AS "supportCaseId",s.case_number AS "supportReference",s.priority,d.reason_code AS category,d.description,d.status,d.raised_by AS "raisedBy",d.assigned_to AS "assignedTo",d.resolution,d.opened_at AS "createdAt",d.updated_at AS "updatedAt",x.version,x.financial_hold AS "financialHold",x.hold_amount::text AS "holdAmount",x.resolution_code AS "resolutionCode",x.recommended_amount::text AS "recommendedAmount",x.linked_refund_id AS "linkedRefundId",trim(p.currency_code) AS "currencyCode",r.status AS "refundStatus"`
const joins=`FROM public.dispute d JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id JOIN public.support_case s ON s.id=d.support_case_id JOIN public.campaign ca ON ca.id=d.campaign_id JOIN public.payment p ON p.id=d.payment_id LEFT JOIN public.refund r ON r.id=x.linked_refund_id`
function pageCheck(page:number){if(!Number.isSafeInteger(page)||page<1||page>10000)throw new LedgerInvalid('Página inválida.')}
@Injectable()
export class DemoDisputes{
 constructor(private readonly database:DatabaseService){}
 async list(actor:string,admin:boolean,page=1,status?:string,priority?:number){assertDemoEnabled();pageCheck(page)
  if(status && !disputeStates.includes(status as typeof disputeStates[number]) || priority!==undefined && (!Number.isInteger(priority)||priority<1||priority>5))throw new LedgerInvalid('Filtros inválidos.')
  return this.database.connection().transaction('REPEATABLE READ',async m=>{
   await transactionAccess(m,actor,admin?'support.read':'contribution.read.own')
   const where=`WHERE ($1::boolean OR d.raised_by=$2) AND ($3::text IS NULL OR d.status::text=$3) AND ($4::integer IS NULL OR s.priority=$4)`,args=[admin,actor,status??null,priority??null]
   const[count]=await m.query(`SELECT count(*)::int AS total ${joins} ${where}`,args)
   const items=await m.query(`SELECT ${projection} ${joins} ${where} ORDER BY s.priority,d.opened_at,d.id LIMIT 20 OFFSET $5`,[...args,(page-1)*20])
   return{mode:'DEMO',items,total:count.total,page,pageSize:20}
  })
 }
 async detail(actor:string,id:string,admin=false,page=1){assertDemoEnabled();uuid(id);pageCheck(page)
  return this.database.connection().transaction('REPEATABLE READ',async m=>{
   await transactionAccess(m,actor,admin?'support.read':'contribution.read.own')
   const[row]=await m.query(`SELECT ${projection} ${joins} WHERE d.id=$1 AND ($2::boolean OR d.raised_by=$3)`,[id,admin,actor]);if(!row)throw new NotFoundException('Disputa no disponible.')
   const messages=await m.query(`SELECT id,body,is_internal AS "isInternal",author_user_id AS "authorId",created_at AS at FROM public.support_case_message WHERE support_case_id=$1 AND ($2::boolean OR NOT is_internal) ORDER BY created_at,id LIMIT 20 OFFSET $3`,[row.supportCaseId,admin,(page-1)*20])
   const [mc]=await m.query(`SELECT count(*)::int AS total FROM public.support_case_message WHERE support_case_id=$1 AND ($2::boolean OR NOT is_internal)`,[row.supportCaseId,admin])
   const events=await m.query(`SELECT id,actor_id AS "actorId",action,previous_status AS "previousStatus",status,reason,recorded_at AS at FROM brotar_extension.demo_dispute_event WHERE dispute_id=$1 ORDER BY recorded_at,id LIMIT 20 OFFSET $2`,[id,(page-1)*20])
   const[ec]=await m.query('SELECT count(*)::int AS total FROM brotar_extension.demo_dispute_event WHERE dispute_id=$1',[id])
   const evidence=await m.query(`SELECT f.id AS "fileId",f.file_name AS name FROM brotar_extension.support_case_evidence e JOIN public.file_asset f ON f.id=e.file_id JOIN public.support_case s ON s.id=e.case_id WHERE e.case_id=$1 AND f.uploaded_by=s.user_id AND f.scope='PRIVATE' AND f.storage_key LIKE 'SUPPORT_EVIDENCE/%' AND f.deleted_at IS NULL ORDER BY e.display_order`,[row.supportCaseId])
   return{mode:'DEMO',...row,messages,events,evidence,historyPage:page,messageTotal:mc.total,eventTotal:ec.total,pageSize:20}
  })
 }
 async evidenceOwner(actor:string,id:string,fileId:string,admin:boolean){assertDemoEnabled();uuid(id);uuid(fileId)
  return this.database.connection().transaction(async m=>{await transactionAccess(m,actor,admin?'support.read':'contribution.read.own');const[row]=await m.query(`SELECT f.uploaded_by FROM public.dispute d JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id JOIN public.support_case s ON s.id=d.support_case_id JOIN brotar_extension.support_case_evidence e ON e.case_id=s.id JOIN public.file_asset f ON f.id=e.file_id WHERE d.id=$1 AND f.id=$2 AND ($3::boolean OR d.raised_by=$4) AND f.uploaded_by=s.user_id AND f.scope='PRIVATE' AND f.storage_key LIKE 'SUPPORT_EVIDENCE/%' AND f.deleted_at IS NULL`,[id,fileId,admin,actor]);if(!row)throw new NotFoundException('Evidencia no disponible.');return row.uploaded_by as string})
 }
 async request(actor:string,input:DisputeRequest){assertDemoEnabled();uuid(input.paymentId);uuid(input.supportCaseId);requestKey(input.requestKey);const description=caseText(input.description,20,5000)
  if(input.demoConsent!==true)throw new LedgerInvalid('Confirma el ensayo DEMO.')
  const key=digest(`dispute-request:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([input.paymentId.toLowerCase(),input.supportCaseId.toLowerCase(),description]))
  const id=await this.database.connection().transaction(async m=>{
   await lockDemo(m);await transactionAccess(m,actor,'contribution.write.own')
   const[old]=await m.query('SELECT dispute_id,request_hash FROM brotar_extension.demo_dispute WHERE request_key=$1',[key]);if(old){if(old.request_hash!==hash)throw new LedgerConflict('La clave corresponde a otro contenido.');return old.dispute_id as string}
   const provider=await demoProvider(m),[target]=await m.query(`SELECT c.campaign_id FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 AND c.user_id=$2 AND p.provider_id=$3`,[input.paymentId,actor,provider]);if(!target)throw new NotFoundException('Pago DEMO propio no disponible.')
   await m.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE',[target.campaign_id])
   const[p]=await m.query(`SELECT p.status,p.confirmed_at,p.amount::text,trim(p.currency_code) AS currency,p.contribution_id FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 FOR UPDATE OF p,c`,[input.paymentId])
   const[s]=await m.query(`SELECT s.id,s.category,s.status FROM public.support_case s JOIN brotar_extension.support_case_context x ON x.case_id=s.id WHERE s.id=$1 AND s.user_id=$2 AND s.campaign_id=$3 AND x.contribution_id=$4 FOR UPDATE OF s`,[input.supportCaseId,actor,target.campaign_id,p.contribution_id])
   await transactionAccess(m,actor,'contribution.write.own')
   if(!s)throw new NotFoundException('La incidencia debe ser propia y referir al mismo aporte.')
   if(!p.confirmed_at || p.status!=='CONFIRMED' || s.status==='CLOSED')throw new LedgerConflict('El pago o incidencia ya no admite abrir una disputa.')
   const[obligations]=await m.query(`SELECT COALESCE(sum(amount) FILTER(WHERE status='REFUNDED'),0)::numeric(14,2)::text AS returned,count(*) FILTER(WHERE status IN ('REQUESTED','PROCESSING'))::int AS active FROM public.refund WHERE payment_id=$1`,[input.paymentId])
   if(obligations.active || (await m.query('SELECT dispute_id FROM brotar_extension.demo_dispute WHERE support_case_id=$1 OR payment_id=$2 AND financial_hold',[input.supportCaseId,input.paymentId])).length)throw new LedgerConflict('Ya hay una disputa o devolución reservada para esta operación.')
   const hold=decimal(money(p.amount)-money(obligations.returned,true));money(hold);await refundCapacity(m,target.campaign_id,p.currency,hold)
   const disputeId=randomUUID();await setAuditActor(m,actor)
   await m.query(`INSERT INTO public.dispute(id,contribution_id,payment_id,campaign_id,support_case_id,raised_by,reason_code,description) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[disputeId,p.contribution_id,input.paymentId,target.campaign_id,input.supportCaseId,actor,s.category??'OTHER',description])
   await m.query(`INSERT INTO brotar_extension.demo_dispute(dispute_id,support_case_id,payment_id,request_key,request_hash,hold_amount) VALUES($1,$2,$3,$4,$5,$6)`,[disputeId,input.supportCaseId,input.paymentId,key,hash,hold])
   await m.query(`UPDATE public.support_case SET status='OPEN',priority=CASE WHEN category='UNRECOGNIZED_PAYMENT' THEN 1 ELSE priority END,assigned_to=NULL,resolved_at=NULL,closed_at=NULL,updated_at=clock_timestamp() WHERE id=$1`,[input.supportCaseId])
   await this.event(m,disputeId,actor,'OPEN',null,'OPEN',key,hash,'Apertura de disputa DEMO con reserva del saldo pendiente.')
   await syncRefundState(m,input.paymentId,actor);await recordAudit(m,actor,'CREATE','dispute',disputeId);return disputeId
  });return this.detail(actor,id)
 }
 private event(m:EntityManager,id:string,actor:string,action:string,previous:string|null,status:string,key:string,hash:string,why:string){return m.query(`INSERT INTO brotar_extension.demo_dispute_event(dispute_id,actor_id,action,previous_status,status,request_key,request_hash,reason) VALUES($1,$2,$3,$4::dispute_status,$5::dispute_status,$6,$7,$8)`,[id,actor,action,previous,status,key,hash,why])}
 private async locked(m:EntityManager,actor:string,id:string,admin:boolean){
  await lockDemo(m);await transactionAccess(m,actor,admin?'support.resolve':'contribution.write.own')
  const[target]=await m.query(`SELECT d.campaign_id FROM public.dispute d JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id WHERE d.id=$1 AND ($2::boolean OR d.raised_by=$3)`,[id,admin,actor]);if(!target)throw new NotFoundException('Disputa no disponible.')
  await m.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE',[target.campaign_id])
  const[row]=await m.query(`SELECT d.*,x.version,x.financial_hold,x.hold_amount::text,x.resolution_code,x.recommended_amount::text,x.linked_refund_id,p.amount::text AS payment_amount,trim(p.currency_code) AS currency,ca.creator_user_id,ca.organization_id,r.status AS refund_status FROM public.dispute d JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id JOIN public.payment p ON p.id=d.payment_id JOIN public.contribution c ON c.id=d.contribution_id JOIN public.campaign ca ON ca.id=d.campaign_id LEFT JOIN public.refund r ON r.id=x.linked_refund_id WHERE d.id=$1 FOR UPDATE OF d,x,p,c`,[id])
  await m.query('SELECT id FROM public.support_case WHERE id=$1 FOR UPDATE',[row.support_case_id]);await transactionAccess(m,actor,admin?'support.resolve':'contribution.write.own')
  if(admin && (row.raised_by===actor || row.creator_user_id===actor || row.organization_id && (await m.query('SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())',[row.organization_id,actor])).length))throw new ForbiddenException('No puedes resolver un caso propio o vinculado.')
  return row
 }
 async act(actor:string,id:string,input:DisputeAction){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const why=caseText(input.reason,20,500)
  if(input.demoConsent!==true || !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1 || input.priority!==undefined && (!Number.isInteger(input.priority)||input.priority<1||input.priority>5))throw new LedgerInvalid('Versión, prioridad o confirmación inválida.')
  if(input.priority!==undefined && input.action!=='CLAIM' || input.recommendedAmount!==undefined && input.action!=='RECOMMEND_REFUND')throw new LedgerInvalid('Dato ajeno a esta acción.')
  const amount=input.action==='RECOMMEND_REFUND'?decimal(money(input.recommendedAmount)):null,key=digest(`dispute-action:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,input.action,why,input.expectedVersion,input.priority??null,amount]))
  await this.database.connection().transaction(async m=>{
   const d=await this.locked(m,actor,id,true),[old]=await m.query('SELECT dispute_id,request_hash FROM brotar_extension.demo_dispute_event WHERE request_key=$1',[key]);if(old){if(old.dispute_id!==id || old.request_hash!==hash)throw new LedgerConflict('Clave usada con otra acción.');return}
   if(d.version!==input.expectedVersion)throw new LedgerConflict('La disputa cambió; actualiza antes de decidir.')
   const next=disputeTransition(d.status,input.action)
   if(input.action!=='CLAIM' && d.assigned_to!==actor)throw new ForbiddenException('Primero asume el caso con tu cuenta de Soporte.')
   if(input.action==='CLAIM' && d.status==='UNDER_REVIEW' && d.assigned_to===actor)throw new LedgerConflict('El caso ya está asignado a tu cuenta.')
   if(input.action==='CLOSE' && (d.financial_hold || d.resolution_code==='REFUND_RECOMMENDED' && d.refund_status!=='REFUNDED'))throw new LedgerConflict('No cerrar mientras siga pendiente la obligación financiera.')
   if(input.action==='REOPEN' && d.linked_refund_id)throw new LedgerConflict('La devolución vinculada debe resolverse antes de reabrir.')
   const[total]=await m.query(`SELECT COALESCE(sum(amount) FILTER(WHERE status='REFUNDED'),0)::numeric(14,2)::text AS returned,count(*) FILTER(WHERE status IN ('REQUESTED','PROCESSING'))::int AS active FROM public.refund WHERE payment_id=$1`,[d.payment_id])
   const remaining=decimal(money(d.payment_amount)-money(total.returned,true))
   if(input.action==='RECOMMEND_REFUND' && (money(amount!)>money(remaining,true) || total.active))throw new LedgerConflict('La recomendación supera el saldo libre de este pago.')
   if(input.action==='REOPEN'){money(remaining);if(total.active)throw new LedgerConflict('Existe devolución en curso.');await refundCapacity(m,d.campaign_id,d.currency,remaining,null,id)}
   await setAuditActor(m,actor)
   await m.query(`UPDATE public.dispute SET status=$2::dispute_status,assigned_to=CASE WHEN $3='ESCALATE' THEN NULL WHEN $3 IN ('CLAIM','REOPEN') THEN $4 ELSE assigned_to END,resolution=CASE WHEN $3 IN ('RESOLVE_NO_REFUND','RECOMMEND_REFUND') THEN $5 WHEN $3='REOPEN' THEN NULL ELSE resolution END,resolved_at=CASE WHEN $2='RESOLVED' THEN clock_timestamp() WHEN $3='REOPEN' THEN NULL ELSE resolved_at END,closed_at=CASE WHEN $2='CLOSED' THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp() WHERE id=$1`,[id,next,input.action,actor,why])
   if(['RESOLVE_NO_REFUND','RECOMMEND_REFUND','REOPEN'].includes(input.action))await m.query(`UPDATE brotar_extension.demo_dispute SET financial_hold=$2,hold_amount=COALESCE($3::numeric,hold_amount),resolution_code=$4,recommended_amount=$5 WHERE dispute_id=$1`,[id,input.action!=='RESOLVE_NO_REFUND',input.action==='REOPEN'?remaining:amount,input.action==='REOPEN'?null:input.action==='RECOMMEND_REFUND'?'REFUND_RECOMMENDED':'NO_REFUND',amount])
   await m.query('UPDATE brotar_extension.demo_dispute SET version=version+1 WHERE dispute_id=$1',[id])
   await this.supportStatus(m,d.support_case_id,next,input.action==='ESCALATE'?null:actor,input.priority)
   if(input.action==='REQUEST_INFO')await m.query('INSERT INTO public.support_case_message(support_case_id,author_user_id,body,is_internal) VALUES($1,$2,$3,false)',[d.support_case_id,actor,why])
   await this.event(m,id,actor,input.action,d.status,next,key,hash,why);await syncRefundState(m,d.payment_id,actor);await recordAudit(m,actor,'STATUS_CHANGE','dispute',id)
  });return this.detail(actor,id,true)
 }
 private supportStatus(m:EntityManager,id:string,status:string,assigned:string|null,priority?:number){const state=status==='UNDER_REVIEW'?'IN_PROGRESS':status==='ESCALATED'?'IN_PROGRESS':status;return m.query(`UPDATE public.support_case SET status=$2::support_case_status,assigned_to=$3,priority=COALESCE($4::smallint,priority),resolved_at=CASE WHEN $2='RESOLVED' THEN clock_timestamp() WHEN $2 IN ('OPEN','IN_PROGRESS','AWAITING_RESPONSE') THEN NULL ELSE resolved_at END,closed_at=CASE WHEN $2='CLOSED' THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp() WHERE id=$1`,[id,state,assigned,priority??null])}
 async message(actor:string,id:string,admin:boolean,input:DisputeMessage){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const body=caseText(input.body,20,2000)
  if(input.demoConsent!==true || !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1 || !admin && input.isInternal!==undefined)throw new LedgerInvalid('Mensaje o confirmación inválido.')
  const internal=admin && input.isInternal===true,key=digest(`dispute-message:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,body,internal,input.expectedVersion]))
  await this.database.connection().transaction(async m=>{
   const d=await this.locked(m,actor,id,admin),[old]=await m.query('SELECT dispute_id,request_hash FROM brotar_extension.demo_dispute_message WHERE request_key=$1',[key]);if(old){if(old.dispute_id!==id || old.request_hash!==hash)throw new LedgerConflict('Clave de mensaje ya utilizada.');return}
   if(d.version!==input.expectedVersion || d.status==='CLOSED')throw new LedgerConflict('El caso cambió o está cerrado.')
   if(admin && d.assigned_to!==actor)throw new ForbiddenException('Asume el caso antes de responder.')
   await setAuditActor(m,actor);const[mid]=await m.query('INSERT INTO public.support_case_message(support_case_id,author_user_id,body,is_internal) VALUES($1,$2,$3,$4) RETURNING id',[d.support_case_id,actor,body,internal])
   await m.query('INSERT INTO brotar_extension.demo_dispute_message(message_id,dispute_id,request_key,request_hash) VALUES($1,$2,$3,$4)',[mid.id,id,key,hash])
   if(!admin && d.status==='AWAITING_RESPONSE'){await m.query(`UPDATE public.dispute SET status='UNDER_REVIEW',updated_at=clock_timestamp() WHERE id=$1`,[id]);await this.supportStatus(m,d.support_case_id,'UNDER_REVIEW',d.assigned_to);await this.event(m,id,actor,'RESPONSE_RECEIVED',d.status,'UNDER_REVIEW',key,hash,'Respuesta del titular recibida; Soporte debe continuar la investigación.')}
   await m.query('UPDATE brotar_extension.demo_dispute SET version=version+1 WHERE dispute_id=$1',[id]);await recordAudit(m,actor,'CREATE','dispute',id)
  });return this.detail(actor,id,admin)
 }
}
