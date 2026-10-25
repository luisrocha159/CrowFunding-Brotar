import { createHash } from 'node:crypto'
import { decimal, LedgerInvalid, money } from '../../contributions/domain/payment'
import { validatePeriod } from '../../finance/domain/report'

export const DEMO_PROVIDER='BROTAR_INTERNAL_DEMO'
export const DEMO_LABEL='SIMULACIÓN · SIN DINERO REAL · NO PAGAR'
export const digest=(value: string)=>createHash('sha256').update(value).digest('hex')
export function isDemoEnabled(env: NodeJS.ProcessEnv): boolean {
  return ['development','test'].includes(env.NODE_ENV ?? 'development') && env.DEMO_PAYMENTS_ENABLED==='true'
}
export function requestKey(value: string): void {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new LedgerInvalid('Usa una clave UUID v4 por operación; reutilízala al reintentar la misma petición.')
}
export function reason(value: string): string {
  if (typeof value!=='string' || value.trim().length<20 || value.length>500 || /[\p{Cc}\p{Cf}]/u.test(value)) throw new LedgerInvalid('Explica el motivo en 20–500 caracteres, sin controles invisibles.')
  return value.trim()
}
export function reconciliationPeriod(from: string,to: string,currency: string): void {
  if (typeof from!=='string' || typeof to!=='string') throw new LedgerInvalid('Indica ambas fechas del período.')
  validatePeriod({from,to})
  if (!/^[A-Z]{3}$/.test(currency) || Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`)>30*86400000) throw new LedgerInvalid('Conciliación por una moneda y hasta 31 días UTC inclusive.')
}
export interface SettlementRecord { paymentId: string; reference: string; amount: string }
export type Classification='MATCHED'|'MISSING_INTERNAL'|'MISSING_PROVIDER'|'AMOUNT_MISMATCH'|'DUPLICATED'
export interface SettlementItem { reference: string; paymentId: string|null; internalAmount: string; providerAmount: string; classification: Classification }

/** Avisos idénticos son una sola transacción, no dinero adicional. Importes siempre en céntimos. */
export function compareSettlement(internal: readonly SettlementRecord[],observed: readonly SettlementRecord[]): SettlementItem[] {
  const references=[...new Set([...internal,...observed].map(row=>row.reference))].sort()
  if (references.length>500) throw new LedgerInvalid('El lote supera 500 referencias. Divide el período de conciliación.')
  const unique=(rows: readonly SettlementRecord[])=>[...new Map(rows.map(row=>[JSON.stringify([row.paymentId,money(row.amount).toString()]),row])).values()]
  return references.map(reference=>{
    const a=unique(internal.filter(row=>row.reference===reference)),b=unique(observed.filter(row=>row.reference===reference))
    const sum=(rows: SettlementRecord[])=>decimal(rows.reduce((n,row)=>n+money(row.amount),0n))
    const internalAmount=sum(a),providerAmount=sum(b),ids=[...new Set([...a,...b].map(row=>row.paymentId))]
    const classification: Classification=a.length>1 || b.length>1 || ids.length>1 ? 'DUPLICATED' : !a.length ? 'MISSING_INTERNAL' : !b.length ? 'MISSING_PROVIDER'
      : money(internalAmount,true)!==money(providerAmount,true) ? 'AMOUNT_MISMATCH' : 'MATCHED'
    return {reference,paymentId:ids.length===1?ids[0]!:null,internalAmount,providerAmount,classification}
  })
}

/** Totales numeric(16,2), no se usa decimal() limitado a un solo pago numeric(14,2). */
export function settlementTotal(values: readonly string[]): string {
  const n=values.reduce((sum,value)=>sum+money(value,true),0n)
  if (n>9999999999999999n) throw new LedgerInvalid('Total fuera del límite del lote.')
  return `${n/100n}.${String(n%100n).padStart(2,'0')}`
}
