import {actualDate,closureText,type FinalExpense} from '../../campaign-lifecycle/domain/closure'
import {LedgerInvalid,money,totalMoney,totalDecimal,uuid} from '../../contributions/domain/payment'
export const accountabilityActions=['SAVE_DRAFT','SUBMIT_REPORT','APPROVE_REPORT','REQUEST_CHANGES','REQUEST_RETURN','AUTHORIZE_RETURN','COMPLETE_RETURN','REJECT_RETURN'] as const
export interface Draft {documentId:string;periodLabel:string;periodStart:string;periodEnd:string;narrative:string;varianceExplanation:string;expenses:FinalExpense[]}
export interface AccountabilityData extends Partial<Draft> {documentId?:string;settlementId?:string;amount?:string;fileId?:string}
function record(value:unknown,keys:string[]){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(value,k)))throw new LedgerInvalid('Los campos no corresponden a esta operación de rendición.');return value as Record<string,unknown>}
function id(v:unknown){if(typeof v!=='string')throw new LedgerInvalid('Identificador inválido.');uuid(v);return v}
export function settlementAvailable(disbursed:string,spent:string,completed:string,pending:string){return totalDecimal(totalMoney(disbursed)-totalMoney(spent)-totalMoney(completed)-totalMoney(pending))}
export function accountabilityData(action:string,value:unknown,today:string):AccountabilityData {
 if(action==='SAVE_DRAFT'){
  const v=record(value,['documentId','periodLabel','periodStart','periodEnd','narrative','varianceExplanation','expenses']),start=actualDate(v.periodStart,today),end=actualDate(v.periodEnd,today)
  if(end<start||!Array.isArray(v.expenses)||v.expenses.length>100)throw new LedgerInvalid('Revisa el período y el máximo de 100 gastos.')
  const files=new Set<string>()
  const expenses=v.expenses.map(raw=>{const e=record(raw,['budgetItemId','expenseCategoryId','description','amount','spentOn','fileIds']),on=actualDate(e.spentOn,today)
   if(on<start||on>end)throw new LedgerInvalid('Cada gasto debe tener fecha dentro del período.')
   money(e.amount)
   if(!Array.isArray(e.fileIds)||e.fileIds.length>3||e.fileIds.some(f=>{id(f);return files.has(f)})||new Set(e.fileIds).size!==e.fileIds.length)throw new LedgerInvalid('Usa hasta tres evidencias privadas distintas por gasto.')
   e.fileIds.forEach(f=>files.add(f))
   return {budgetItemId:e.budgetItemId===null?null:id(e.budgetItemId),expenseCategoryId:id(e.expenseCategoryId),description:closureText(e.description,10,300),amount:e.amount as string,spentOn:on,fileIds:e.fileIds as string[]}
  })
  return {documentId:id(v.documentId),periodLabel:closureText(v.periodLabel,3,80),periodStart:start,periodEnd:end,narrative:closureText(v.narrative,20,5000),varianceExplanation:closureText(v.varianceExplanation,20,2000),expenses}
 }
 if(['SUBMIT_REPORT','APPROVE_REPORT','REQUEST_CHANGES'].includes(action)){const v=record(value,['documentId']);return{documentId:id(v.documentId)}}
 if(action==='REQUEST_RETURN'){const v=record(value,['settlementId','amount','fileId']);money(v.amount);return{settlementId:id(v.settlementId),amount:v.amount as string,fileId:id(v.fileId)}}
 if(action==='COMPLETE_RETURN'){const v=record(value,['settlementId','fileId']);return{settlementId:id(v.settlementId),fileId:id(v.fileId)}}
 if(['AUTHORIZE_RETURN','REJECT_RETURN'].includes(action)){const v=record(value,['settlementId']);return{settlementId:id(v.settlementId)}}
 throw new LedgerInvalid('Acción de rendición no disponible.')
}
