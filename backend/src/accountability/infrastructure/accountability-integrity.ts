import type {EntityManager} from 'typeorm'
import {LedgerConflict,totalMoney,totalDecimal} from '../../contributions/domain/payment'
import type {FinalSubmission} from '../../campaign-lifecycle/domain/closure'
/** Historical revisions and final cumulative evidence never count as fresh spending. */
export const currentPeriodic=`NOT r.is_final AND (NOT EXISTS(SELECT 1 FROM brotar_extension.accountability_revision v WHERE v.report_id=r.id) OR EXISTS(SELECT 1 FROM brotar_extension.accountability_document d WHERE d.current_report_id=r.id))`
export async function returnTotals(m:EntityManager,id:string){
 const [r]=await m.query(`SELECT COALESCE(sum(amount) FILTER(WHERE status='COMPLETED'),0)::numeric(16,2)::text AS completed,COALESCE(sum(amount) FILTER(WHERE status IN ('REQUESTED','APPROVED')),0)::numeric(16,2)::text AS pending FROM brotar_extension.beneficiary_return WHERE campaign_id=$1`,[id])
 return r as {completed:string;pending:string}
}
export async function periodicSpent(m:EntityManager,id:string,exclude:string|null=null){
 const [r]=await m.query(`SELECT count(*) FILTER(WHERE r.funds_spent IS NULL OR r.funds_received IS NULL OR r.period_start IS NULL OR r.period_end IS NULL)::int AS incomplete,COALESCE(sum(r.funds_spent),0)::numeric(16,2)::text AS spent FROM public.accountability_report r WHERE r.campaign_id=$1 AND ${currentPeriodic} AND NOT EXISTS(SELECT 1 FROM brotar_extension.accountability_document d WHERE d.id=$2 AND d.current_report_id=r.id)`,[id,exclude]);if(r.incomplete)throw new LedgerConflict('Hay una rendición histórica sin importes o período completos; no se considera saldo cero.');return r.spent as string
}
export async function closureRequiredSpend(m:EntityManager,id:string,disbursed:string){
 const returns=await returnTotals(m,id)
 const [invalid]=await m.query(`SELECT count(*)::int AS n FROM brotar_extension.beneficiary_return r JOIN public.campaign c ON c.id=r.campaign_id WHERE r.campaign_id=$1 AND r.status='COMPLETED' AND (r.currency_code<>c.currency_code OR r.authorized_by=c.creator_user_id OR r.completed_by=c.creator_user_id OR r.authorized_by IS NULL OR r.completed_by IS NULL OR r.authorized_by=r.requested_by OR r.completed_by=r.requested_by OR NOT EXISTS(SELECT 1 FROM public.file_asset f WHERE f.id=r.request_file_id AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL) OR NOT EXISTS(SELECT 1 FROM public.file_asset f WHERE f.id=r.completion_file_id AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL) OR EXISTS(SELECT 1 FROM public.organization_member mem WHERE mem.organization_id=c.organization_id AND ((mem.user_id=r.authorized_by AND mem.joined_at<=r.authorized_at AND (mem.left_at IS NULL OR mem.left_at>r.authorized_at)) OR (mem.user_id=r.completed_by AND mem.joined_at<=r.completed_at AND (mem.left_at IS NULL OR mem.left_at>r.completed_at)))))`,[id])
 if(invalid.n)throw new LedgerConflict('Una devolución completada carece de evidencia privada vigente o independencia verificable.')
 return{...returns,requiredSpent:totalDecimal(totalMoney(disbursed)-totalMoney(returns.completed))}
}
/** Constant-size reference over immutable approved source identities; request size does not grow with campaign lifetime. */
export async function periodicSummary(m:EntityManager,id:string){
 const [r]=await m.query(`WITH reports AS (SELECT r.* FROM public.accountability_report r WHERE r.campaign_id=$1 AND ${currentPeriodic}), expenses AS (SELECT e.* FROM public.accountability_expense e JOIN reports r ON r.id=e.report_id AND r.status IN ('APPROVED','PUBLISHED'))
 SELECT (SELECT count(*)::int FROM expenses) AS count,(SELECT COALESCE(sum(spent_amount),0)::numeric(16,2)::text FROM expenses) AS spent,
 md5(jsonb_build_object('reports',(SELECT COALESCE(jsonb_agg(jsonb_build_array(id,status,period_start,period_end,funds_received,funds_spent) ORDER BY id),'[]') FROM reports),
 'expenses',(SELECT COALESCE(jsonb_agg(jsonb_build_array(e.id,e.report_id,e.budget_item_id,e.expense_category_id,e.description,e.spent_amount,e.currency_code,e.spent_on,(SELECT jsonb_agg(a.file_id ORDER BY a.file_id) FROM public.file_attachment a WHERE a.accountability_expense_id=e.id)) ORDER BY e.id),'[]') FROM expenses e))::text) AS revision`,[id])
 return r as {count:number;spent:string;revision:string}
}
export async function assertCumulativeFinal(m:EntityManager,id:string,data:FinalSubmission):Promise<FinalSubmission>{
 await periodicSpent(m,id)
 const rows=await m.query(`SELECT r.id,r.status,r.period_start::text AS start,r.period_end::text AS finish FROM public.accountability_report r WHERE r.campaign_id=$1 AND ${currentPeriodic}`,[id]) as {id:string;status:string;start:string;finish:string}[]
 if(rows.some(r=>!['APPROVED','PUBLISHED'].includes(r.status)))throw new LedgerConflict('Aprueba las rendiciones periódicas pendientes antes de presentar el cierre acumulativo.')
 if(rows.some(r=>r.start<data.periodStart||r.finish>data.periodEnd))throw new LedgerConflict('El cierre acumulativo debe abarcar todos los períodos rendidos.')
 if(data.includeApprovedPeriodic&&data.periodicRevision!==(await periodicSummary(m,id)).revision)throw new LedgerConflict('La referencia de gastos periódicos cambió. Actualiza el cierre antes de presentar.')
 const expenses=await m.query(`SELECT e.id AS "sourceExpenseId",(e.currency_code=r.currency_code) AS "validCurrency",e.budget_item_id AS "budgetItemId",e.expense_category_id AS "expenseCategoryId",e.description,e.spent_amount::text AS amount,e.spent_on::text AS "spentOn",COALESCE((SELECT jsonb_agg(a.file_id ORDER BY a.file_id) FROM public.file_attachment a WHERE a.accountability_expense_id=e.id),'[]') AS "fileIds" FROM public.accountability_expense e JOIN public.accountability_report r ON r.id=e.report_id WHERE r.campaign_id=$1 AND ${currentPeriodic} ORDER BY e.id`,[id]) as (FinalSubmission['expenses'][number]&{validCurrency?:boolean})[]
 if(expenses.some(e=>e.validCurrency===false||!e.spentOn||e.spentOn<data.periodStart||e.spentOn>data.periodEnd||!e.fileIds.length||e.fileIds.length>3))throw new LedgerConflict('Un gasto periódico aprobado carece de fecha, moneda o evidencia coherente; reconcilia sus datos antes de cerrar.')
 if(data.includeApprovedPeriodic){
  const approvedFiles=new Set(expenses.flatMap(e=>e.fileIds))
  if(data.expenses.some(e=>e.fileIds.some(f=>approvedFiles.has(f))))throw new LedgerConflict('Un gasto periódico ya se incluye por referencia; no lo presentes otra vez como adicional.')
  return{...data,expenses:[...expenses,...data.expenses]}
 }
 const signature=(e:FinalSubmission['expenses'][number])=>JSON.stringify([e.budgetItemId,e.expenseCategoryId,e.description,totalMoney(e.amount).toString(),e.spentOn,[...e.fileIds].sort()])
 const available=new Map<string,FinalSubmission['expenses']>();for(const e of data.expenses){const k=signature(e);available.set(k,[...(available.get(k)??[]),e])}
 for(const e of expenses){const matches=available.get(signature(e)),match=matches?.shift();if(!match)throw new LedgerConflict('Conserva cada gasto periódico aprobado y su evidencia en el informe final acumulativo.');match.sourceExpenseId=e.sourceExpenseId}
 return data
}
