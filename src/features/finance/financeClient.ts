import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'

export const paymentLabels = { INITIATED:'Iniciado',PENDING:'Pendiente',CONFIRMED:'Confirmado',FAILED:'Fallido',EXPIRED:'Expirado',REFUNDED:'Reembolsado',DISPUTED:'En disputa' } as const
export type PaymentStatus = keyof typeof paymentLabels
export interface FinanceFilters { campaignId: string; status: string; from: string; to: string }
export const emptyFinanceFilters: FinanceFilters = {campaignId:'',status:'',from:'',to:''}
export interface PaymentOperation {
  kind: 'PAYMENT'; id: string; contributionId: string; reference: string; campaignId: string; campaignTitle: string
  sponsorId: string; createdAt: string; status: PaymentStatus; contributionStatus: string; currencyCode: string
  amount: string; feeAmount: string; netAmount: string; refundedAmount: string; sandbox: boolean
}
export interface OperationTotal { currencyCode: string; status: PaymentStatus; count: string; amount: string; feeAmount: string; netAmount: string; refundedAmount: string }
export interface FinanceReport { items: PaymentOperation[]; totals: OperationTotal[]; nextCursor: string | null }
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const amount=/^\d{1,24}\.\d{2}$/
const record=(value: unknown): value is Record<string,unknown>=>value!==null && typeof value==='object' && !Array.isArray(value)
const moneyFields=['amount','feeAmount','netAmount','refundedAmount'] as const
function isTotal(value: unknown): value is OperationTotal {
  return record(value) && typeof value.currencyCode==='string' && /^[A-Z]{3}$/.test(value.currencyCode) &&
    typeof value.status==='string' && Object.hasOwn(paymentLabels,value.status) && typeof value.count==='string' && /^\d+$/.test(value.count) &&
    moneyFields.every(key=>typeof value[key]==='string' && amount.test(value[key]))
}
function isPayment(value: unknown): value is PaymentOperation {
  return record(value) && value.kind==='PAYMENT' && ['id','contributionId','campaignId','sponsorId'].every(key=>typeof value[key]==='string' && uuid.test(value[key])) &&
    typeof value.reference==='string' && value.reference.length<=24 && typeof value.campaignTitle==='string' && value.campaignTitle.length<=200 &&
    typeof value.createdAt==='string' && /^\d{4}-\d{2}-\d{2}T/.test(value.createdAt) && Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.status==='string' && Object.hasOwn(paymentLabels,value.status) && typeof value.contributionStatus==='string' &&
    ['PENDING','CONFIRMED','CANCELLED','EXPIRED','REFUNDED'].includes(value.contributionStatus) &&
    typeof value.currencyCode==='string' && /^[A-Z]{3}$/.test(value.currencyCode) && typeof value.sandbox==='boolean' &&
    moneyFields.every(key=>typeof value[key]==='string' && amount.test(value[key]))
}
export function financeReportFrom(value: unknown): FinanceReport {
  if (!record(value) || !Array.isArray(value.items) || value.items.length>50 || !value.items.every(isPayment) ||
    new Set(value.items.map(item=>item.id)).size!==value.items.length || !Array.isArray(value.totals) || !value.totals.every(isTotal) ||
    !(value.nextCursor===null || (typeof value.nextCursor==='string' && uuid.test(value.nextCursor) && value.items.at(-1)?.id===value.nextCursor))) throw new SessionError(0)
  return {items:value.items,totals:value.totals,nextCursor:value.nextCursor}
}
export function financeQuery(filters: FinanceFilters, cursor?: string): string {
  const query=new URLSearchParams()
  for (const key of ['campaignId','status','from','to'] as const) if (filters[key]) query.set(key,filters[key])
  if (cursor) query.set('cursor',cursor)
  return query.toString()
}
export async function financeReport(filters: FinanceFilters, cursor?: string, signal?: AbortSignal): Promise<FinanceReport> {
  return financeReportFrom(await readJson(await requestApi(`/api/admin/finance/payments?${financeQuery(filters,cursor)}`,{signal})))
}
export async function exportFinance(filters: FinanceFilters, signal?: AbortSignal): Promise<Blob> {
  const response=await requestApi(`/api/admin/finance/payments/export?${financeQuery(filters)}`,{signal})
  if (!response.headers.get('content-type')?.startsWith('text/csv')) throw new SessionError(0)
  return response.blob()
}
export function financeMoney(value: string, currency: string): string {
  const negative=value.startsWith('-'),[whole,fraction]=value.replace(/^-/,'').split('.')
  return `${negative && BigInt(whole!+fraction)!==0n?'-':''}${new Intl.NumberFormat('es-BO').format(BigInt(whole!))},${fraction} ${currency}`
}
