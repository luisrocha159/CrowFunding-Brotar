import { SessionError } from '../access/session/sessionClient'
import { readJson, requestApi } from '../../shared/api/request'

export interface MissingField { field: string; label: string; step: number }
export interface ReviewObservation { section: string; fieldPath: string | null; message: string }
export interface SubmissionReport { id: string; status: string; missing: MissingField[]; observations: ReviewObservation[]; duplicateWarning?: string | null }
export function submissionFieldsForStep(report: SubmissionReport, step: number): Record<string, string> {
  return Object.fromEntries(report.missing.filter(item => item.step === step).map(item => [item.field, `Completa o corrige: ${item.label}`]))
}

export class SubmissionIncompleteError extends SessionError {
  constructor(readonly missing: MissingField[]) { super(422) }
}

export function observationStep(section: string): number {
  const key = section.toLowerCase()
  if (key.includes('modality') || key.includes('modalidad') || key.includes('campaigntype')) return 0
  if (key.includes('reward') || key.includes('recomp') || key.includes('presale') || key.includes('preventa')) return 6
  if (key.includes('fund') || key.includes('financ')) return 5
  if (['plan', 'budget', 'risk', 'presupuesto', 'activity', 'activit', 'actividad', 'milestone', 'hito', 'riesgo'].some(term => key.includes(term))) return 4
  if (key.includes('cover') || key.includes('portada')) return 3
  if (key.includes('story') || key.includes('impact') || key.includes('historia')) return 2
  return 1
}

function parse(value: unknown): SubmissionReport {
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const data = value as Record<string, unknown>
  if (data.duplicateWarning !== undefined && data.duplicateWarning !== null && typeof data.duplicateWarning !== 'string') throw new SessionError(0)
  if (typeof data.id !== 'string' || !data.id || typeof data.status !== 'string' || !data.status || !validMissing(data.missing) || !Array.isArray(data.observations) || !data.observations.every(observation)) throw new SessionError(0)
  return data as unknown as SubmissionReport
}

function validMissing(value: unknown): value is MissingField[] {
  return Array.isArray(value) && value.length <= 2000 && value.every(item => item && typeof item === 'object' &&
    typeof item.field === 'string' && /^[a-zA-Z][a-zA-Z0-9.]*$/.test(item.field) &&
    typeof item.label === 'string' && item.label.length > 0 && item.label.length <= 500 && Number.isInteger(item.step) && item.step >= 0 && item.step <= 7)
}
function observation(value: unknown): value is ReviewObservation {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.section === 'string' && typeof item.message === 'string' && (item.fieldPath === null || typeof item.fieldPath === 'string')
}

async function request(id: string, method: 'GET' | 'POST', signal?: AbortSignal, send?: typeof fetch) {
  const response = await requestApi(`/api/campaigns/drafts/${encodeURIComponent(id)}/submission`, {
    method, signal,
    errorFromResponse: async response => {
      if (response.status === 422) {
        const detail: unknown = await response.json().catch(() => null)
        if (detail && typeof detail === 'object' && validMissing((detail as Record<string, unknown>).missing)) {
          return new SubmissionIncompleteError((detail as { missing: MissingField[] }).missing)
        }
      }
      return new SessionError(response.status)
    }
  }, send)
  return parse(await readJson(response))
}

export function readSubmission(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<SubmissionReport> {
  return request(id, 'GET', signal, send)
}

export function submitCampaign(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<SubmissionReport> {
  return request(id, 'POST', signal, send)
}
