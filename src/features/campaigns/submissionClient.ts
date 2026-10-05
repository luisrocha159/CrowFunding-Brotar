import { SessionError } from '../access/session/sessionClient'
import { readJson, requestApi } from '../../shared/api/request'

export interface MissingField { field: string; label: string; step: number }
export interface ReviewObservation { section: string; fieldPath: string | null; message: string }
export interface SubmissionReport { id: string; status: string; missing: MissingField[]; observations: ReviewObservation[] }

export class SubmissionIncompleteError extends SessionError {
  constructor(readonly missing: MissingField[]) { super(422) }
}

function parse(value: unknown): SubmissionReport {
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const data = value as Record<string, unknown>
  if (typeof data.id !== 'string' || typeof data.status !== 'string' || !Array.isArray(data.missing) || !Array.isArray(data.observations)) throw new SessionError(0)
  return data as unknown as SubmissionReport
}

async function request(id: string, method: 'GET' | 'POST', signal?: AbortSignal, send?: typeof fetch) {
  const response = await requestApi(`/api/campaigns/drafts/${encodeURIComponent(id)}/submission`, {
    method, signal,
    errorFromResponse: async response => {
      if (response.status === 422) {
        const detail: unknown = await response.json().catch(() => null)
        if (detail && typeof detail === 'object' && Array.isArray((detail as Record<string, unknown>).missing)) {
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
