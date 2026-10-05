import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../access/session/sessionClient'
import { projectDetailFrom, type ProjectDetail } from './projectsClient'
import { budgetFrom, fundingFrom, planFrom, rewardsFrom, type BudgetInput, type FundingInput, type PlanInput, type RewardInput } from './sectionsClient'
import type { GeneralInput, IndicatorInput, StoryInput } from './campaignsClient'
import type { MissingField } from './submissionClient'

export const reviewSections = { general: 'Información general', modality: 'Modalidad', story: 'Historia e impacto', cover: 'Portada', plan: 'Plan', budget: 'Presupuesto y riesgos', funding: 'Financiamiento', rewards: 'Recompensas' }
export type Decision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'
export interface Observation { section: string; fieldPath: string | null; message: string }
export interface DecisionInput { decision: Decision; comment: string; expectedRound: number; observations: Observation[] }
export interface ReviewRound { id: string; round: number; decision: string; reviewerName: string | null; summary: string | null; decidedAt: string | null; observations: Observation[] }
export interface AdministrativeDetail {
  project: ProjectDetail; campaignType: string; organizationName: string | null; slug: string
  general: GeneralInput; story: { story: StoryInput; indicators: IndicatorInput[] }; cover: { fileId: string; altText: string } | null
  plan: PlanInput; budget: BudgetInput; funding: FundingInput; rewards: RewardInput[]; rounds: ReviewRound[]; missing: MissingField[]; publicationEnabled: boolean
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const texts = (value: unknown, keys: string[]) => object(value) && keys.every(key => typeof value[key] === 'string')
const optionalText = (value: unknown) => value === null || typeof value === 'string'
const optionalNumber = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value))
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
function observation(value: unknown) { return texts(value, ['section', 'message']) && object(value) && optionalText(value.fieldPath) && (value.section as string).length > 0 && (value.section as string).length <= 80 }

export function administrativeDetailFrom(value: unknown): AdministrativeDetail {
  if (!object(value) || !['DONATION', 'REWARD', 'PRESALE'].includes(value.campaignType as string)
    || !optionalText(value.organizationName) || typeof value.slug !== 'string' || !/^[a-z0-9-]+$/.test(value.slug)
    || typeof value.publicationEnabled !== 'boolean'
    || !(value.cover === null || texts(value.cover, ['fileId', 'altText']))
    || !texts(value.general, ['title', 'summary']) || !object(value.general) || !optionalText(value.general.categoryId)
    || !texts(value.general.location, ['locality', 'addressLine', 'reference']) || !object(value.general.location) || !optionalText(value.general.location.countryCode)
    || !object(value.story) || !texts(value.story.story, ['problem', 'solution', 'beneficiaries', 'expectedResults'])
    || !Array.isArray(value.story.indicators) || !value.story.indicators.every(item => texts(item, ['name', 'description', 'unit']) && object(item) && optionalNumber(item.baselineValue) && optionalNumber(item.targetValue))
    || !Array.isArray(value.rounds) || !value.rounds.every(row => object(row) && typeof row.id === 'string' && Number.isInteger(row.round) && Number(row.round) > 0
      && ['PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(row.decision as string) && optionalText(row.reviewerName) && optionalText(row.summary)
      && (row.decidedAt === null || date(row.decidedAt)) && Array.isArray(row.observations) && row.observations.every(observation))
    || !Array.isArray(value.missing) || !value.missing.every(item => texts(item, ['field', 'label']) && object(item) && Number.isInteger(item.step) && Number(item.step) >= 0 && Number(item.step) <= 7)) throw new SessionError(0)
  return { ...value, project: projectDetailFrom(value.project), plan: planFrom(value.plan), budget: budgetFrom(value.budget), funding: fundingFrom(value.funding), rewards: rewardsFrom({ rewards: value.rewards }) } as unknown as AdministrativeDetail
}
export function decisionErrors(input: DecisionInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(input.decision)) errors.decision = 'Selecciona una decisión válida.'
  if (input.decision !== 'APPROVED' && !input.comment.trim()) errors.comment = 'Indica el motivo o los cambios solicitados.'
  if ([...input.comment.trim()].length > 5000) errors.comment = 'Máximo 5000 caracteres.'
  if (input.comment.includes('\u0000')) errors.comment = 'El comentario contiene un carácter de control no admitido.'
  if (!Number.isInteger(input.expectedRound) || input.expectedRound < 1 || input.expectedRound > 32767) errors.round = 'Actualiza la revisión.'
  if (input.observations.length > 50 || (input.decision !== 'CHANGES_REQUESTED' && input.observations.length)) errors.observations = 'Las observaciones corresponden a cambios solicitados; máximo 50.'
  input.observations.forEach((item, index) => {
    if (!Object.hasOwn(reviewSections, item.section) || !item.message.trim() || item.message.includes('\u0000') || [...item.message.trim()].length > 5000
      || (item.fieldPath !== null && (!/^[a-zA-Z][a-zA-Z0-9.[\]]*$/.test(item.fieldPath) || item.fieldPath.length > 160))) errors[`observations.${index}`] = 'Indica una sección y un mensaje válido.'
  })
  return errors
}
export async function readAdministrativeDetail(id: string, signal?: AbortSignal, send?: typeof fetch) {
  return administrativeDetailFrom(await readJson(await requestApi(`/api/admin/campaigns/${encodeURIComponent(id)}/detail`, { signal }, send)))
}
function transitionFrom(value: unknown, id: string, status: string, round: number) {
  if (!object(value) || value.id !== id || value.status !== status || value.round !== round) throw new SessionError(0)
  return value as { id: string; status: string; round: number }
}
export async function decideCampaign(id: string, input: DecisionInput, signal?: AbortSignal, send?: typeof fetch) {
  if (Object.keys(decisionErrors(input)).length) throw new SessionError(400)
  return transitionFrom(await readJson(await requestApi(`/api/admin/campaigns/${encodeURIComponent(id)}/decision`, { method: 'POST', body: input, signal }, send)), id, input.decision, input.expectedRound)
}
export async function publishCampaign(id: string, expectedRound: number, signal?: AbortSignal, send?: typeof fetch) {
  if (!Number.isInteger(expectedRound) || expectedRound < 1 || expectedRound > 32767) throw new SessionError(400)
  return transitionFrom(await readJson(await requestApi(`/api/admin/campaigns/${encodeURIComponent(id)}/publish`, { method: 'POST', body: { confirmed: true, expectedRound }, signal }, send)), id, 'PUBLISHED', expectedRound)
}
