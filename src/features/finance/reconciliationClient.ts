import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { paymentLabels, type PaymentStatus } from './financeClient'

export const reconciliationLabels = {MATCHED:'Coincide',MISSING_INTERNAL:'Falta confirmación interna',MISSING_PROVIDER:'Falta recibo DEMO',AMOUNT_MISMATCH:'Importes diferentes',DUPLICATED:'Referencia contradictoria',RESOLVED:'Resuelta'} as const
export const batchLabels = {OPEN:'Abierto',IN_PROGRESS:'En revisión',CLOSED:'Cerrado'} as const
export type ResolutionAction = 'RECHECK'|'COMPENSATE_DEMO'
export interface ReconciliationFilters {from: string;to: string;currencyCode: string}
export interface ReconciliationBatch extends ReconciliationFilters {
  id: string;status: keyof typeof batchLabels;totalInternal: string;totalProvider: string;difference: string
}
export interface ReconciliationItem {
  id: string;paymentId: string|null;reference: string;status: keyof typeof reconciliationLabels
  originalStatus: Exclude<keyof typeof reconciliationLabels,'RESOLVED'>;internalAmount: string;providerAmount: string
  internalReference: string|null;internalStatus: PaymentStatus|null;resolution: ResolutionAction|null
  reason: string|null;resolvedBy: string|null;resolvedAt: string|null;compensationAmount: string|null
}
export interface ReconciliationDetail extends ReconciliationBatch {
  snapshotAt: string;createdBy: string|null;closedBy: string|null;closedAt: string|null;items: ReconciliationItem[]
}
export interface PendingPayment {
  id: string;contributionId: string;campaignId: string;campaignTitle: string;reference: string;amount: string
  currencyCode: string;status: PaymentStatus;createdAt: string;expiresAt: string|null;expired: boolean;needsReview: boolean
}
export interface Page<T> {items: T[];nextCursor: string|null}
const prefix='/api/admin/finance/demo'
const record=(v: unknown): v is Record<string,unknown>=>v!==null && typeof v==='object' && !Array.isArray(v)
const uuid=(v: unknown): v is string=>typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)
const nullableId=(v: unknown)=>v===null || uuid(v)
const text=(v: unknown,max: number): v is string=>typeof v==='string' && v.length<=max
const amount=(v: unknown): v is string=>typeof v==='string' && /^\d{1,24}\.\d{2}$/.test(v)
const signed=(v: unknown): v is string=>typeof v==='string' && /^-?\d{1,24}\.\d{2}$/.test(v)
const currency=(v: unknown): v is string=>typeof v==='string' && /^[A-Z]{3}$/.test(v)
const iso=(v: unknown): v is string=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v))
const day=(v: unknown): v is string=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v>='0001-01-01' && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v
const cents=(v: string)=>BigInt(v.replace('.',''))
const demo=(v: unknown): v is Record<string,unknown>=>record(v) && v.mode==='DEMO' && text(v.label,200)
function isBatch(v: unknown): v is ReconciliationBatch {
  return record(v) && uuid(v.id) && day(v.from) && day(v.to) && v.from<=v.to && currency(v.currencyCode) &&
    typeof v.status==='string' && Object.hasOwn(batchLabels,v.status) && amount(v.totalInternal) && amount(v.totalProvider) && signed(v.difference) &&
    cents(v.totalInternal)-cents(v.totalProvider)===cents(v.difference)
}
function isItem(v: unknown): v is ReconciliationItem {
  return record(v) && uuid(v.id) && nullableId(v.paymentId) && text(v.reference,200) && typeof v.status==='string' && Object.hasOwn(reconciliationLabels,v.status) &&
    typeof v.originalStatus==='string' && v.originalStatus!=='RESOLVED' && Object.hasOwn(reconciliationLabels,v.originalStatus) &&
    amount(v.internalAmount) && amount(v.providerAmount) && (v.internalReference===null || text(v.internalReference,24)) &&
    (v.internalStatus===null || typeof v.internalStatus==='string' && Object.hasOwn(paymentLabels,v.internalStatus)) &&
    (v.compensationAmount===null || amount(v.compensationAmount)) && nullableId(v.resolvedBy) &&
    (v.resolvedAt===null || iso(v.resolvedAt)) && (v.reason===null || text(v.reason,500)) &&
    (v.resolution===null || v.resolution==='RECHECK' || v.resolution==='COMPENSATE_DEMO') &&
    (v.status!=='RESOLVED' || v.resolution!==null && typeof v.reason==='string' && v.reason.trim().length>=20 && iso(v.resolvedAt))
}
function pageFrom<T extends {id: string}>(value: unknown,check: (v: unknown)=>v is T): Page<T> {
  if (!demo(value) || !Array.isArray(value.items) || value.items.length>50 || !value.items.every(check) ||
    new Set(value.items.map(x=>x.id)).size!==value.items.length || !(value.nextCursor===null || uuid(value.nextCursor) && value.items.at(-1)?.id===value.nextCursor)) throw new SessionError(0)
  return {items:value.items,nextCursor:value.nextCursor}
}
export const reconciliationListFrom=(v: unknown)=>pageFrom(v,isBatch)
export function reconciliationDetailFrom(v: unknown): ReconciliationDetail {
  if (!demo(v) || !isBatch(v) || !('items' in v) || !Array.isArray(v.items) || v.items.length>500 || !v.items.every(isItem) ||
    new Set(v.items.map(x=>x.id)).size!==v.items.length || !('snapshotAt' in v) || !iso(v.snapshotAt) ||
    !('createdBy' in v) || !nullableId(v.createdBy) || !('closedBy' in v) || !nullableId(v.closedBy) ||
    !('closedAt' in v) || !(v.closedAt===null || iso(v.closedAt)) || v.status==='CLOSED' && !iso(v.closedAt)) throw new SessionError(0)
  return v as unknown as ReconciliationDetail
}
export function pendingFrom(value: unknown): Page<PendingPayment> {
  return pageFrom(value,(v): v is PendingPayment=>record(v) && uuid(v.id) && uuid(v.contributionId) && uuid(v.campaignId) &&
    text(v.campaignTitle,200) && text(v.reference,24) && amount(v.amount) && currency(v.currencyCode) &&
    typeof v.status==='string' && Object.hasOwn(paymentLabels,v.status) && iso(v.createdAt) && (v.expiresAt===null || iso(v.expiresAt)) && typeof v.expired==='boolean' && typeof v.needsReview==='boolean')
}
export function periodError(filters: ReconciliationFilters): string {
  if (!day(filters.from) || !day(filters.to)) return 'Selecciona ambas fechas reales.'
  const days=(Date.parse(`${filters.to}T00:00:00Z`)-Date.parse(`${filters.from}T00:00:00Z`))/86400000
  if (days<0 || days>30) return 'El período debe estar ordenado y abarcar como máximo 31 días, inclusive.'
  return currency(filters.currencyCode)?'':'Selecciona una moneda del catálogo.'
}
export function reasonError(value: string): string {
  return value.trim().length<20 || value.length>500 || /[\p{Cc}\p{Cf}]/u.test(value) ? 'Explica el motivo en 20–500 caracteres, sin caracteres de control.' : ''
}
export function reconciliationError(error: unknown): string {
  const status=error instanceof SessionError?error.status:0
  return ({400:'Revisa las fechas, moneda y motivo. No se guardaron datos inválidos.',401:'Tu sesión terminó. Vuelve a iniciar sesión.',
    403:'No tienes autorización vigente para esta acción. ADMIN y Auditor solo pueden consultar.',404:'Recurso no disponible o simulador DEMO deshabilitado. Comprueba README §28.',
    409:'La evidencia o el estado no permiten esta operación. Actualiza el lote y revisa las diferencias; no se fuerza el cuadre.',
    429:'Demasiadas operaciones. Espera un minuto y consulta el estado antes de repetir.'} as Record<number,string>)[status] ?? 'No se pudo confirmar la operación. Comprueba API y PostgreSQL y consulta el estado antes de reintentar.'
}
export async function reconciliationCurrencies(signal?: AbortSignal): Promise<{code: string;name: string}[]> {
  const v=await readJson(await requestApi(`${prefix}/currencies`,{signal}))
  if (!Array.isArray(v) || !v.every(x=>record(x) && currency(x.code) && text(x.name,60)) || new Set(v.map(x=>x.code)).size!==v.length) throw new SessionError(0)
  return v
}
export async function reconciliationList(cursor?: string,signal?: AbortSignal) {
  const query=new URLSearchParams({limit:'20'});if(cursor)query.set('cursor',cursor)
  return reconciliationListFrom(await readJson(await requestApi(`${prefix}/reconciliations?${query}`,{signal})))
}
export async function pendingPayments(filters: ReconciliationFilters,cursor?: string,signal?: AbortSignal) {
  const query=new URLSearchParams({...filters,limit:'20'});if(cursor)query.set('cursor',cursor)
  return pendingFrom(await readJson(await requestApi(`${prefix}/pending?${query}`,{signal})))
}
export async function reconciliationDetail(id: string,signal?: AbortSignal) {
  if (!uuid(id)) throw new SessionError(404)
  return reconciliationDetailFrom(await readJson(await requestApi(`${prefix}/reconciliations/${id}`,{signal})))
}
export async function createReconciliation(filters: ReconciliationFilters,requestKey: string,signal?: AbortSignal) {
  return reconciliationDetailFrom(await readJson(await requestApi(`${prefix}/reconciliations`,{method:'POST',body:{...filters,requestKey},signal})))
}
export async function resolveReconciliation(id: string,itemId: string,action: ResolutionAction,reason: string,signal?: AbortSignal) {
  return reconciliationDetailFrom(await readJson(await requestApi(`${prefix}/reconciliations/${id}/items/${itemId}/resolve`,{method:'POST',body:{action,reason},signal})))
}
export async function closeReconciliation(id: string,signal?: AbortSignal) {
  return reconciliationDetailFrom(await readJson(await requestApi(`${prefix}/reconciliations/${id}/close`,{method:'POST',body:{confirmed:true},signal})))
}
export async function expireDemoPayments(signal?: AbortSignal): Promise<number> {
  const v=await readJson(await requestApi(`${prefix}/expire`,{method:'POST',body:{limit:100},signal}))
  if (!demo(v) || !Number.isInteger(v.expired) || Number(v.expired)<0 || Number(v.expired)>100) throw new SessionError(0)
  return v.expired as number
}
