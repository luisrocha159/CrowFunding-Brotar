/** Contrato Fase 3. No publica automáticamente ni decide quién puede publicar (D05). */
export const PHASE3_STATUSES = ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED'] as const
export type Phase3Status = typeof PHASE3_STATUSES[number]
export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'

export function reviewTarget(current: string, decision: ReviewDecision, comment: string): Phase3Status {
  if (current !== 'IN_REVIEW') throw new Error('Solo se decide sobre campañas en revisión.')
  if (!['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(decision)) throw new Error('Decisión no disponible.')
  if (decision !== 'APPROVED' && !comment.trim()) throw new Error('Indica el motivo o los cambios solicitados.')
  if ([...comment.trim()].length > 5000) throw new Error('El comentario admite hasta 5000 caracteres.')
  return decision
}

/** Filtrado público independiente de permisos: aprobar nunca significa publicar. */
export function isPublicCampaign(status: string): boolean { return status === 'PUBLISHED' }
export function canDiscardCampaign(status: string): boolean { return status === 'DRAFT' }
