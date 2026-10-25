import {Injectable,NotFoundException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {randomUUID} from 'node:crypto'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {ContributionLedger} from '../../contributions/infrastructure/contribution-ledger'
import {LedgerConflict,LedgerInvalid,totalMoney,totalDecimal,uuid} from '../../contributions/domain/payment'
import {assertDemoEnabled,lockDemo} from '../../demo-payments/infrastructure/demo-payments'
import {digest,reason,requestKey} from '../../demo-payments/domain/demo'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {cycleTarget,fundingOutcome} from '../domain/cycle'
import {campaignFunds,identityReady,independentActor,ownerAccess,unsettled,type CampaignSubject} from './eligibility'
import {closureSnapshot,executionPending} from './closure-integrity'

interface Campaign extends CampaignSubject {title:string;goal_amount:string;funding_model:string;ends_at:Date|null;ended:boolean}
export interface CycleAction {action:string;expectedVersion:number;requestKey:string;reason:string;demoConsent:true}
@Injectable()
export class CampaignCycle {
 constructor(private readonly database:DatabaseService,private readonly ledger:ContributionLedger){}
 private async campaign(m:EntityManager,id:string,lock=false):Promise<Campaign>{
  const [c]=await m.query(`SELECT id,title,status,creator_user_id,organization_id,trim(currency_code) AS currency_code,goal_amount::text,funding_model,ends_at,ends_at<=clock_timestamp() AS ended FROM public.campaign WHERE id=$1 AND deleted_at IS NULL ${lock?'FOR UPDATE':''}`,[id])
  if(!c)throw new NotFoundException('Campaña no disponible.');return c as Campaign
 }
 async list(actor:string,admin:boolean,page=1){assertDemoEnabled();if(!Number.isSafeInteger(page)||page<1||page>10000)throw new LedgerInvalid('Página inválida.')
  return this.database.connection().transaction('REPEATABLE READ',async m=>{
   await transactionAccess(m,actor,admin?'campaign.lifecycle.read':'campaign.manage.own')
   const where=`c.deleted_at IS NULL AND c.status IN ('APPROVED','PUBLISHED','FUNDING_ENDED','IN_EXECUTION','CANCELLED','CLOSED') AND ($1::boolean OR (c.organization_id IS NULL AND c.creator_user_id=$2) OR EXISTS(SELECT 1 FROM public.organization_member mem WHERE mem.organization_id=c.organization_id AND mem.user_id=$2 AND mem.organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN') AND mem.joined_at<=clock_timestamp() AND (mem.left_at IS NULL OR mem.left_at>clock_timestamp())))`
   const [count]=await m.query(`SELECT count(*)::int AS total FROM public.campaign c WHERE ${where}`,[admin,actor])
   const items=await m.query(`SELECT c.id,c.title,c.status,c.ends_at AS "endsAt",COALESCE(x.outcome,'PENDING') AS outcome,x.cancel_requested_by IS NOT NULL AS "cancelRequested" FROM public.campaign c LEFT JOIN brotar_extension.campaign_cycle x ON x.campaign_id=c.id WHERE ${where} ORDER BY c.updated_at DESC,c.id LIMIT 20 OFFSET $3`,[admin,actor,(page-1)*20])
   return{mode:'DEMO',items,total:count.total,page,pageSize:20}
  })
 }
 async detail(actor:string,id:string,admin=false,page=1){assertDemoEnabled();uuid(id);if(!Number.isSafeInteger(page)||page<1||page>10000)throw new LedgerInvalid('Página inválida.')
  return this.database.connection().transaction('REPEATABLE READ',async m=>{
   const c=await this.campaign(m,id);if(admin)await transactionAccess(m,actor,'campaign.lifecycle.read');else await ownerAccess(m,actor,c)
   const [x]=await m.query('SELECT * FROM brotar_extension.campaign_cycle WHERE campaign_id=$1',[id])
   const funds=c.currency_code?await campaignFunds(m,id,c.currency_code):null,obligations=await unsettled(m,id)
   const [count]=await m.query('SELECT count(*)::int AS total FROM brotar_extension.campaign_cycle_event WHERE campaign_id=$1',[id])
   const events=await m.query(`SELECT id,actor_id AS "actorId",action,previous_status AS "previousStatus",status,reason,recorded_at AS at FROM brotar_extension.campaign_cycle_event WHERE campaign_id=$1 ORDER BY recorded_at DESC,id DESC LIMIT 20 OFFSET $2`,[id,(page-1)*20])
   const blockers=await this.closeBlockers(m,c,x?.outcome??'PENDING',funds,obligations)
   return{mode:'DEMO',id,title:c.title,status:c.status,currencyCode:c.currency_code,goalAmount:c.goal_amount,endsAt:c.ends_at,version:x?.version??1,outcome:x?.outcome??'PENDING',fundingTotal:x?.funding_total??null,cancelRequested:Boolean(x?.cancel_requested_by),cancelReason:x?.cancel_reason??null,cancellationCaseId:x?.cancellation_case_id??null,executionStartedAt:x?.execution_started_at??null,funds,obligations,closeBlockers:blockers,events,eventTotal:count.total,page,pageSize:20}
  })
 }
 private async closeBlockers(m:EntityManager,c:Campaign,outcome:string,funds:Awaited<ReturnType<typeof campaignFunds>>|null,open:Awaited<ReturnType<typeof unsettled>>){
  const blockers:string[]=[]
  if(Object.values(open).some(n=>n>0))blockers.push('Resolver pagos, disputas, incidencias y conciliaciones pendientes.')
  if(!funds)return['Campaña sin moneda y financiación definidas.']
  if(totalMoney(funds.refunds_reserved)>0n || totalMoney(funds.disputed)>0n || totalMoney(funds.committed)!==totalMoney(funds.disbursed))blockers.push('Resolver reservas, devoluciones o desembolsos pendientes.')
  const net=totalMoney(funds.confirmed)-totalMoney(funds.refunded)
  if(c.status==='CANCELLED'||outcome==='REFUND_REQUIRED'||outcome==='NO_FUNDS'){
   if(net!==0n || totalMoney(funds.disbursed)!==0n)blockers.push('Completar las devoluciones de todos los fondos; no cerrar con dinero pendiente.')
  }else{
   if(c.status!=='IN_EXECUTION')blockers.push('Iniciar la ejecución antes del cierre satisfactorio.')
   if(net!==totalMoney(funds.disbursed))blockers.push('Resolver fondos recaudados todavía no desembolsados o devueltos.')
   const pending=await executionPending(m,c.id)
   if(pending.progress)blockers.push('Completar actividades e hitos con sus resultados reales.')
   if(pending.rewards)blockers.push('Completar las recompensas de los aportes confirmados.')
   const [report]=await m.query(`SELECT r.id FROM public.accountability_report r JOIN brotar_extension.campaign_final_report x ON x.report_id=r.id AND x.campaign_id=r.campaign_id WHERE r.campaign_id=$1 AND x.progress_hash=$6 AND r.id=(SELECT r2.id FROM public.accountability_report r2 JOIN brotar_extension.campaign_final_report x2 ON x2.report_id=r2.id WHERE r2.campaign_id=$1 ORDER BY r2.created_at DESC,r2.id DESC LIMIT 1) AND r.is_final AND r.status IN ('APPROVED','PUBLISHED') AND r.reviewed_by IS NOT NULL AND r.reviewed_by<>$2 AND r.reviewed_by IS DISTINCT FROM r.submitted_by AND r.reviewed_at IS NOT NULL AND r.currency_code=$3 AND r.funds_received=$4::numeric AND r.funds_spent=r.funds_received
    AND r.funds_spent=COALESCE((SELECT sum(e.spent_amount) FROM public.accountability_expense e WHERE e.report_id=r.id),0)
    AND r.period_start IS NOT NULL AND r.period_end<=((clock_timestamp() AT TIME ZONE 'America/La_Paz')::date)
    AND NOT EXISTS(SELECT 1 FROM public.organization_member mem WHERE mem.organization_id=$5 AND mem.user_id=r.reviewed_by AND mem.joined_at<=r.reviewed_at AND (mem.left_at IS NULL OR mem.left_at>r.reviewed_at))
    AND NOT EXISTS(SELECT 1 FROM public.accountability_expense e WHERE e.report_id=r.id AND (e.currency_code<>$3 OR e.spent_on IS NULL OR e.spent_on<r.period_start OR e.spent_on>r.period_end OR NOT EXISTS(SELECT 1 FROM public.file_attachment a JOIN public.file_asset f ON f.id=a.file_id WHERE a.accountability_expense_id=e.id AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL)))
    AND NOT EXISTS(SELECT 1 FROM public.disbursement d WHERE d.campaign_id=$1 AND d.status='COMPLETED' AND d.completed_at>r.reviewed_at)`,[c.id,c.creator_user_id,c.currency_code,funds.disbursed,c.organization_id,await closureSnapshot(m,c.id)])
   if(!report)blockers.push('Presentar y aprobar una rendición final vigente, con gastos respaldados, revisión independiente y saldo cero desde Preparar cierre.')
  }
  return blockers
 }
 async act(actor:string,id:string,input:CycleAction,admin:boolean){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const why=reason(input.reason)
  if(input.demoConsent!==true || !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new LedgerInvalid('Confirma el ensayo y su versión.')
  const key=digest(`cycle:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,input.action,input.expectedVersion,why]))
  await this.database.connection().transaction(async m=>{
   await lockDemo(m);const c=await this.campaign(m,id,true)
   if(admin){await transactionAccess(m,actor,'campaign.lifecycle.manage');await independentActor(m,actor,c)}else{await ownerAccess(m,actor,c);if(input.action!=='REQUEST_CANCEL')throw new LedgerInvalid('El creador solicita cancelación; administración decide el ciclo.')}
   const [old]=await m.query('SELECT campaign_id,request_hash FROM brotar_extension.campaign_cycle_event WHERE request_key=$1',[key]);if(old){if(old.campaign_id!==id||old.request_hash!==hash)throw new LedgerConflict('La clave pertenece a otra acción.');return}
   await m.query('INSERT INTO brotar_extension.campaign_cycle(campaign_id) VALUES($1) ON CONFLICT DO NOTHING',[id])
   const [x]=await m.query('SELECT * FROM brotar_extension.campaign_cycle WHERE campaign_id=$1 FOR UPDATE',[id])
   if(x.version!==input.expectedVersion)throw new LedgerConflict('La campaña cambió; actualiza antes de decidir.')
   let next=cycleTarget(c.status,input.action,Boolean(x.cancel_requested_by),x.outcome),outcome=x.outcome as string,total:string|null=x.funding_total,eventAction=input.action
   if(input.action==='END_FUNDING'){
    if(!c.ended)throw new LedgerConflict('Todavía no venció el período; alcanzar la meta no cierra anticipadamente.')
    const due=await m.query(`SELECT c.id FROM public.contribution c WHERE c.campaign_id=$1 AND c.status='PENDING' AND c.expires_at<=clock_timestamp() AND NOT EXISTS(SELECT 1 FROM public.payment p JOIN public.payment_provider pp ON pp.id=p.provider_id WHERE p.contribution_id=c.id AND pp.code<>'BROTAR_INTERNAL_DEMO') ORDER BY c.id LIMIT 501`,[id])
    if(due.length>500)throw new LedgerConflict('Hay más de 500 reservas; ejecuta primero el mantenimiento DEMO por lotes.')
    for(const row of due)await this.ledger.expireLocked(m,row.id)
    const open=await unsettled(m,id);if(open.payments||open.events||open.reconciliation)throw new LedgerConflict('Resolver intentos pendientes o conciliaciones antes de fijar el resultado.')
    const funds=await campaignFunds(m,id,c.currency_code);total=totalDecimal(totalMoney(funds.confirmed)-totalMoney(funds.refunded));outcome=fundingOutcome(c.funding_model,total,c.goal_amount)
   }
   if(input.action==='START_EXECUTION'){
    await identityReady(m,c);const open=await unsettled(m,id);if(Object.values(open).some(n=>n>0))throw new LedgerConflict('Resuelve las obligaciones abiertas antes de comenzar ejecución.')
    const funds=await campaignFunds(m,id,c.currency_code)
    if(fundingOutcome(c.funding_model,totalDecimal(totalMoney(funds.confirmed)-totalMoney(funds.refunded)),c.goal_amount)!=='EXECUTION_ELIGIBLE')throw new LedgerConflict('Los fondos actuales ya no habilitan la ejecución.')
   }
   if(input.action==='APPROVE_CANCEL'){
    const funds=await campaignFunds(m,id,c.currency_code),open=await unsettled(m,id)
    if(open.payments)throw new LedgerConflict('Hay intentos pendientes: resolverlos antes de cancelar.')
    if(totalMoney(funds.committed)>totalMoney(funds.disbursed))throw new LedgerConflict('Rechaza o resuelve primero los desembolsos pendientes.')
    if(totalMoney(funds.disbursed)>0n){
     next=c.status;eventAction='ESCALATE_CANCEL'
     if(!x.cancellation_case_id){const caseId=randomUUID();await m.query(`INSERT INTO public.support_case(id,campaign_id,user_id,category,subject,description,priority) VALUES($1,$2,$3,'PROJECT_NOT_EXECUTED','DEMO Cancelación con fondos desembolsados',$4,1)`,[caseId,id,x.cancel_requested_by,why]);await m.query('UPDATE brotar_extension.campaign_cycle SET cancellation_case_id=$2 WHERE campaign_id=$1',[id,caseId])}
    }else outcome=totalMoney(funds.confirmed)>totalMoney(funds.refunded)?'REFUND_REQUIRED':'NO_FUNDS'
   }
   if(input.action==='CLOSE'){
    const blockers=await this.closeBlockers(m,c,outcome,await campaignFunds(m,id,c.currency_code),await unsettled(m,id));if(blockers.length)throw new LedgerConflict(blockers.join(' '))
   }
   // Recheck after all business locks: an expiring role must not authorize a queued operation.
   if(admin)await transactionAccess(m,actor,'campaign.lifecycle.manage');else await ownerAccess(m,actor,c)
   await setAuditActor(m,actor)
   await m.query(`UPDATE public.campaign SET status=$2::campaign_status,funding_ended_at=CASE WHEN $3='END_FUNDING' THEN clock_timestamp() ELSE funding_ended_at END,closed_at=CASE WHEN $2='CLOSED' THEN clock_timestamp() ELSE closed_at END,cancelled_at=CASE WHEN $2='CANCELLED' THEN clock_timestamp() ELSE cancelled_at END,cancellation_reason=CASE WHEN $2='CANCELLED' THEN $4 ELSE cancellation_reason END,updated_at=clock_timestamp() WHERE id=$1`,[id,next,input.action,why])
   await m.query(`UPDATE brotar_extension.campaign_cycle SET version=version+1,outcome=$2,funding_total=$3,cancel_requested_by=CASE WHEN $4='REQUEST_CANCEL' THEN $5::uuid WHEN $4 IN ('REJECT_CANCEL','APPROVE_CANCEL') AND $6<>'ESCALATE_CANCEL' THEN NULL ELSE cancel_requested_by END,cancel_reason=CASE WHEN $4='REQUEST_CANCEL' THEN $7 WHEN $4 IN ('REJECT_CANCEL','APPROVE_CANCEL') AND $6<>'ESCALATE_CANCEL' THEN NULL ELSE cancel_reason END,execution_started_at=CASE WHEN $4='START_EXECUTION' THEN clock_timestamp() ELSE execution_started_at END WHERE campaign_id=$1`,[id,outcome,total,input.action,actor,eventAction,why])
   await m.query(`INSERT INTO brotar_extension.campaign_cycle_event(campaign_id,actor_id,action,previous_status,status,request_key,request_hash,reason) VALUES($1,$2,$3,$4::campaign_status,$5::campaign_status,$6,$7,$8)`,[id,actor,eventAction,c.status,next,key,hash,why])
   await recordAudit(m,actor,'STATUS_CHANGE','campaign',id)
  })
  return this.detail(actor,id,admin)
 }
}
