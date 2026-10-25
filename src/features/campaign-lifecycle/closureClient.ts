import {SessionError} from '../../shared/api/sessionError'
import {identifier,object,amount,timestamp} from './cycleClient'
export interface ClosureExpense {budgetItemId:string|null;expenseCategoryId:string;description:string;amount:string;spentOn:string;fileIds:string[];rowKey?:string}
export interface FinalForm {periodStart:string;periodEnd:string;narrative:string;varianceExplanation:string;expenses:ClosureExpense[]}
export interface ClosureDetail {
 mode:'DEMO';id:string;title:string;status:string;currencyCode:string;today:string;executionOn:string|null;version:number;cancelRequested:boolean
 funds:{confirmed:string;refunded:string;disbursed:string;committed:string;refunds_reserved:string;disputed:string};pending:{progress:number;rewards:number}
 categories:{id:string;name:string}[];budget:{id:string;description:string;plannedAmount:string;expenseCategoryId:string}[]
 rewards:{id:string;reference:string;title:string;status:string;fulfilledAt:string|null;fileId:string|null}[]
 cases:{id:string;reference:string;subject:string;status:string;financial:boolean}[];totalRewards:number;totalCases:number;page:number;pageSize:20
 report:{id:string;status:string;periodStart:string;periodEnd:string;narrative:string;varianceExplanation:string;fundsReceived:string;fundsSpent:string;submittedBy:string;reviewedBy:string|null;reviewedAt:string|null;snapshotCurrent:boolean;expenses:(ClosureExpense&{id:string})[]}|null
}
export interface ClosureList {mode:'DEMO';items:{id:string;title:string;status:string}[];total:number;page:number;pageSize:20}
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v
const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[\p{Cc}\p{Cf}\p{Cs}<>]/u.test(v)
const expense=(v:unknown)=>object(v)&&identifier(v.id)&&(v.budgetItemId===null||identifier(v.budgetItemId))&&identifier(v.expenseCategoryId)&&typeof v.description==='string'&&amount(v.amount)&&date(v.spentOn)&&Array.isArray(v.fileIds)&&v.fileIds.every(identifier)
export function closureFrom(v:unknown):ClosureDetail{
 if(!object(v)||v.mode!=='DEMO'||!identifier(v.id)||typeof v.title!=='string'||typeof v.status!=='string'||typeof v.currencyCode!=='string'||!date(v.today)||!(v.executionOn===null||date(v.executionOn))||!Number.isSafeInteger(v.version)||Number(v.version)<1||typeof v.cancelRequested!=='boolean'||!object(v.funds)||!['confirmed','refunded','disbursed','committed','refunds_reserved','disputed'].every(k=>amount((v.funds as Record<string,unknown>)[k]))||!object(v.pending)||!['progress','rewards'].every(k=>Number.isSafeInteger((v.pending as Record<string,unknown>)[k]))||!Array.isArray(v.categories)||!v.categories.every(x=>object(x)&&identifier(x.id)&&typeof x.name==='string')||!Array.isArray(v.budget)||!v.budget.every(x=>object(x)&&identifier(x.id)&&typeof x.description==='string'&&amount(x.plannedAmount)&&identifier(x.expenseCategoryId))||!Array.isArray(v.rewards)||!v.rewards.every(x=>object(x)&&identifier(x.id)&&['reference','title','status'].every(k=>typeof x[k]==='string')&&(x.fulfilledAt===null||timestamp(x.fulfilledAt))&&(x.fileId===null||identifier(x.fileId)))||!Array.isArray(v.cases)||!v.cases.every(x=>object(x)&&identifier(x.id)&&['reference','subject','status'].every(k=>typeof x[k]==='string')&&typeof x.financial==='boolean')||!['totalRewards','totalCases','page'].every(k=>Number.isSafeInteger(v[k]))||v.pageSize!==20||!(v.report===null||object(v.report)&&identifier(v.report.id)&&typeof v.report.status==='string'&&date(v.report.periodStart)&&date(v.report.periodEnd)&&typeof v.report.narrative==='string'&&typeof v.report.varianceExplanation==='string'&&amount(v.report.fundsReceived)&&amount(v.report.fundsSpent)&&identifier(v.report.submittedBy)&&typeof v.report.snapshotCurrent==='boolean'&&Array.isArray(v.report.expenses)&&v.report.expenses.every(expense)))throw new SessionError(0)
 return v as unknown as ClosureDetail
}
export function closureListFrom(v:unknown):ClosureList{if(!object(v)||v.mode!=='DEMO'||!Array.isArray(v.items)||v.items.length>20||!v.items.every(x=>object(x)&&identifier(x.id)&&typeof x.title==='string'&&typeof x.status==='string')||!Number.isSafeInteger(v.total)||!Number.isSafeInteger(v.page)||v.pageSize!==20)throw new SessionError(0);return v as unknown as ClosureList}
export function finalErrors(f:FinalForm,today:string,received:string):Record<string,string>{
 const errors:Record<string,string>={}
 for(const k of ['periodStart','periodEnd'] as const)if(!date(f[k])||f[k]>today||f[k]<'2000-01-01')errors[k]='Usa una fecha real no futura.'
 if(f.periodEnd<f.periodStart)errors.periodEnd='Debe ser igual o posterior al inicio.'
 if(!text(f.narrative,20,5000))errors.narrative='Describe resultados con 20–5000 caracteres, sin HTML ni controles invisibles.'
 if(!text(f.varianceExplanation,20,2000))errors.varianceExplanation='Explica diferencias con 20–2000 caracteres; indica también si no hubo variaciones.'
 let cents=0n;const files=new Set<string>()
 for(const [i,e]of f.expenses.entries()){
  if(!text(e.description,10,300))errors[`description.${i}`]='Usa 10–300 caracteres, sin HTML ni controles.'
  if(!identifier(e.expenseCategoryId))errors[`expenseCategoryId.${i}`]='Selecciona una categoría.'
  if(!/^\d{1,12}(?:\.\d{1,2})?$/.test(e.amount)||Number(e.amount)<=0)errors[`amount.${i}`]='Importe positivo, hasta dos decimales.'
  else{const [a,b='']=e.amount.split('.');cents+=BigInt(a!)*100n+BigInt(b.padEnd(2,'0'))}
  if(!date(e.spentOn)||e.spentOn>today||e.spentOn<f.periodStart||e.spentOn>f.periodEnd)errors[`spentOn.${i}`]='Fecha real dentro del período, no futura.'
  if(!e.fileIds.length||e.fileIds.length>3||new Set(e.fileIds).size!==e.fileIds.length||e.fileIds.some(x=>!identifier(x)||files.has(x)))errors[`fileIds.${i}`]='Adjunta evidencia privada sin repetirla entre gastos.'
  e.fileIds.forEach(x=>files.add(x))
 }
 const [a,b='']=received.split('.');if(/^\d+(\.\d{1,2})?$/.test(received)&&cents!==BigInt(a!)*100n+BigInt(b.padEnd(2,'0')))errors.total='Los gastos deben sumar exactamente lo desembolsado. No se inventa saldo cero.'
 if(f.expenses.length>100)errors.total='Máximo 100 gastos.'
 return errors
}
export const closureLabels:Record<string,string>={SUBMIT_FINAL:'Presentar rendición final DEMO',APPROVE_FINAL:'Aprobar rendición final',REQUEST_CHANGES:'Solicitar correcciones',FULFILL_REWARD:'Registrar cumplimiento DEMO',RESOLVE_CLOSURE_CASE:'Resolver incidencia no financiera'}
