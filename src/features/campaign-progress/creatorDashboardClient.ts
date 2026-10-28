import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { creatorFrom, type CreatorItem } from './progressClient'

export type CreatorScope = 'all' | 'personal' | 'institutional'
interface PendingItem {
  id: string; status: string; organizationId: string | null
  pendingActivities: number; pendingRewards: number; pendingCases: number
  reportStatus: string | null; verificationStatus: string | null; legalStatus: string | null; representativeStatus: string | null
}
export interface DashboardItem extends CreatorItem, PendingItem { demoAmountRaised: string; demoFundingPercent: string }
export interface DashboardPage {
  items: DashboardItem[]; total: number; page: number; pageSize: number
  states: { status: string; count: number }[]
  funding: { currencyCode: string; amountRaised: string; demoAmountRaised: string }[]
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0
const nullable = (v: unknown) => v === null || typeof v === 'string'
const decimal = (v: unknown) => typeof v === 'string' && /^\d+(\.\d{1,2})?$/.test(v)
export function dashboardFrom(v: unknown): DashboardPage {
  if (!object(v) || !count(v.total) || !count(v.page) || Number(v.page) < 1 || v.pageSize !== 20 || !Array.isArray(v.states) || !v.states.every(s => object(s) && typeof s.status === 'string' && count(s.count)) || !Array.isArray(v.funding) || !v.funding.every(f => object(f) && typeof f.currencyCode === 'string' && decimal(f.amountRaised) && decimal(f.demoAmountRaised))) throw new SessionError(0)
  const items = creatorFrom(v)
  if (!items.every(i => {
    const item = i as unknown as Record<string, unknown>
    return ['pendingActivities', 'pendingRewards', 'pendingCases'].every(k => count(item[k])) && ['reportStatus', 'verificationStatus', 'legalStatus', 'representativeStatus'].every(k => nullable(item[k])) && decimal(item.demoAmountRaised) && decimal(item.demoFundingPercent)
  })) throw new SessionError(0)
  return v as unknown as DashboardPage
}
export async function readCreatorDashboard(page: number, scope: CreatorScope, signal?: AbortSignal) {
  const result = dashboardFrom(await readJson(await requestApi(`/api/campaigns/creator-dashboard?page=${page}&scope=${scope}`, { signal })))
  if (result.page !== page) throw new SessionError(0)
  return result
}
export function creatorActions(item: PendingItem) {
  const root = `/mis-proyectos/${encodeURIComponent(item.id)}`
  const result = [{ label: item.status === 'CHANGES_REQUESTED' ? 'Corregir observaciones' : item.status === 'DRAFT' ? 'Continuar borrador' : 'Revisión y observaciones', href: root }]
  if (item.verificationStatus !== 'APPROVED' || item.organizationId && (item.legalStatus !== 'APPROVED' || item.representativeStatus !== 'APPROVED')) result.push({ label: 'Revisar verificación pendiente', href: '/mi-verificacion' })
  if (['PUBLISHED', 'FUNDING_ENDED', 'IN_EXECUTION', 'CLOSED', 'CANCELLED'].includes(item.status)) {
    result.push({ label: `Ejecución y avances${item.pendingActivities ? ` (${item.pendingActivities} pendientes)` : ''}`, href: `${root}/avances` })
    result.push({ label: 'Ciclo de campaña', href: `/mis-campanas/ciclo/${encodeURIComponent(item.id)}` })
  }
  if (['FUNDING_ENDED', 'IN_EXECUTION', 'CLOSED', 'CANCELLED'].includes(item.status)) {
    result.push({ label: `Rendición${item.reportStatus ? ` · ${reportNames[item.reportStatus] ?? item.reportStatus}` : ' pendiente'}`, href: `${root}/rendicion` })
    result.push({ label: 'Revisar cierre y obligaciones', href: `${root}/cierre` })
    result.push({ label: 'Desembolsos DEMO', href: `${root}/desembolsos` })
  }
  return result
}
export const reportNames: Record<string, string> = { DRAFT: 'borrador', SUBMITTED: 'presentada', IN_REVIEW: 'en revisión', APPROVED: 'aprobada', PUBLISHED: 'publicada', REQUIRES_CHANGES: 'requiere correcciones', REJECTED: 'rechazada' }
