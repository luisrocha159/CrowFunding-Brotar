import {Injectable,NotFoundException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {randomUUID} from 'node:crypto'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {setAuditActor,recordAudit} from '../../shared/infrastructure/database/audit'
import {assertDemoEnabled,lockDemo} from '../../demo-payments/infrastructure/demo-payments'
import {digest,reason,requestKey} from '../../demo-payments/domain/demo'
import {LedgerConflict,LedgerInvalid,money,totalMoney,uuid} from '../../contributions/domain/payment'
import {closureData,type FinalSubmission} from '../domain/closure'
import {campaignFunds,ownerAccess,independentActor,identityReady,unsettled,type CampaignSubject} from './eligibility'
import {closureSnapshot,executionPending,rewardOwed} from './closure-integrity'
import {closureRequiredSpend,assertCumulativeFinal,periodicSummary} from '../../accountability/infrastructure/accountability-integrity'
import {fulfillCampaignReward} from '../../campaign-progress/infrastructure/reward-tracking'
interface Subject extends CampaignSubject {title:string;today:string;execution_on:string|null}
export interface ClosureOperation {action:string;expectedVersion:number;requestKey:string;reason:string;demoConsent:true;data:Record<string,unknown>}
@Injectable()
export class CampaignClosure {
 constructor(private readonly database:DatabaseService){}
 private async subject(m:EntityManager,id:string,lock=false):Promise<Subject>{const [c]=await m.query(`SELECT c.id,c.title,c.status,c.creator_user_id,c.organization_id,trim(c.currency_code) AS currency_code,(clock_timestamp() AT TIME ZONE 'America/La_Paz')::date::text AS today,(x.execution_started_at AT TIME ZONE 'America/La_Paz')::date::text AS execution_on FROM public.campaign c LEFT JOIN brotar_extension.campaign_cycle x ON x.campaign_id=c.id WHERE c.id=$1 AND c.deleted_at IS NULL ${lock?'FOR UPDATE OF c':''}`,[id]);if(!c)throw new NotFoundException('Campaña no disponible.');return c}
 async list(actor:string,page:number){assertDemoEnabled();return this.database.connection().transaction('REPEATABLE READ',async m=>{await transactionAccess(m,actor,'campaign.closure.read');const [n]=await m.query(`SELECT count(*)::int AS total FROM public.campaign WHERE deleted_at IS NULL AND status IN ('IN_EXECUTION','CANCELLED','CLOSED')`);const items=await m.query(`SELECT id,title,status FROM public.campaign WHERE deleted_at IS NULL AND status IN ('IN_EXECUTION','CANCELLED','CLOSED') ORDER BY updated_at DESC,id LIMIT 20 OFFSET $1`,[(page-1)*20]);return{mode:'DEMO',items,total:n.total,page,pageSize:20}})}
 async detail(actor:string,id:string,admin:boolean,page=1){assertDemoEnabled();uuid(id);return this.database.connection().transaction('REPEATABLE READ',async m=>{const c=await this.subject(m,id);if(admin)await transactionAccess(m,actor,'campaign.closure.read');else await ownerAccess(m,actor,c);const result=await this.view(m,c,page)
  if(admin){const [access]=await m.query(`SELECT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code IN ('ADMIN','REVIEWER','AUDITOR') AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())) AS inspect,EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id JOIN public.role_permission rp ON rp.role_id=r.id JOIN public.permission p ON p.id=rp.permission_id WHERE ur.user_id=$1 AND p.code='campaign.lifecycle.read' AND r.code IN ('ADMIN','REVIEWER','FINANCE','AUDITOR') AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())) AS financial`,[actor]);if(!access.inspect)return{...result,report:null,budget:[],categories:[],rewards:result.rewards.map((r:{fileId:string|null})=>({...r,fileId:null})),...(!access.financial?{periodicExpenses:[],periodicSummary:undefined,settlement:undefined}:{})}}
  return result})}
 private async view(m:EntityManager,c:Subject,page:number){
  const [x]=await m.query('SELECT version,cancel_requested_by FROM brotar_extension.campaign_cycle WHERE campaign_id=$1',[c.id])
  const categories=await m.query('SELECT id,name FROM public.expense_category WHERE is_active ORDER BY name,id')
  const budget=await m.query(`SELECT id,description,planned_amount::text AS "plannedAmount",expense_category_id AS "expenseCategoryId" FROM public.budget_item WHERE campaign_id=$1 ORDER BY display_order,id`,[c.id])
  const [counts]=await m.query(`SELECT (SELECT count(*)::int FROM public.contribution c WHERE c.campaign_id=$1 AND ${rewardOwed}) AS rewards,(SELECT count(*)::int FROM public.support_case WHERE campaign_id=$1 AND status NOT IN ('CLOSED','RESOLVED')) AS cases`,[c.id])
  const rewards=await m.query(`SELECT c.id,c.reference_code AS reference,r.title,COALESCE(rf.status::text,'PENDING') AS status,rf.fulfilled_at AS "fulfilledAt",e.file_id AS "fileId" FROM public.contribution c JOIN public.reward r ON r.id=c.reward_id LEFT JOIN public.reward_fulfillment rf ON rf.contribution_id=c.id LEFT JOIN brotar_extension.campaign_reward_evidence e ON e.contribution_id=c.id WHERE c.campaign_id=$1 AND ${rewardOwed} ORDER BY c.id LIMIT 20 OFFSET $2`,[c.id,(page-1)*20])
  const cases=await m.query(`SELECT s.id,s.case_number AS reference,s.subject,s.status,EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id) AS financial FROM public.support_case s WHERE s.campaign_id=$1 AND s.status NOT IN ('CLOSED','RESOLVED') ORDER BY s.created_at,s.id LIMIT 20 OFFSET $2`,[c.id,(page-1)*20])
  const [report]=await m.query(`SELECT r.id,r.status,r.period_start::text AS "periodStart",r.period_end::text AS "periodEnd",r.narrative,r.variance_explanation AS "varianceExplanation",r.funds_received::text AS "fundsReceived",r.funds_spent::text AS "fundsSpent",r.submitted_by AS "submittedBy",r.reviewed_by AS "reviewedBy",r.reviewed_at AS "reviewedAt",x.progress_hash AS hash,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'sourceExpenseId',CASE WHEN e.notes LIKE 'PERIODIC_SOURCE:%' THEN substring(e.notes from 17) ELSE NULL END,'description',e.description,'amount',e.spent_amount::text,'spentOn',e.spent_on,'budgetItemId',e.budget_item_id,'expenseCategoryId',e.expense_category_id,'fileIds',(SELECT jsonb_agg(a.file_id ORDER BY a.file_id) FROM public.file_attachment a WHERE a.accountability_expense_id=e.id)) ORDER BY e.id) FROM (SELECT * FROM public.accountability_expense WHERE report_id=r.id ORDER BY id LIMIT 20 OFFSET $2) e),'[]') AS expenses,(SELECT count(*)::int FROM public.accountability_expense WHERE report_id=r.id) AS "totalExpenses"
   FROM public.accountability_report r JOIN brotar_extension.campaign_final_report x ON x.report_id=r.id AND x.campaign_id=r.campaign_id WHERE r.campaign_id=$1 ORDER BY r.created_at DESC,r.id DESC LIMIT 1`,[c.id,(page-1)*20])
  const funds=await campaignFunds(m,c.id,c.currency_code)
  const periodicExpenses=await m.query(`SELECT e.budget_item_id AS "budgetItemId",e.expense_category_id AS "expenseCategoryId",e.description,e.spent_amount::text AS amount,e.spent_on::text AS "spentOn",COALESCE((SELECT jsonb_agg(a.file_id ORDER BY a.file_id) FROM public.file_attachment a WHERE a.accountability_expense_id=e.id),'[]') AS "fileIds" FROM public.accountability_expense e JOIN public.accountability_report r ON r.id=e.report_id JOIN brotar_extension.accountability_document d ON d.current_report_id=r.id WHERE r.campaign_id=$1 AND r.status IN ('APPROVED','PUBLISHED') ORDER BY e.spent_on,e.id LIMIT 20`,[c.id])
  return{mode:'DEMO',id:c.id,title:c.title,status:c.status,currencyCode:c.currency_code,today:c.today,executionOn:c.execution_on,version:x?.version??1,cancelRequested:Boolean(x?.cancel_requested_by),funds,periodicExpenses,periodicSummary:await periodicSummary(m,c.id),settlement:await closureRequiredSpend(m,c.id,funds.disbursed),pending:await executionPending(m,c.id),categories,budget,rewards,cases,totalRewards:counts.rewards,totalCases:counts.cases,page,pageSize:20,report:report?{...report,snapshotCurrent:report.hash===await closureSnapshot(m,c.id)}:null}
 }
 private async permission(m:EntityManager,actor:string,c:Subject,action:string,admin:boolean){
  if(!admin){if(!['SUBMIT_FINAL','FULFILL_REWARD'].includes(action))throw new LedgerInvalid('El creador presenta evidencias; revisión y soporte deciden por separado.');await ownerAccess(m,actor,c)}
  else{if(['SUBMIT_FINAL','FULFILL_REWARD'].includes(action))throw new LedgerInvalid('Usa la vista del propietario para registrar su ejecución.');await transactionAccess(m,actor,action==='RESOLVE_CLOSURE_CASE'?'support.resolve':'campaign.closure.review');await independentActor(m,actor,c)}
 }
 async act(actor:string,id:string,input:ClosureOperation,admin:boolean){assertDemoEnabled();uuid(id);requestKey(input.requestKey);const why=reason(input.reason);if(input.demoConsent!==true||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new LedgerInvalid('Confirma la acción y versión actuales.')
  await this.database.connection().transaction(async m=>{await lockDemo(m);const c=await this.subject(m,id,true);const data=closureData(input.action,input.data,c.today);await this.permission(m,actor,c,input.action,admin)
   const key=digest(`closure:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,input.action,input.expectedVersion,why,data]))
   const [old]=await m.query('SELECT campaign_id,request_hash FROM brotar_extension.campaign_cycle_event WHERE request_key=$1',[key]);if(old){if(old.campaign_id!==id||old.request_hash!==hash)throw new LedgerConflict('La clave corresponde a otra operación.');return}
   if(!['IN_EXECUTION','CANCELLED','FUNDING_ENDED'].includes(c.status))throw new LedgerConflict('Este estado no permite gestionar el cierre.')
   const [x]=await m.query('SELECT version FROM brotar_extension.campaign_cycle WHERE campaign_id=$1 FOR UPDATE',[id]);if(!x||x.version!==input.expectedVersion)throw new LedgerConflict('El ciclo cambió. Actualiza antes de continuar.')
   await setAuditActor(m,actor)
   if(input.action==='SUBMIT_FINAL')await this.submit(m,actor,c,data as FinalSubmission)
   else if('reportId'in data)await this.review(m,actor,c,data.reportId,input.action==='APPROVE_FINAL')
   else if('contributionId'in data)await this.fulfill(m,actor,c,data.contributionId,data.fulfilledOn,data.fileId,why)
   else if('caseId'in data)await this.resolve(m,actor,c,data.caseId,why)
   await this.permission(m,actor,c,input.action,admin)
   await m.query('UPDATE brotar_extension.campaign_cycle SET version=version+1 WHERE campaign_id=$1',[id])
   await m.query(`INSERT INTO brotar_extension.campaign_cycle_event(campaign_id,actor_id,action,previous_status,status,request_key,request_hash,reason) VALUES($1,$2,$3,$4::campaign_status,$4::campaign_status,$5,$6,$7)`,[id,actor,input.action,c.status,key,hash,why]);await recordAudit(m,actor,'UPDATE','campaign',id)
  });return this.detail(actor,id,admin)
 }
 private async evidence(m:EntityManager,actor:string,ids:string[],campaign:string){if(!ids.length)return;const files=await m.query(`SELECT f.id FROM public.file_asset f WHERE f.id=ANY($1::uuid[]) AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL AND (f.uploaded_by=$2 OR EXISTS(SELECT 1 FROM public.file_attachment a JOIN public.accountability_expense e ON e.id=a.accountability_expense_id JOIN public.accountability_report r ON r.id=e.report_id WHERE a.file_id=f.id AND r.campaign_id=$3 AND r.status IN ('APPROVED','PUBLISHED') AND NOT r.is_final AND (NOT EXISTS(SELECT 1 FROM brotar_extension.accountability_revision v WHERE v.report_id=r.id) OR EXISTS(SELECT 1 FROM brotar_extension.accountability_document d WHERE d.current_report_id=r.id)))) ORDER BY f.id FOR SHARE OF f`,[[...new Set(ids)],actor,campaign]);if(files.length!==new Set(ids).size)throw new LedgerInvalid('Una evidencia privada no está disponible o no pertenece a esta cuenta.')}
 private async submit(m:EntityManager,actor:string,c:Subject,data:FinalSubmission){
  if(c.status!=='IN_EXECUTION'||!c.execution_on||data.periodStart<c.execution_on)throw new LedgerConflict('La rendición final corresponde al período real de ejecución.')
  await identityReady(m,c);const pending=await executionPending(m,c.id);if(pending.progress||pending.rewards)throw new LedgerConflict('Completa actividades, hitos y recompensas antes de rendir el cierre.')
  data=await assertCumulativeFinal(m,c.id,data)
  const funds=await campaignFunds(m,c.id,c.currency_code),sum=data.expenses.reduce((v,e)=>v+money(e.amount),0n)
  const settlement=await closureRequiredSpend(m,c.id,funds.disbursed);if(totalMoney(settlement.pending))throw new LedgerConflict('Completa o rechaza las devoluciones pendientes antes de rendir el cierre.')
  if(sum!==totalMoney(settlement.requiredSpent))throw new LedgerConflict('Los gastos acumulativos y devoluciones completadas deben justificar exactamente los desembolsos; no se inventa saldo cero.')
  money(funds.disbursed,true)
  const [latest]=await m.query(`SELECT r.status FROM public.accountability_report r JOIN brotar_extension.campaign_final_report x ON x.report_id=r.id WHERE r.campaign_id=$1 ORDER BY r.created_at DESC,r.id DESC LIMIT 1`,[c.id]);if(latest?.status==='SUBMITTED'||latest?.status==='IN_REVIEW')throw new LedgerConflict('Ya hay una rendición pendiente. Espera su revisión.')
  await this.evidence(m,actor,data.expenses.flatMap(e=>e.fileIds),c.id)
  for(const e of data.expenses){if(e.sourceExpenseId)continue;if(!(await m.query('SELECT id FROM public.expense_category WHERE id=$1 AND is_active',[e.expenseCategoryId])).length)throw new LedgerInvalid('Categoría de gasto no disponible.');if(e.budgetItemId&&!(await m.query('SELECT id FROM public.budget_item WHERE id=$1 AND campaign_id=$2 AND expense_category_id=$3',[e.budgetItemId,c.id,e.expenseCategoryId])).length)throw new LedgerInvalid('La partida o su categoría no corresponde a esta campaña.')}
  const report=randomUUID();await m.query(`INSERT INTO public.accountability_report(id,campaign_id,period_label,period_start,period_end,is_final,status,funds_received,funds_spent,currency_code,variance_explanation,narrative,submitted_by,submitted_at,created_at,updated_at) VALUES($1,$2,'Cierre final DEMO',$3,$4,true,'SUBMITTED',$5,$6,$7,$8,$9,$10,clock_timestamp(),clock_timestamp(),clock_timestamp())`,[report,c.id,data.periodStart,data.periodEnd,funds.disbursed,settlement.requiredSpent,c.currency_code,data.varianceExplanation,data.narrative,actor])
  for(const e of data.expenses){const expense=randomUUID();await m.query(`INSERT INTO public.accountability_expense(id,report_id,campaign_id,budget_item_id,expense_category_id,description,spent_amount,currency_code,spent_on,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[expense,report,c.id,e.budgetItemId,e.expenseCategoryId,e.description,e.amount,c.currency_code,e.spentOn,e.sourceExpenseId?`PERIODIC_SOURCE:${e.sourceExpenseId}`:null]);for(const [i,file]of e.fileIds.entries())await m.query(`INSERT INTO public.file_attachment(file_id,accountability_expense_id,attachment_role,display_order) VALUES($1,$2,'EXPENSE_EVIDENCE',$3)`,[file,expense,i])}
  await m.query('INSERT INTO brotar_extension.campaign_final_report(report_id,campaign_id,progress_hash) VALUES($1,$2,$3)',[report,c.id,await closureSnapshot(m,c.id)])
  await recordAudit(m,actor,'CREATE','accountability_report',report)
 }
 private async review(m:EntityManager,actor:string,c:Subject,id:string,approve:boolean){
  const [r]=await m.query(`SELECT r.*,x.progress_hash FROM public.accountability_report r JOIN brotar_extension.campaign_final_report x ON x.report_id=r.id AND x.campaign_id=r.campaign_id WHERE r.campaign_id=$1 ORDER BY r.created_at DESC,r.id DESC LIMIT 1 FOR UPDATE OF r`,[c.id])
  if(!r||r.id!==id||!['SUBMITTED','IN_REVIEW'].includes(r.status))throw new LedgerConflict('El informe no es la versión final pendiente actual.')
  if(r.submitted_by===actor)throw new LedgerConflict('Otra persona independiente debe revisar la rendición.')
  if(approve){await identityReady(m,c);const funds=await campaignFunds(m,c.id,c.currency_code),open=await unsettled(m,c.id)
   if(c.status!=='IN_EXECUTION'||Object.values(open).some(n=>n>0)||totalMoney(funds.committed)!==totalMoney(funds.disbursed)||totalMoney(funds.refunds_reserved)||totalMoney(funds.disputed)||totalMoney(funds.confirmed)-totalMoney(funds.refunded)!==totalMoney(funds.disbursed))throw new LedgerConflict('Resuelve las obligaciones y fondos pendientes antes de aprobar el cierre.')
   const settlement=await closureRequiredSpend(m,c.id,funds.disbursed);if(totalMoney(settlement.pending)||totalMoney(r.funds_spent)!==totalMoney(settlement.requiredSpent))throw new LedgerConflict('Los gastos acumulativos y devoluciones completadas no concilian el cierre.')
   if(r.progress_hash!==await closureSnapshot(m,c.id)||totalMoney(r.funds_received)!==totalMoney(funds.disbursed))throw new LedgerConflict('Cambió la ejecución o el desembolso. Solicita correcciones y una nueva rendición.')
   const [missing]=await m.query(`SELECT count(*)::int AS n FROM public.accountability_expense e WHERE e.report_id=$1 AND NOT EXISTS(SELECT 1 FROM public.file_attachment a JOIN public.file_asset f ON f.id=a.file_id WHERE a.accountability_expense_id=e.id AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL)`,[id]);if(missing.n)throw new LedgerConflict('Hay gastos sin evidencia privada disponible.')
  }
  await m.query(`UPDATE public.accountability_report SET status=$2::accountability_status,reviewed_by=$3,reviewed_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1`,[id,approve?'APPROVED':'CHANGES_REQUESTED',actor])
  await recordAudit(m,actor,approve?'APPROVE':'STATUS_CHANGE','accountability_report',id)
 }
 private async fulfill(m:EntityManager,actor:string,c:Subject,id:string,on:string,file:string,notes:string){
  await fulfillCampaignReward(m,actor,c.id,id,on,file,notes)
 }
 private async resolve(m:EntityManager,actor:string,c:Subject,id:string,notes:string){
  const [s]=await m.query('SELECT user_id,status FROM public.support_case WHERE id=$1 AND campaign_id=$2 FOR UPDATE',[id,c.id]);if(!s)throw new NotFoundException('Incidencia no disponible en esta campaña.')
  if(s.user_id===actor)throw new LedgerConflict('Otra persona debe resolver una incidencia propia.')
  if(['RESOLVED','CLOSED'].includes(s.status))throw new LedgerConflict('La incidencia ya está resuelta.')
  if((await m.query('SELECT id FROM public.dispute WHERE support_case_id=$1',[id])).length)throw new LedgerConflict('La disputa financiera se atiende desde Disputas; este atajo no libera reservas ni devuelve fondos.')
  await m.query(`INSERT INTO public.support_case_message(support_case_id,author_user_id,body,is_internal) VALUES($1,$2,$3,false)`,[id,actor,notes]);await m.query(`UPDATE public.support_case SET status='RESOLVED',assigned_to=$2,resolved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1`,[id,actor])
  await recordAudit(m,actor,'STATUS_CHANGE','support_case',id)
 }
 async documentOwner(actor:string,id:string,fileId:string,admin:boolean){assertDemoEnabled();uuid(id);uuid(fileId);return this.database.connection().transaction('REPEATABLE READ',async m=>{const c=await this.subject(m,id);if(admin)await transactionAccess(m,actor,'campaign.review.read');else await ownerAccess(m,actor,c)
  const [f]=await m.query(`SELECT f.uploaded_by FROM public.file_asset f WHERE f.id=$1 AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL AND (EXISTS(SELECT 1 FROM public.file_attachment a JOIN public.accountability_expense e ON e.id=a.accountability_expense_id JOIN brotar_extension.campaign_final_report x ON x.report_id=e.report_id WHERE a.file_id=f.id AND x.campaign_id=$2) OR EXISTS(SELECT 1 FROM brotar_extension.campaign_reward_evidence x JOIN public.contribution co ON co.id=x.contribution_id WHERE x.file_id=f.id AND co.campaign_id=$2))`,[fileId,id]);if(!f)throw new NotFoundException('Evidencia no disponible en este cierre.');return f.uploaded_by as string})}
}
