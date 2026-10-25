import {Injectable,ForbiddenException,NotFoundException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {randomUUID} from 'node:crypto'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {decimal,LedgerConflict,LedgerInvalid,money,uuid} from '../../contributions/domain/payment'
import {assertDemoEnabled,demoProvider,lockDemo} from '../../demo-payments/infrastructure/demo-payments'
import {digest,reason,requestKey} from '../../demo-payments/domain/demo'
import {availableRefund,refundReasons,refundTransition} from '../domain/refund'
import {syncObligationState} from '../../contributions/infrastructure/payment-obligations'
export interface RefundRequest {paymentId:string;amount:string;reasonCode:string;reason:string;requestKey:string;demoConsent:true;disputeId?:string}
export interface RefundAction {action:string;reason:string;requestKey:string;expectedVersion:number;demoConsent:true}
const refundProjection=`r.id,r.payment_id AS "paymentId",r.contribution_id AS "contributionId",c.campaign_id AS "campaignId",ca.title AS "campaignTitle",c.reference_code AS "contributionReference",
 r.amount::text,trim(r.currency_code) AS "currencyCode",r.status,r.reason_code AS "reasonCode",r.reason_detail AS reason,r.requested_by AS "requestedBy",r.approved_by AS "approvedBy",r.external_reference AS "externalReference",
 r.requested_at AS "createdAt",r.processed_at AS "processedAt",r.completed_at AS "completedAt",r.failure_message AS "failureMessage",x.version,x.dispute_id AS "disputeId"`
const refundJoin=`FROM public.refund r JOIN brotar_extension.demo_refund x ON x.refund_id=r.id JOIN public.contribution c ON c.id=r.contribution_id JOIN public.campaign ca ON ca.id=c.campaign_id`

/** Se bloquea primero la campaña en todas las operaciones financieras de este flujo. */
export async function refundCapacity(m:EntityManager,campaignId:string,currency:string,amount:string,excludeRefund:string|null=null,excludeDispute:string|null=null,excludeDisbursement:string|null=null){
 const [capacity]=await m.query(`SELECT (
   COALESCE((SELECT sum(p.amount) FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.payment_provider pp ON pp.id=p.provider_id WHERE c.campaign_id=$1 AND p.currency_code=$2 AND p.confirmed_at IS NOT NULL AND pp.code='BROTAR_INTERNAL_DEMO' AND pp.is_sandbox),0)
   -COALESCE((SELECT sum(r.amount) FROM public.refund r JOIN public.contribution c ON c.id=r.contribution_id WHERE c.campaign_id=$1 AND r.currency_code=$2 AND r.status IN ('REQUESTED','PROCESSING','REFUNDED') AND ($4::uuid IS NULL OR r.id<>$4)),0)
   -COALESCE((SELECT sum(d.gross_amount) FROM public.disbursement d WHERE d.campaign_id=$1 AND d.currency_code=$2 AND d.status IN ('PENDING','APPROVED','PROCESSING','COMPLETED') AND ($6::uuid IS NULL OR d.id<>$6)),0)
   -COALESCE((SELECT sum(x.hold_amount) FROM brotar_extension.demo_dispute x JOIN public.dispute d ON d.id=x.dispute_id JOIN public.payment p ON p.id=d.payment_id WHERE d.campaign_id=$1 AND p.currency_code=$2 AND x.financial_hold AND ($5::uuid IS NULL OR d.id<>$5)),0)
   -COALESCE((SELECT sum(p.amount-COALESCE((SELECT sum(r.amount) FROM public.refund r WHERE r.payment_id=p.id AND r.status='REFUNDED'),0)) FROM public.payment p WHERE p.currency_code=$2 AND p.id IN(SELECT DISTINCT d.payment_id FROM public.dispute d WHERE d.campaign_id=$1 AND d.status NOT IN ('RESOLVED','CLOSED') AND NOT EXISTS(SELECT 1 FROM brotar_extension.demo_dispute x WHERE x.dispute_id=d.id))),0)
  ) >= $3::numeric AS enough`,[campaignId,currency,amount,excludeRefund,excludeDispute,excludeDisbursement])
 if(!capacity?.enough)throw new LedgerConflict('No hay fondos libres de desembolsos, devoluciones o disputas para reservar este importe.')
}
export const syncRefundState=syncObligationState
@Injectable()
export class DemoRefunds {
 constructor(private readonly database:DatabaseService){}
 async list(actor:string,administrative:boolean,page=1,status?:string){assertDemoEnabled();if(!Number.isSafeInteger(page)||page<1||page>10000 || status && !['REQUESTED','PROCESSING','REFUNDED','FAILED'].includes(status))throw new LedgerInvalid('Filtro de devoluciones inválido.')
  return this.database.connection().transaction('REPEATABLE READ',async m=>{
   await transactionAccess(m,actor,administrative?'finance.read':'contribution.read.own')
   const where=`WHERE ($1::boolean OR c.user_id=$2) AND ($3::text IS NULL OR r.status::text=$3)`,args=[administrative,actor,status??null]
   const [count]=await m.query(`SELECT count(*)::int AS total ${refundJoin} ${where}`,args)
   const items=await m.query(`SELECT ${refundProjection} ${refundJoin} ${where} ORDER BY r.requested_at DESC,r.id DESC LIMIT 20 OFFSET $4`,[...args,(page-1)*20])
   return{mode:'DEMO',items,total:count.total,page,pageSize:20}
  })
 }
 async detail(actor:string,id:string,administrative=false){assertDemoEnabled();uuid(id)
  return this.database.connection().transaction(async m=>{
   await transactionAccess(m,actor,administrative?'finance.read':'contribution.read.own')
   const [row]=await m.query(`SELECT ${refundProjection} ${refundJoin} WHERE r.id=$1 AND ($2::boolean OR c.user_id=$3)`,[id,administrative,actor])
   if(!row)throw new NotFoundException('Devolución no disponible.')
   const events=await m.query(`SELECT id,actor_id AS "actorId",action,previous_status AS "previousStatus",status,reason,recorded_at AS at FROM brotar_extension.demo_refund_event WHERE refund_id=$1 ORDER BY recorded_at,id`,[id])
   return{mode:'DEMO',...row,events}
  })
 }
 async request(actor:string,input:RefundRequest){assertDemoEnabled();uuid(input.paymentId);if(input.disputeId)uuid(input.disputeId);requestKey(input.requestKey);const amount=decimal(money(input.amount)),why=reason(input.reason)
  if(input.demoConsent!==true || !refundReasons.includes(input.reasonCode as typeof refundReasons[number]))throw new LedgerInvalid('Confirma el ensayo e indica un motivo admitido.')
  if(Boolean(input.disputeId)!==(input.reasonCode==='DISPUTE_RESOLUTION'))throw new LedgerInvalid('Una resolución requiere la referencia de su disputa.')
  const key=digest(`refund-request:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([input.paymentId.toLowerCase(),amount,input.reasonCode,why,input.disputeId??null]))
  const id=await this.database.connection().transaction(async m=>{
   await lockDemo(m);await transactionAccess(m,actor,'contribution.write.own')
   const [old]=await m.query('SELECT refund_id,request_hash FROM brotar_extension.demo_refund WHERE request_key=$1',[key])
   if(old){if(old.request_hash!==hash)throw new LedgerConflict('La solicitud ya identifica otra devolución.');return old.refund_id as string}
   const provider=await demoProvider(m)
   const [target]=await m.query(`SELECT c.campaign_id FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 AND c.user_id=$2 AND p.provider_id=$3`,[input.paymentId,actor,provider])
   if(!target)throw new NotFoundException('Pago no disponible para devolución DEMO.')
   await m.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE',[target.campaign_id])
   const [p]=await m.query(`SELECT p.id,p.amount::text,trim(p.currency_code) AS currency,p.status,p.confirmed_at,c.id AS contribution_id,ca.status AS campaign_status,ca.funding_model,f.amount_raised::text,ca.goal_amount::text
      FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.campaign ca ON ca.id=c.campaign_id JOIN public.v_campaign_funding f ON f.campaign_id=ca.id WHERE p.id=$1 FOR UPDATE OF p,c`,[input.paymentId])
   await transactionAccess(m,actor,'contribution.write.own')
   let linked:{id:string;recommended_amount:string}|undefined
   if(input.disputeId){[linked]=await m.query(`SELECT d.id,x.recommended_amount::text FROM public.dispute d JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id WHERE d.id=$1 AND d.payment_id=$2 AND d.raised_by=$3 AND d.status='RESOLVED' AND x.resolution_code='REFUND_RECOMMENDED' AND x.financial_hold AND x.linked_refund_id IS NULL FOR UPDATE OF d,x`,[input.disputeId,input.paymentId,actor]);if(!linked || money(linked.recommended_amount)!==money(amount))throw new LedgerConflict('La devolución debe coincidir con la recomendación vigente de tu disputa.')}
   if(!p.confirmed_at || p.status!=='CONFIRMED' && !(linked && p.status==='DISPUTED'))throw new LedgerConflict('Solo un pago DEMO confirmado o su resolución autorizable admite esta solicitud.')
   if(input.reasonCode==='PROJECT_CANCELLED' && p.campaign_status!=='CANCELLED' || input.reasonCode==='GOAL_NOT_REACHED' && !(p.funding_model==='ALL_OR_NOTHING' && ['FUNDING_ENDED','CANCELLED'].includes(p.campaign_status) && money(p.amount_raised,true)<money(p.goal_amount)))throw new LedgerInvalid('La causa elegida no corresponde al estado de la campaña.')
   const [totals]=await m.query(`SELECT COALESCE(sum(amount) FILTER(WHERE status='REFUNDED'),0)::numeric(14,2)::text AS returned,COALESCE(sum(amount) FILTER(WHERE status IN ('REQUESTED','PROCESSING')),0)::numeric(14,2)::text AS reserved FROM public.refund WHERE payment_id=$1`,[input.paymentId])
   if(money(totals.reserved,true)>0n)throw new LedgerConflict('Ya existe una solicitud activa para este pago. Consulta su estado antes de repetir.')
   if(money(amount)>money(availableRefund(p.amount,totals.returned,totals.reserved),true))throw new LedgerConflict('El importe supera el saldo del pago no devuelto ni reservado.')
   await refundCapacity(m,target.campaign_id,p.currency,amount,null,linked?.id??null)
   const refundId=randomUUID();await setAuditActor(m,actor)
   await m.query(`INSERT INTO public.refund(id,payment_id,contribution_id,amount,currency_code,reason_code,reason_detail,requested_by,provider_payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'{"mode":"DEMO"}')`,[refundId,input.paymentId,p.contribution_id,amount,p.currency,input.reasonCode,why,actor])
   await m.query('INSERT INTO brotar_extension.demo_refund(refund_id,request_key,request_hash,dispute_id) VALUES($1,$2,$3,$4)',[refundId,key,hash,linked?.id??null])
   if(linked)await m.query('UPDATE brotar_extension.demo_dispute SET financial_hold=false,linked_refund_id=$2,version=version+1 WHERE dispute_id=$1',[linked.id,refundId])
   await this.event(m,refundId,actor,'REQUEST',null,'REQUESTED',key,hash,why);await recordAudit(m,actor,'CREATE','refund',refundId);return refundId
  })
  return this.detail(actor,id)
 }
 private event(m:EntityManager,id:string,actor:string,action:string,previous:string|null,status:string,key:string,hash:string,why:string){return m.query(`INSERT INTO brotar_extension.demo_refund_event(refund_id,actor_id,action,previous_status,status,request_key,request_hash,reason) VALUES($1,$2,$3,$4::refund_status,$5::refund_status,$6,$7,$8)`,[id,actor,action,previous,status,key,hash,why])}
 async act(actor:string,id:string,input:RefundAction){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const why=reason(input.reason)
  if(input.demoConsent!==true || !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new LedgerInvalid('Confirma la operación y su versión.')
  const key=digest(`refund-action:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,input.action,why,input.expectedVersion]))
  await this.database.connection().transaction(async m=>{
   await lockDemo(m);await transactionAccess(m,actor,'finance.operate')
   const [prior]=await m.query('SELECT refund_id,request_hash FROM brotar_extension.demo_refund_event WHERE request_key=$1',[key]);if(prior){if(prior.refund_id!==id || prior.request_hash!==hash)throw new LedgerConflict('La clave ya corresponde a otra acción.');return}
   const [target]=await m.query(`SELECT c.campaign_id FROM public.refund r JOIN brotar_extension.demo_refund x ON x.refund_id=r.id JOIN public.contribution c ON c.id=r.contribution_id WHERE r.id=$1`,[id]);if(!target)throw new NotFoundException('Devolución no disponible.')
   await m.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE',[target.campaign_id])
   const [r]=await m.query(`SELECT r.*,r.amount::text AS amount_text,x.version,x.dispute_id,p.provider_id,p.status AS payment_status,c.user_id,ca.creator_user_id,ca.organization_id FROM public.refund r JOIN brotar_extension.demo_refund x ON x.refund_id=r.id JOIN public.payment p ON p.id=r.payment_id JOIN public.contribution c ON c.id=r.contribution_id JOIN public.campaign ca ON ca.id=c.campaign_id WHERE r.id=$1 FOR UPDATE OF r,x,p,c`,[id])
   await transactionAccess(m,actor,'finance.operate')
   if(r.version!==input.expectedVersion)throw new LedgerConflict('La devolución cambió; actualiza antes de operar.')
   if(r.user_id===actor || r.requested_by===actor || r.creator_user_id===actor || (r.organization_id && (await m.query('SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())',[r.organization_id,actor])).length))throw new ForbiddenException('No puedes operar una devolución propia o vinculada a tu campaña.')
   if(r.provider_id!==await demoProvider(m))throw new LedgerConflict('Proveedor distinto del simulador interno.')
   const next=refundTransition(r.status,input.action)
   if(['PROCESSING','REFUNDED'].includes(next)){
    if(!['CONFIRMED','DISPUTED'].includes(r.payment_status))throw new LedgerConflict('El pago ya no admite esta devolución.')
    await refundCapacity(m,target.campaign_id,r.currency_code.trim(),r.amount_text,id)
   }
   await setAuditActor(m,actor)
   await m.query(`UPDATE public.refund SET status=$2::refund_status,approved_by=CASE WHEN $2='PROCESSING' THEN $3 ELSE approved_by END,
    processed_at=CASE WHEN $2='PROCESSING' THEN clock_timestamp() ELSE processed_at END,completed_at=CASE WHEN $2='REFUNDED' THEN clock_timestamp() ELSE completed_at END,
    external_reference=CASE WHEN $2='REFUNDED' THEN $4 ELSE external_reference END,failure_message=CASE WHEN $2='FAILED' THEN $5 ELSE NULL END WHERE id=$1`,[id,next,actor,`DEMO-REFUND:${id}`,why])
   await m.query('UPDATE brotar_extension.demo_refund SET version=version+1 WHERE refund_id=$1',[id])
   await this.event(m,id,actor,input.action,r.status,next,key,hash,why)
   if(r.dispute_id && ['FAILED','REFUNDED'].includes(next))await m.query(`UPDATE brotar_extension.demo_dispute SET financial_hold=$2,linked_refund_id=CASE WHEN $2 THEN NULL ELSE linked_refund_id END,version=version+1 WHERE dispute_id=$1 AND linked_refund_id=$3`,[r.dispute_id,next==='FAILED',id])
   if(next==='REFUNDED' || r.dispute_id)await syncRefundState(m,r.payment_id,actor)
   await recordAudit(m,actor,'STATUS_CHANGE','refund',id)
  })
  return this.detail(actor,id,true)
 }
}
