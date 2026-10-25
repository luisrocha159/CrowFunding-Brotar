import {Injectable,NotFoundException,ForbiddenException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {randomUUID} from 'node:crypto'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {LedgerConflict,LedgerInvalid,totalMoney,totalDecimal,uuid} from '../../contributions/domain/payment'
import {digest,reason,requestKey} from '../../demo-payments/domain/demo'
import {assertDemoEnabled,lockDemo,demoProvider} from '../../demo-payments/infrastructure/demo-payments'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {campaignFunds,identityReady,independentActor,ownerAccess,unsettled,type CampaignSubject} from '../../campaign-lifecycle/infrastructure/eligibility'
import {refundCapacity} from '../../refunds/infrastructure/demo-refunds'
import {disbursementAmounts,disbursementTarget,schedule,syntheticDestination} from '../domain/disbursement'
import {fundingOutcome} from '../../campaign-lifecycle/domain/cycle'
export interface DestinationInput {reference:string;holder:string;expectedVersion:number;reason:string;requestKey:string;demoConsent:true}
export interface DisbursementInput {amount:string;payoutAccountId:string;destinationVersion:number;scheduledFor:string|null;reason:string;requestKey:string;demoConsent:true}
export interface DisbursementAction {action:string;expectedVersion:number;reason:string;requestKey:string;demoConsent:true}
const projection=`d.id,d.disbursement_number AS number,d.campaign_id AS "campaignId",ca.title AS "campaignTitle",d.status,d.gross_amount::text AS amount,d.net_amount::text AS "netAmount",d.platform_fee::text AS "platformFee",d.provider_fee::text AS "providerFee",d.other_costs::text AS "otherCosts",trim(d.currency_code) AS "currencyCode",x.version,x.requested_by AS "requestedBy",d.authorized_by AS "authorizedBy",x.executed_by AS "executedBy",d.external_reference AS "externalReference",d.scheduled_for::text AS "scheduledFor",d.created_at AS "createdAt",d.authorized_at AS "authorizedAt",d.processed_at AS "processedAt",d.completed_at AS "completedAt",d.failure_message AS "failureMessage",d.notes AS reason,x.destination_reference AS "destinationReference",x.destination_holder AS "destinationHolder"`
const join=`FROM public.disbursement d JOIN brotar_extension.demo_disbursement x ON x.disbursement_id=d.id JOIN public.campaign ca ON ca.id=d.campaign_id`
@Injectable()
export class DemoDisbursements {
 constructor(private readonly database:DatabaseService){}
 private async campaign(m:EntityManager,id:string,lock=false){
  const [c]=await m.query(`SELECT id,title,status,creator_user_id,organization_id,trim(currency_code) AS currency_code,funding_model,goal_amount::text FROM public.campaign WHERE id=$1 AND deleted_at IS NULL ${lock?'FOR UPDATE':''}`,[id]);if(!c)throw new NotFoundException('Campaña no disponible.');return c as CampaignSubject & {title:string;funding_model:string;goal_amount:string}
 }
 private async destination(m:EntityManager,id:string){const [d]=await m.query(`SELECT p.id,p.status,p.account_holder_name AS holder,p.currency_code AS currency,p.user_id,p.organization_id,p.verified_by,p.verified_at,x.reference,x.version,x.submitted_by FROM public.payout_account p JOIN brotar_extension.demo_destination x ON x.payout_account_id=p.id WHERE x.campaign_id=$1 AND p.deleted_at IS NULL FOR SHARE OF p,x`,[id]);return d}
 async destinationDetail(actor:string,id:string,admin=false){assertDemoEnabled();uuid(id);return this.database.connection().transaction(async m=>{
  const c=await this.campaign(m,id);if(admin)await transactionAccess(m,actor,'finance.read');else await ownerAccess(m,actor,c)
  const d=await this.destination(m,id)
  const events=d?await m.query(`SELECT action,actor_id AS "actorId",reason,version,reference,holder,recorded_at AS at FROM brotar_extension.demo_destination_event WHERE payout_account_id=$1 ORDER BY recorded_at DESC,id DESC LIMIT 20`,[d.id]):[]
  return{mode:'DEMO',campaignId:id,campaignTitle:c.title,currencyCode:c.currency_code,destination:d?{id:d.id,status:d.status,holder:d.holder,reference:d.reference,version:d.version,reviewedBy:d.verified_by,reviewedAt:d.verified_at}:null,events}
 })}
 async saveDestination(actor:string,id:string,input:DestinationInput){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const {reference,holder}=syntheticDestination(input.reference,input.holder),why=reason(input.reason)
  if(input.demoConsent!==true||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0)throw new LedgerInvalid('Confirma el destino ficticio y su versión.')
  const key=digest(`destination:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,reference,holder,why,input.expectedVersion]))
  await this.database.connection().transaction(async m=>{
   await lockDemo(m);const c=await this.campaign(m,id,true);await ownerAccess(m,actor,c)
   if(['CLOSED','CANCELLED','REJECTED'].includes(c.status)||!c.currency_code)throw new LedgerConflict('La campaña no admite configurar destino ahora.')
   const [old]=await m.query('SELECT payout_account_id,request_hash FROM brotar_extension.demo_destination_event WHERE request_key=$1',[key]);if(old){if(old.request_hash!==hash)throw new LedgerConflict('Clave de destino utilizada con otros datos.');return}
   const current=await this.destination(m,id);if((current?.version??0)!==input.expectedVersion)throw new LedgerConflict('El destino cambió; actualiza antes de guardar.')
   if((await m.query(`SELECT id FROM public.disbursement WHERE campaign_id=$1 AND status IN ('PENDING','APPROVED','PROCESSING')`,[id])).length)throw new LedgerConflict('Resuelve los desembolsos activos antes de cambiar destino.')
   await ownerAccess(m,actor,c);await setAuditActor(m,actor);const accountId=current?.id??randomUUID()
   if(current){await m.query(`UPDATE public.payout_account SET account_holder_name=$2,status='PENDING',verified_by=NULL,verified_at=NULL WHERE id=$1`,[accountId,holder]);await m.query('UPDATE brotar_extension.demo_destination SET reference=$2,submitted_by=$3,version=version+1,review_reason=NULL WHERE payout_account_id=$1',[accountId,reference,actor])}
   else{await m.query(`INSERT INTO public.payout_account(id,user_id,organization_id,account_holder_name,bank_name,currency_code,country_code) VALUES($1,$2,$3,$4,'SIMULADOR INTERNO · NO BANCO',$5,'BO')`,[accountId,c.organization_id?null:c.creator_user_id,c.organization_id,holder,c.currency_code]);await m.query('INSERT INTO brotar_extension.demo_destination(payout_account_id,campaign_id,reference,submitted_by,request_key,request_hash) VALUES($1,$2,$3,$4,$5,$6)',[accountId,id,reference,actor,key,hash])}
   await m.query(`INSERT INTO brotar_extension.demo_destination_event(payout_account_id,actor_id,action,version,reason,reference,holder,request_key,request_hash) VALUES($1,$2,'SUBMIT',$3,$4,$5,$6,$7,$8)`,[accountId,actor,input.expectedVersion+1,why,reference,holder,key,hash]);await recordAudit(m,actor,'UPDATE','payout_account',accountId)
  });return this.destinationDetail(actor,id)
 }
 async reviewDestination(actor:string,id:string,input:{decision:string}&Omit<DestinationInput,'reference'|'holder'>){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const why=reason(input.reason)
  if(input.demoConsent!==true||!['VERIFIED','REJECTED','DISABLED'].includes(input.decision)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new LedgerInvalid('Decisión de destino inválida.')
  const key=digest(`destination-review:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,input.decision,input.expectedVersion,why]))
  await this.database.connection().transaction(async m=>{
   await lockDemo(m);const c=await this.campaign(m,id,true);await transactionAccess(m,actor,'finance.operate');await independentActor(m,actor,c)
   const [old]=await m.query('SELECT request_hash FROM brotar_extension.demo_destination_event WHERE request_key=$1',[key]);if(old){if(old.request_hash!==hash)throw new LedgerConflict('Clave ya utilizada.');return}
   const d=await this.destination(m,id);if(!d)throw new NotFoundException('Destino no disponible.')
   if(d.version!==input.expectedVersion)throw new LedgerConflict('El destino cambió; actualiza su versión.')
   if(d.submitted_by===actor)throw new ForbiddenException('No puedes revisar el destino que presentaste.')
   if(input.decision==='VERIFIED'){if(d.status!=='PENDING')throw new LedgerConflict('Solo se verifica un destino pendiente.');if(d.currency.trim()!==c.currency_code||(c.organization_id?d.organization_id!==c.organization_id:d.user_id!==c.creator_user_id))throw new LedgerConflict('El destino no corresponde a moneda o beneficiario de la campaña.');await identityReady(m,c);syntheticDestination(d.reference,d.holder)}
   else if(input.decision==='REJECTED' && d.status!=='PENDING' || input.decision==='DISABLED' && d.status!=='VERIFIED')throw new LedgerConflict('La decisión no corresponde al estado del destino.')
   await transactionAccess(m,actor,'finance.operate');await independentActor(m,actor,c);await setAuditActor(m,actor)
   await m.query(`UPDATE public.payout_account SET status=$2::payout_account_status,verified_by=CASE WHEN $2='VERIFIED' THEN $3::uuid ELSE NULL END,verified_at=CASE WHEN $2='VERIFIED' THEN clock_timestamp() ELSE NULL END WHERE id=$1`,[d.id,input.decision,actor]);await m.query('UPDATE brotar_extension.demo_destination SET version=version+1,review_reason=$2 WHERE payout_account_id=$1',[d.id,why])
   await m.query(`INSERT INTO brotar_extension.demo_destination_event(payout_account_id,actor_id,action,version,reason,reference,holder,request_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[d.id,actor,input.decision,d.version+1,why,d.reference,d.holder,key,hash]);await recordAudit(m,actor,'STATUS_CHANGE','payout_account',d.id)
  });return this.destinationDetail(actor,id,true)
 }
 private async eligible(m:EntityManager,c:Awaited<ReturnType<DemoDisbursements['campaign']>>,accountId:string,destinationVersion:number){
  await demoProvider(m)
  const [cycle]=await m.query(`SELECT outcome,cancel_requested_by FROM brotar_extension.campaign_cycle WHERE campaign_id=$1 FOR SHARE`,[c.id])
  if(c.status!=='IN_EXECUTION'||cycle?.outcome!=='EXECUTION_ELIGIBLE'||cycle.cancel_requested_by)throw new LedgerConflict('Solo una campaña en ejecución, elegible y sin cancelación pendiente admite desembolsos.')
  await identityReady(m,c)
  const d=await this.destination(m,c.id)
  if(!d || d.id!==accountId || d.version!==destinationVersion || d.status!=='VERIFIED' || !d.verified_by || !d.verified_at || d.currency.trim()!==c.currency_code || (c.organization_id?d.organization_id!==c.organization_id:d.user_id!==c.creator_user_id))throw new LedgerConflict('Destino ficticio no verificado, modificado o de otro beneficiario/moneda.')
  const open=await unsettled(m,c.id);if(Object.values(open).some(n=>n>0))throw new LedgerConflict('Resuelve pagos, disputas, incidencias y conciliaciones antes de liberar fondos.')
  const funds=await campaignFunds(m,c.id,c.currency_code),net=totalMoney(funds.confirmed)-totalMoney(funds.refunded)
  if(fundingOutcome(c.funding_model,totalDecimal(net),c.goal_amount)!=='EXECUTION_ELIGIBLE')throw new LedgerConflict('La financiación actual ya no habilita desembolsos.')
  return d
 }
 async request(actor:string,campaignId:string,input:DisbursementInput){assertDemoEnabled();uuid(campaignId);uuid(input.payoutAccountId);requestKey(input.requestKey);const amounts=disbursementAmounts(input.amount),why=reason(input.reason),scheduled=schedule(input.scheduledFor)
  if(input.demoConsent!==true||!Number.isSafeInteger(input.destinationVersion)||input.destinationVersion<1)throw new LedgerInvalid('Confirma la operación y el destino.')
  const key=digest(`disbursement:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([campaignId,amounts.gross,input.payoutAccountId,input.destinationVersion,scheduled,why]))
  const id=await this.database.connection().transaction(async m=>{
   await lockDemo(m);const c=await this.campaign(m,campaignId,true);await ownerAccess(m,actor,c)
   const [old]=await m.query('SELECT disbursement_id,request_hash FROM brotar_extension.demo_disbursement WHERE request_key=$1',[key]);if(old){if(old.request_hash!==hash)throw new LedgerConflict('Clave ya vinculada a otra solicitud.');return old.disbursement_id as string}
   const d=await this.eligible(m,c,input.payoutAccountId,input.destinationVersion)
   await refundCapacity(m,c.id,c.currency_code,amounts.gross)
   await ownerAccess(m,actor,c);await setAuditActor(m,actor);const disbursementId=randomUUID()
   await m.query(`INSERT INTO public.disbursement(id,campaign_id,payout_account_id,beneficiary_user_id,beneficiary_org_id,gross_amount,currency_code,scheduled_for,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[disbursementId,c.id,d.id,c.organization_id?null:c.creator_user_id,c.organization_id,amounts.gross,c.currency_code,scheduled,why])
   await m.query('INSERT INTO brotar_extension.demo_disbursement(disbursement_id,requested_by,destination_version,destination_reference,destination_holder,request_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[disbursementId,actor,d.version,d.reference,d.holder,key,hash])
   await this.event(m,disbursementId,actor,'REQUEST',null,'PENDING',key,hash,why);await recordAudit(m,actor,'CREATE','disbursement',disbursementId);return disbursementId
  });return this.detail(actor,id,false)
 }
 private event(m:EntityManager,id:string,actor:string,action:string,previous:string|null,status:string,key:string,hash:string,why:string){return m.query(`INSERT INTO brotar_extension.demo_disbursement_event(disbursement_id,actor_id,action,previous_status,status,request_key,request_hash,reason) VALUES($1,$2,$3,$4::disbursement_status,$5::disbursement_status,$6,$7,$8)`,[id,actor,action,previous,status,key,hash,why])}
 async list(actor:string,admin:boolean,page=1,status?:string,campaignId?:string){assertDemoEnabled();if(campaignId)uuid(campaignId);if(!Number.isSafeInteger(page)||page<1||page>10000||status&&!['PENDING','APPROVED','PROCESSING','COMPLETED','FAILED'].includes(status))throw new LedgerInvalid('Filtro inválido.')
  return this.database.connection().transaction('REPEATABLE READ',async m=>{
   await transactionAccess(m,actor,admin?'finance.read':'campaign.manage.own')
   const where=`WHERE ($1::boolean OR (ca.organization_id IS NULL AND ca.creator_user_id=$2) OR EXISTS(SELECT 1 FROM public.organization_member mem WHERE mem.organization_id=ca.organization_id AND mem.user_id=$2 AND mem.organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN') AND mem.joined_at<=clock_timestamp() AND (mem.left_at IS NULL OR mem.left_at>clock_timestamp()))) AND ($3::text IS NULL OR d.status::text=$3) AND ($4::uuid IS NULL OR d.campaign_id=$4)`,args=[admin,actor,status??null,campaignId??null]
   const [count]=await m.query(`SELECT count(*)::int AS total ${join} ${where}`,args)
   const items=await m.query(`SELECT ${projection} ${join} ${where} ORDER BY d.created_at DESC,d.id DESC LIMIT 20 OFFSET $5`,[...args,(page-1)*20]);return{mode:'DEMO',items,total:count.total,page,pageSize:20}
  })
 }
 async detail(actor:string,id:string,admin=false){assertDemoEnabled();uuid(id);return this.database.connection().transaction('REPEATABLE READ',async m=>{
  const [d]=await m.query(`SELECT ${projection} ${join} WHERE d.id=$1`,[id]);if(!d)throw new NotFoundException('Desembolso no disponible.')
  if(admin)await transactionAccess(m,actor,'finance.read');else await ownerAccess(m,actor,await this.campaign(m,d.campaignId))
  const events=await m.query(`SELECT id,actor_id AS "actorId",action,previous_status AS "previousStatus",status,reason,recorded_at AS at FROM brotar_extension.demo_disbursement_event WHERE disbursement_id=$1 ORDER BY recorded_at,id`,[id]);return{mode:'DEMO',...d,events}
 })}
 async act(actor:string,id:string,input:DisbursementAction){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const why=reason(input.reason)
  if(input.demoConsent!==true||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new LedgerInvalid('Confirma operación y versión.')
  const key=digest(`disbursement-action:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,input.action,input.expectedVersion,why]))
  await this.database.connection().transaction(async m=>{
   await lockDemo(m);await transactionAccess(m,actor,'finance.operate')
   const [target]=await m.query('SELECT campaign_id FROM public.disbursement WHERE id=$1',[id]);if(!target)throw new NotFoundException('Desembolso no disponible.')
   const c=await this.campaign(m,target.campaign_id,true);await transactionAccess(m,actor,'finance.operate');await independentActor(m,actor,c)
   const [old]=await m.query('SELECT request_hash FROM brotar_extension.demo_disbursement_event WHERE request_key=$1',[key]);if(old){if(old.request_hash!==hash)throw new LedgerConflict('Clave utilizada con otros datos.');return}
   const [d]=await m.query(`SELECT d.*,d.gross_amount::text AS amount,x.version,x.requested_by,x.destination_version FROM public.disbursement d JOIN brotar_extension.demo_disbursement x ON x.disbursement_id=d.id WHERE d.id=$1 FOR UPDATE OF d,x`,[id]);if(!d)throw new NotFoundException('Desembolso DEMO no disponible.')
   if(d.requested_by===actor)throw new ForbiddenException('Solicitante y aprobador/ejecutor deben ser distintos.')
   if(d.version!==input.expectedVersion)throw new LedgerConflict('El desembolso cambió; actualiza antes de operar.')
   const next=disbursementTarget(d.status,input.action)
   if(next!=='FAILED'){
    await this.eligible(m,c,d.payout_account_id,d.destination_version);await refundCapacity(m,c.id,c.currency_code,d.amount,null,null,id)
    if(['PROCESSING','COMPLETED'].includes(next)&&d.scheduled_for && String(d.scheduled_for instanceof Date?d.scheduled_for.toISOString().slice(0,10):d.scheduled_for)>new Date(Date.now()-4*3600000).toISOString().slice(0,10))throw new LedgerConflict('Todavía no llegó la fecha programada en Bolivia.')
   }
   await transactionAccess(m,actor,'finance.operate');await independentActor(m,actor,c);await setAuditActor(m,actor)
   await m.query(`UPDATE public.disbursement SET status=$2::disbursement_status,authorized_by=CASE WHEN $2='APPROVED' THEN $3::uuid ELSE authorized_by END,authorized_at=CASE WHEN $2='APPROVED' THEN clock_timestamp() ELSE authorized_at END,processed_at=CASE WHEN $2='PROCESSING' THEN clock_timestamp() ELSE processed_at END,completed_at=CASE WHEN $2='COMPLETED' THEN clock_timestamp() ELSE completed_at END,external_reference=CASE WHEN $2='COMPLETED' THEN $4 ELSE external_reference END,failure_message=CASE WHEN $2='FAILED' THEN $5 ELSE NULL END WHERE id=$1`,[id,next,actor,`DEMO-DISBURSEMENT:${id}`,why])
   await m.query(`UPDATE brotar_extension.demo_disbursement SET version=version+1,executed_by=CASE WHEN $2 IN ('PROCESSING','COMPLETED','FAILED') THEN $3::uuid ELSE executed_by END WHERE disbursement_id=$1`,[id,next,actor]);await this.event(m,id,actor,input.action,d.status,next,key,hash,why);await recordAudit(m,actor,'STATUS_CHANGE','disbursement',id)
  });return this.detail(actor,id,true)
 }
}
