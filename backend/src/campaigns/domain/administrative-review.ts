import { reviewTarget, type ReviewDecision } from './lifecycle'
import { textError } from './input-policy'
import type { DuplicateReviewInput } from './duplication'

export const REVIEW_SECTIONS = ['general', 'modality', 'story', 'cover', 'plan', 'budget', 'funding', 'rewards'] as const
export interface ObservationInput { section: string; fieldPath: string | null; message: string }
export interface DecisionInput { decision: ReviewDecision; comment: string; expectedRound: number; observations: ObservationInput[]; duplicateReview?: DuplicateReviewInput }
export class ReviewInvalid extends Error {}
export class ReviewConflict extends Error {}
export class ReviewMissing extends Error {}
export class PublicationDisabled extends Error {}

export function validateDuplicateReview(input?: DuplicateReviewInput) {
  if (input && (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)
    || typeof input.reason !== 'string' || textError(input.reason, 20, 2000))) {
    throw new ReviewInvalid('Confirma las coincidencias actuales e indica en 20–2000 caracteres por qué es una iniciativa o etapa distinta.')
  }
  return input && { token: input.token, reason: input.reason.trim() }
}

/** La ronda que leyó el revisor evita decidir sobre un reenvío más reciente. */
export function validateDecision(input: DecisionInput): DecisionInput {
  if (!Number.isInteger(input.expectedRound) || input.expectedRound < 1 || input.expectedRound > 32767) throw new ReviewInvalid('Actualiza la ronda de revisión.')
  try { reviewTarget('IN_REVIEW', input.decision, input.comment) } catch (error) { throw new ReviewInvalid((error as Error).message) }
  if (input.observations.length > 50) throw new ReviewInvalid('Máximo 50 observaciones.')
  if (input.decision !== 'CHANGES_REQUESTED' && input.observations.length) throw new ReviewInvalid('Las observaciones por sección corresponden a una solicitud de cambios.')
  const observations = input.observations.map(item => {
    if (textError(item.message, 5, 5000)) throw new ReviewInvalid('Cada observación requiere entre 5 y 5000 caracteres de texto sin HTML ni controles.')
    if (!(REVIEW_SECTIONS as readonly string[]).includes(item.section) || !item.message.trim() || item.message.includes('\u0000') || [...item.message.trim()].length > 5000
      || (item.fieldPath !== null && (!/^[a-zA-Z][a-zA-Z0-9.[\]]*$/.test(item.fieldPath) || item.fieldPath.length > 160))) throw new ReviewInvalid('Revisa la sección, campo y mensaje de cada observación.')
    return { ...item, message: item.message.trim() }
  })
  const comment = input.comment.trim()
  // El comentario general también aparece en el constructor si no se indican campos concretos.
  if (input.decision === 'CHANGES_REQUESTED' && !observations.length) observations.push({ section: 'general', fieldPath: null, message: comment })
  return { ...input, comment, observations, ...(input.duplicateReview ? { duplicateReview: validateDuplicateReview(input.duplicateReview) } : {}) }
}

/** D05: activación explícita; jamás concede roles ni convierte aprobar en publicar. */
export function publicationEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED !== undefined && !['true', 'false'].includes(env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED)) throw new Error('CAMPAIGN_ADMIN_PUBLICATION_ENABLED debe ser true o false.')
  return env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED === 'true'
}
