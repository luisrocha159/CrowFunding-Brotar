import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../access/session/sessionClient'

export interface ProjectSummary {
  id: string; title: string; summary: string | null; status: string; categoryName: string | null
  goalAmount: string | null; currencyCode: string | null; updatedAt: string; submittedAt: string | null; creatorName: string
}
export interface ProjectDetail extends ProjectSummary {
  location: { locality: string | null; countryCode: string | null } | null
  story: { problem: string | null; solution: string | null; beneficiaries: string | null; expectedResults: string | null } | null
  history: { fromStatus: string | null; toStatus: string; changedAt: string; reason: string | null }[]
}
export const projectStatusNames: Record<string, string> = {
  DRAFT: 'Borrador', PENDING_VERIFICATION: 'Pendiente de verificación', IN_REVIEW: 'En revisión',
  CHANGES_REQUESTED: 'Cambios solicitados', APPROVED: 'Aprobada · aún no publicada', PUBLISHED: 'Publicada',
  REJECTED: 'Rechazada', FUNDING_ENDED: 'Financiamiento finalizado', IN_EXECUTION: 'En ejecución', CLOSED: 'Cerrada', CANCELLED: 'Cancelada'
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const nullableString = (value: unknown) => value === null || typeof value === 'string'
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const nullableFields = (value: unknown, keys: string[]) => object(value) && keys.every(key => nullableString(value[key]))
function summary(value: unknown): ProjectSummary {
  if (!object(value) || !['id', 'title', 'status', 'creatorName'].every(key => typeof value[key] === 'string')
    || !['summary', 'categoryName', 'goalAmount', 'currencyCode'].every(key => nullableString(value[key]))
    || !date(value.updatedAt) || !(value.submittedAt === null || date(value.submittedAt))
    || !Object.hasOwn(projectStatusNames, value.status as string)
    || (value.goalAmount !== null && (typeof value.goalAmount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value.goalAmount) || Number(value.goalAmount) <= 0))
    || (value.currencyCode !== null && (typeof value.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(value.currencyCode)))) throw new SessionError(0)
  return value as unknown as ProjectSummary
}
function detail(value: unknown): ProjectDetail {
  const project = summary(value)
  const data = value as Record<string, unknown>
  if (!(data.location === null || nullableFields(data.location, ['locality', 'countryCode']))
    || !(data.story === null || nullableFields(data.story, ['problem', 'solution', 'beneficiaries', 'expectedResults']))
    || !Array.isArray(data.history) || !data.history.every(item => object(item) && nullableString(item.fromStatus)
      && typeof item.toStatus === 'string' && date(item.changedAt) && nullableString(item.reason))) throw new SessionError(0)
  return { ...project, location: data.location, story: data.story, history: data.history } as ProjectDetail
}
async function list(path: string, signal?: AbortSignal) {
  const data = await readJson(await requestApi(path, { signal }))
  if (!Array.isArray(data)) throw new SessionError(0)
  return data.map(summary)
}
export function ownProjects(signal?: AbortSignal) { return list('/api/campaigns/mine', signal) }
export function campaignReviewQueue(signal?: AbortSignal) { return list('/api/admin/campaigns/review', signal) }
export async function projectDetail(id: string, admin: boolean, signal?: AbortSignal) {
  return detail(await readJson(await requestApi(`${admin ? '/api/admin/campaigns/review' : '/api/campaigns/mine'}/${encodeURIComponent(id)}`, { signal })))
}
export async function discardProject(id: string, signal?: AbortSignal): Promise<void> {
  await requestApi(`/api/campaigns/mine/${encodeURIComponent(id)}/discard`, { method: 'POST', body: { confirmed: true }, signal })
}
export function canContinueProject(status: string) { return status === 'DRAFT' }
export function projectGoal(project: ProjectSummary): string {
  return project.goalAmount && project.currencyCode ? `${project.currencyCode} ${Number(project.goalAmount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Meta por definir'
}
