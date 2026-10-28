import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import type { ProgressInput, UpdateInput } from '../../../backend/src/campaign-progress/domain/progress'
export type { ProgressInput, UpdateInput }
export interface ActualRow { id: string; name: string; responsibleName: string; status: string; progressPercent: number; plannedStartOn: string | null; plannedEndOn: string | null; actualStartOn: string | null; actualEndOn: string | null }
export interface Indicator { id: string; name: string; unit: string | null; targetValue: string | null; achievedValue: string | null }
export interface ProgressState { revision: string; campaign: { id: string; title: string; status: string }; editable: boolean; activities: ActualRow[]; milestones: ActualRow[]; indicators: Indicator[] }
export interface UpdateItem { version?: number; withdrawnAt?: string | null; id: string; title: string; body: string; milestoneId: string | null; publishedAt: string | null; revision?: string; images: { fileId: string; caption: string }[]; progress: ProgressState | null }
export interface CreatorItem { id: string; title: string; status: string; currencyCode: string | null; goalAmount: string | null; amountRaised: string; fundingPercent: string; organizationId: string | null; organizationName: string | null; updateCount: number; activityProgress: string | null }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const string = (v: unknown): v is string => typeof v === 'string'
const nullable = (v: unknown) => v === null || string(v)
function row(v: unknown) { return object(v) && ['id', 'name', 'responsibleName', 'status'].every(k => string(v[k])) && Number.isInteger(v.progressPercent) && Number(v.progressPercent) >= 0 && Number(v.progressPercent) <= 100 && ['plannedStartOn', 'plannedEndOn', 'actualStartOn', 'actualEndOn'].every(k => nullable(v[k])) }
export function progressFrom(v: unknown): ProgressState {
  if (!object(v) || !string(v.revision) || !object(v.campaign) || !['id', 'title', 'status'].every(k => string((v.campaign as Record<string, unknown>)[k])) || typeof v.editable !== 'boolean' || !Array.isArray(v.activities) || !v.activities.every(row) || !Array.isArray(v.milestones) || !v.milestones.every(row) || !Array.isArray(v.indicators) || !v.indicators.every(i => object(i) && string(i.id) && string(i.name) && nullable(i.unit) && nullable(i.targetValue) && nullable(i.achievedValue))) throw new SessionError(0)
  return v as unknown as ProgressState
}
export function updatesFrom(v: unknown): UpdateItem[] {
  if (!object(v) || !Array.isArray(v.items) || !v.items.every(i => object(i) && ['id', 'title', 'body'].every(k => string(i[k])) && nullable(i.milestoneId) && nullable(i.publishedAt) && (i.revision === undefined || string(i.revision)) && (i.version === undefined || Number.isSafeInteger(i.version) && Number(i.version)>0) && (i.withdrawnAt === undefined || nullable(i.withdrawnAt)) && Array.isArray(i.images) && i.images.every(f => object(f) && string(f.fileId) && string(f.caption)) && (i.progress === null || Boolean(progressFrom(i.progress))))) throw new SessionError(0)
  return v.items as UpdateItem[]
}
export function creatorFrom(v: unknown): CreatorItem[] {
  if (!object(v) || !Array.isArray(v.items) || !v.items.every(i => object(i) && ['id', 'title', 'status', 'amountRaised', 'fundingPercent'].every(k => string(i[k])) && ['currencyCode', 'goalAmount', 'organizationId', 'organizationName', 'activityProgress'].every(k => nullable(i[k])) && Number.isInteger(i.updateCount))) throw new SessionError(0)
  return v.items as CreatorItem[]
}
export async function readProgress(id: string, signal?: AbortSignal) { return progressFrom(await readJson(await requestApi(`/api/campaigns/${encodeURIComponent(id)}/progress`, { signal }))) }
export async function saveProgress(id: string, body: ProgressInput) { return progressFrom(await readJson(await requestApi(`/api/campaigns/${encodeURIComponent(id)}/progress`, { method: 'PUT', body }))) }
export async function readUpdates(id: string, isPublic = false, signal?: AbortSignal) { return updatesFrom(await readJson(await requestApi(`/api/campaigns/${isPublic ? 'public/' : ''}${encodeURIComponent(id)}/updates`, { signal }))) }
export async function saveUpdate(id: string, updateId: string, body: UpdateInput) {
  const item = await readJson(await requestApi(`/api/campaigns/${encodeURIComponent(id)}/updates/${encodeURIComponent(updateId)}`, { method: 'PUT', body }))
  return updatesFrom({ items: [item] })[0]!
}
export async function readUpdate(id: string, updateId: string) {
  return updatesFrom({items:[await readJson(await requestApi(`/api/campaigns/${encodeURIComponent(id)}/updates/${encodeURIComponent(updateId)}`))]})[0]!
}
export async function creatorDashboard(signal?: AbortSignal) { return creatorFrom(await readJson(await requestApi('/api/campaigns/creator-dashboard', { signal }))) }
export const failureText = (e: unknown) => e instanceof SessionError ? e.status === 409 ? 'La información cambió o ya no admite edición. Tus datos siguen aquí; recarga para comparar antes de volver a guardar.' : e.status === 403 ? 'Tu cuenta no tiene permiso para esta operación.' : e.status === 404 ? 'Este proyecto no está disponible para tu cuenta.' : e.status === 400 ? 'Revisa los campos y archivos antes de continuar.' : 'No pudimos completar la operación. Reintenta.' : 'No pudimos completar la operación. Reintenta.'

export async function readUpdatePage(id: string, isPublic: boolean, page: number, signal?: AbortSignal) {
  const result = await readJson(await requestApi(`/api/campaigns/${isPublic ? 'public/' : ''}${encodeURIComponent(id)}/updates?page=${page}`, { signal }))
  if (!object(result) || !Number.isSafeInteger(result.total) || Number(result.total)<0 || result.page!==page || result.pageSize!==20) throw new SessionError(0)
  return {items:updatesFrom(result),total:Number(result.total)}
}
