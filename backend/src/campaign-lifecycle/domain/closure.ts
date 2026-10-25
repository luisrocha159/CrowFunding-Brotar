import {LedgerInvalid,money} from '../../contributions/domain/payment'

export const closureActions=['SUBMIT_FINAL','APPROVE_FINAL','REQUEST_CHANGES','FULFILL_REWARD','RESOLVE_CLOSURE_CASE'] as const
export interface FinalExpense {budgetItemId:string|null;expenseCategoryId:string;description:string;amount:string;spentOn:string;fileIds:string[]}
export interface FinalSubmission {periodStart:string;periodEnd:string;narrative:string;varianceExplanation:string;expenses:FinalExpense[]}
const id=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)
export function closureText(v:unknown,min:number,max:number):string {if(typeof v!=='string'||v.trim().length<min||v.length>max||/[\p{Cc}\p{Cf}\p{Cs}<>]/u.test(v))throw new LedgerInvalid(`Escribe entre ${min} y ${max} caracteres, sin HTML ni controles invisibles.`);return v.trim()}
function record(v:unknown,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))throw new LedgerInvalid('Los campos no corresponden a esta acción de cierre.');return v as Record<string,unknown>}
export function actualDate(v:unknown,today:string):string {if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v||v>today||v<'2000-01-01')throw new LedgerInvalid('Usa una fecha real entre 2000 y hoy, sin fechas futuras.');return v}
export function closureData(action:string,value:unknown,today:string):FinalSubmission|{reportId:string}|{contributionId:string;fulfilledOn:string;fileId:string}|{caseId:string} {
 if(action==='SUBMIT_FINAL'){
  const v=record(value,['periodStart','periodEnd','narrative','varianceExplanation','expenses']),start=actualDate(v.periodStart,today),end=actualDate(v.periodEnd,today)
  if(end<start)throw new LedgerInvalid('El fin del período no puede ser anterior al inicio.')
  if(!Array.isArray(v.expenses)||v.expenses.length>100)throw new LedgerInvalid('Máximo 100 gastos por rendición final.')
  const files=new Set<string>()
  const expenses=v.expenses.map(raw=>{const e=record(raw,['budgetItemId','expenseCategoryId','description','amount','spentOn','fileIds'])
   if(e.budgetItemId!==null&&!id(e.budgetItemId)||!id(e.expenseCategoryId))throw new LedgerInvalid('Selecciona una partida y categoría válidas.')
   if(typeof e.amount!=='string'||money(e.amount)<=0n)throw new LedgerInvalid('Cada gasto debe ser positivo, con hasta dos decimales.')
   const spentOn=actualDate(e.spentOn,today);if(spentOn<start||spentOn>end)throw new LedgerInvalid('La fecha de cada gasto debe estar dentro del período.')
   if(!Array.isArray(e.fileIds)||e.fileIds.length<1||e.fileIds.length>3||new Set(e.fileIds).size!==e.fileIds.length||e.fileIds.some(f=>!id(f)||files.has(f)))throw new LedgerInvalid('Adjunta 1–3 evidencias privadas distintas por gasto; no repitas documentos entre gastos.')
   for(const f of e.fileIds)files.add(f)
   return{budgetItemId:e.budgetItemId as string|null,expenseCategoryId:e.expenseCategoryId,description:closureText(e.description,10,300),amount:e.amount,spentOn,fileIds:e.fileIds as string[]}
  })
  return{periodStart:start,periodEnd:end,narrative:closureText(v.narrative,20,5000),varianceExplanation:closureText(v.varianceExplanation,20,2000),expenses}
 }
 if(action==='FULFILL_REWARD'){const v=record(value,['contributionId','fulfilledOn','fileId']);if(!id(v.contributionId)||!id(v.fileId))throw new LedgerInvalid('Selecciona aporte y evidencia válidos.');return{contributionId:v.contributionId,fulfilledOn:actualDate(v.fulfilledOn,today),fileId:v.fileId}}
 if(action==='RESOLVE_CLOSURE_CASE'){const v=record(value,['caseId']);if(!id(v.caseId))throw new LedgerInvalid('Selecciona una incidencia válida.');return{caseId:v.caseId}}
 if(action==='APPROVE_FINAL'||action==='REQUEST_CHANGES'){const v=record(value,['reportId']);if(!id(v.reportId))throw new LedgerInvalid('Selecciona un informe válido.');return{reportId:v.reportId}}
 throw new LedgerInvalid('Acción de cierre no disponible.')
}
