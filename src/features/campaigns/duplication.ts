import type { DuplicateReport, DuplicateReviewInput } from '../../../backend/src/campaigns/domain/duplication'
import { textError } from '../../../backend/src/campaigns/domain/input-policy'
export type { DuplicateReport, DuplicateReviewInput }

export function validDuplicateReport(value: unknown): value is DuplicateReport {
  if (!value || typeof value !== 'object') return false
  const report = value as DuplicateReport
  return Array.isArray(report.matches) && report.matches.every(match => match && typeof match === 'object'
    && typeof match.id === 'string' && /^[a-f0-9-]{36}$/i.test(match.id) && typeof match.title === 'string'
    && typeof match.status === 'string' && ['COPY', 'POSSIBLE'].includes(match.kind)
    && Array.isArray(match.reasons) && match.reasons.length > 0 && match.reasons.every(reason => typeof reason === 'string'))
    && (report.matches.length === 0 ? report.reviewToken === null : typeof report.reviewToken === 'string' && /^[a-f0-9]{64}$/.test(report.reviewToken))
}

export function duplicateReviewError(input: DuplicateReviewInput): string | undefined {
  return !/^[a-f0-9]{64}$/.test(input.token) ? 'Actualiza las coincidencias antes de confirmar.'
    : textError(input.reason, 20, 2000)
}
