import { SessionError } from '../access/session/sessionClient'
import { readJson, requestApi } from '../../shared/api/request'

export const CAMPAIGN_TYPES = ['DONATION', 'REWARD', 'PRESALE'] as const
export type CampaignType = typeof CAMPAIGN_TYPES[number]

export interface DraftInput {
  title: string
  summary: string
  campaignType: CampaignType
  categoryId: string | null
  organizationId: string | null
}

export interface Draft extends Omit<DraftInput, 'summary'> {
  id: string
  summary: string | null
  status: string
  builderStep: number
  totalSteps: number
}

export interface Category { id: string; name: string; slug: string }

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

const isCampaignType = (value: unknown): value is CampaignType =>
  typeof value === 'string' && CAMPAIGN_TYPES.some((type) => type === value)

/**
 * Errores por campo devueltos por la API como `campo: mensaje` (BG-16 CA 2).
 * Se reconstruye el mapa para poder mostrarlos junto a cada entrada del formulario.
 */
export function fieldErrorsFrom(message: unknown): Record<string, string> {
  if (!Array.isArray(message)) return {}
  const errors: Record<string, string> = {}
  for (const entry of message) {
    if (typeof entry !== 'string') continue
    const separator = entry.indexOf(': ')
    if (separator > 0) errors[entry.slice(0, separator)] = entry.slice(separator + 2)
  }
  return errors
}

/**
 * Error de validación con los mensajes por campo que devuelve la API. Extiende
 * SessionError para que las vistas que solo miran `status` sigan funcionando.
 */
export class DraftFieldError extends SessionError {
  constructor(readonly fields: Record<string, string>) { super(400) }
}

async function request(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await requestApi(`/api/${path}`, {
    method, body, signal,
    errorFromResponse: async response => {
      if (response.status === 400) {
        // El contrato de errores devuelve message como lista de "campo: mensaje".
        const detail: unknown = await response.json().catch(() => null)
        const fields = fieldErrorsFrom(object(detail) ? detail.message : null)
        if (Object.keys(fields).length > 0) return new DraftFieldError(fields)
      }
      return new SessionError(response.status)
    }
  })
  return readJson(response)
}

/** Un borrador incompleto no se muestra como si estuviera bien: se trata como fallo. */
function draft(value: unknown): Draft {
  if (!object(value)
    || typeof value.id !== 'string' || typeof value.title !== 'string'
    || typeof value.status !== 'string' || !isCampaignType(value.campaignType)
    || typeof value.builderStep !== 'number' || typeof value.totalSteps !== 'number'
    || !(value.summary === null || typeof value.summary === 'string')
    || !(value.categoryId === null || typeof value.categoryId === 'string')
    || !(value.organizationId === null || typeof value.organizationId === 'string')) {
    throw new SessionError(0)
  }
  return {
    id: value.id, title: value.title, summary: value.summary as string | null,
    campaignType: value.campaignType, categoryId: value.categoryId as string | null,
    organizationId: value.organizationId as string | null, status: value.status,
    builderStep: value.builderStep, totalSteps: value.totalSteps
  }
}

function payload(input: DraftInput) {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    campaignType: input.campaignType,
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.organizationId ? { organizationId: input.organizationId } : {})
  }
}

export async function myDrafts(signal?: AbortSignal): Promise<Draft[]> {
  const data = await request('campaigns/drafts', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new SessionError(0)
  // La lista no trae totalSteps; se completa al abrir el borrador.
  return data.map((item) => draft({ totalSteps: 0, ...(object(item) ? item : {}) }))
}

export async function readDraft(id: string, signal?: AbortSignal): Promise<Draft> {
  return draft(await request(`campaigns/drafts/${id}`, 'GET', undefined, signal))
}

export async function createDraft(input: DraftInput, signal?: AbortSignal): Promise<Draft> {
  return draft(await request('campaigns/drafts', 'POST', payload(input), signal))
}

export async function saveDraft(id: string, input: DraftInput, builderStep: number, signal?: AbortSignal): Promise<Draft> {
  return draft(await request(`campaigns/drafts/${id}`, 'PUT', { ...payload(input), builderStep }, signal))
}

export async function activeCategories(signal?: AbortSignal): Promise<Category[]> {
  const data = await request('catalogs/categories', 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new SessionError(0)
  return data.map((item) => {
    if (!object(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.slug !== 'string') {
      throw new SessionError(0)
    }
    return { id: item.id, name: item.name, slug: item.slug }
  })
}

export function validateDraft(input: DraftInput): Partial<Record<keyof DraftInput, string>> {
  const errors: Partial<Record<keyof DraftInput, string>> = {}
  const title = [...input.title.trim()].length
  if (!title || title > 200) errors.title = 'Escribe entre 1 y 200 caracteres.'
  if ([...input.summary.trim()].length > 500) errors.summary = 'El resumen admite hasta 500 caracteres.'
  if (!CAMPAIGN_TYPES.some((type) => type === input.campaignType)) errors.campaignType = 'Elige una modalidad disponible.'
  return errors
}

/**
 * Misma regla que la API (BG-18 CA 3): se avanza de uno en uno y se retrocede libremente.
 * Duplicarla aquí evita ofrecer un botón que el servidor va a rechazar; la autoridad
 * sigue siendo la API.
 */
export function canMoveTo(current: number, next: number, totalSteps: number): boolean {
  return Number.isInteger(next) && next >= 0 && next < totalSteps && next <= current + 1
}

export const FUNDING_MODELS = ['ALL_OR_NOTHING', 'FLEXIBLE'] as const
export type FundingModel = typeof FUNDING_MODELS[number]

export interface Modality {
  campaignType: CampaignType
  fundingModel: FundingModel | null
  /** Si la etapa de recompensas aplica; en donación se omite (BG-15 CA 2). */
  rewardsApply: boolean
  rewardCount: number
}

function modality(value: unknown): Modality {
  if (!object(value) || !isCampaignType(value.campaignType)
    || typeof value.rewardsApply !== 'boolean' || typeof value.rewardCount !== 'number'
    || !(value.fundingModel === null || (typeof value.fundingModel === 'string'
      && FUNDING_MODELS.some((model) => model === value.fundingModel)))) {
    throw new SessionError(0)
  }
  return {
    campaignType: value.campaignType,
    fundingModel: value.fundingModel as FundingModel | null,
    rewardsApply: value.rewardsApply,
    rewardCount: value.rewardCount
  }
}

export async function readModality(id: string, signal?: AbortSignal): Promise<Modality> {
  return modality(await request(`campaigns/drafts/${id}/modality`, 'GET', undefined, signal))
}

/**
 * Cambiar de modalidad. Si hay recompensas cargadas que dejarían de aplicar, la API
 * responde 409 hasta que el creador lo reconozca: nunca se descartan en silencio.
 */
export async function changeModality(
  id: string, campaignType: CampaignType, fundingModel: FundingModel | null,
  acknowledgeRewards = false, signal?: AbortSignal
): Promise<Modality> {
  return modality(await request(`campaigns/drafts/${id}/modality`, 'PUT', {
    campaignType,
    ...(fundingModel ? { fundingModel } : {}),
    ...(acknowledgeRewards ? { acknowledgeRewards: true } : {})
  }, signal))
}

/** Límites del esquema oficial; la API los publica y el asistente los muestra. */
export interface Limits { title: number; summary: number; locality: number; addressLine: number; reference: number }

export interface LocationInput { countryCode: string | null; locality: string; addressLine: string; reference: string }
export interface GeneralInput { title: string; summary: string; categoryId: string | null; location: LocationInput }
export interface IndicatorInput {
  name: string; description: string; unit: string
  baselineValue: number | null
  /** Meta esperada. El asistente nunca declara resultados ya conseguidos. */
  targetValue: number | null
}
export interface StoryInput { problem: string; solution: string; beneficiaries: string; expectedResults: string }

const nullableString = (value: unknown) => value === null || typeof value === 'string'
const nullableNumber = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value))
const stringFields = (value: Record<string, unknown>, keys: string[]) => keys.every(key => typeof value[key] === 'string')
export const STORY_LIMITS = { text: 5000, indicatorName: 200, unit: 60, indicators: 20 } as const

export function validateStoryInput(story: StoryInput, indicators: IndicatorInput[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of ['problem', 'solution', 'beneficiaries', 'expectedResults'] as const) {
    if ([...story[key].trim()].length > STORY_LIMITS.text) errors[key] = `Admite hasta ${STORY_LIMITS.text} caracteres.`
  }
  if (indicators.length > STORY_LIMITS.indicators) errors.indicators = `Máximo ${STORY_LIMITS.indicators} indicadores.`
  indicators.forEach((item, index) => {
    const prefix = `indicators.${index}.`
    if (!item.name.trim() || [...item.name.trim()].length > STORY_LIMITS.indicatorName) errors[prefix + 'name'] = 'Usa entre 1 y 200 caracteres.'
    if ([...item.description.trim()].length > STORY_LIMITS.text) errors[prefix + 'description'] = 'Usa hasta 5000 caracteres.'
    if ([...item.unit.trim()].length > STORY_LIMITS.unit || (item.targetValue !== null && !item.unit.trim())) errors[prefix + 'unit'] = 'Indica la unidad con hasta 60 caracteres.'
    for (const field of ['baselineValue', 'targetValue'] as const) {
      const value = item[field]
      if (value !== null && (!Number.isFinite(value) || Math.abs(value) > 999999999999.99 || value !== Number(value.toFixed(2)))) {
        errors[prefix + field] = 'Usa un número entre -999999999999.99 y 999999999999.99 con hasta dos decimales.'
      }
    }
  })
  return errors
}

export async function readGeneral(id: string, signal?: AbortSignal): Promise<GeneralInput & { limits: Limits }> {
  const data = await request(`campaigns/drafts/${id}/general`, 'GET', undefined, signal)
  if (!object(data) || !object(data.location) || !object(data.limits)
    || !stringFields(data, ['title', 'summary']) || !nullableString(data.categoryId)
    || !nullableString(data.location.countryCode) || !stringFields(data.location, ['locality', 'addressLine', 'reference'])) throw new SessionError(0)
  const limits = data.limits
  if (!['title', 'summary', 'locality', 'addressLine', 'reference'].every(key =>
    typeof limits[key] === 'number' && Number.isInteger(limits[key]) && limits[key] > 0)) throw new SessionError(0)
  return data as unknown as GeneralInput & { limits: Limits }
}

export async function saveGeneral(id: string, input: GeneralInput, signal?: AbortSignal): Promise<void> {
  await request(`campaigns/drafts/${id}/general`, 'PUT', {
    title: input.title.trim(),
    summary: input.summary.trim(),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    location: {
      ...(input.location.countryCode ? { countryCode: input.location.countryCode } : {}),
      locality: input.location.locality.trim(),
      addressLine: input.location.addressLine.trim(),
      reference: input.location.reference.trim()
    }
  }, signal)
}

export async function readStory(id: string, signal?: AbortSignal): Promise<{ story: StoryInput; indicators: IndicatorInput[] }> {
  const data = await request(`campaigns/drafts/${id}/story`, 'GET', undefined, signal)
  if (!object(data) || !object(data.story) || !Array.isArray(data.indicators)
    || !stringFields(data.story, ['problem', 'solution', 'beneficiaries', 'expectedResults'])
    || !data.indicators.every(item => object(item) && stringFields(item, ['name', 'description', 'unit'])
      && nullableNumber(item.baselineValue) && nullableNumber(item.targetValue))) throw new SessionError(0)
  return data as unknown as { story: StoryInput; indicators: IndicatorInput[] }
}

export async function saveStory(id: string, story: StoryInput, indicators: IndicatorInput[], signal?: AbortSignal): Promise<void> {
  const errors = validateStoryInput(story, indicators)
  if (Object.keys(errors).length) throw new DraftFieldError(errors)
  await request(`campaigns/drafts/${id}/story`, 'PUT', {
    problem: story.problem.trim(), solution: story.solution.trim(),
    beneficiaries: story.beneficiaries.trim(), expectedResults: story.expectedResults.trim(),
    // achievedValue no se envía nunca: el asistente declara metas, no resultados ejecutados.
    indicators: indicators.map((indicator) => ({
      name: indicator.name.trim(), description: indicator.description.trim(), unit: indicator.unit.trim(),
      ...(indicator.baselineValue === null ? {} : { baselineValue: indicator.baselineValue }),
      ...(indicator.targetValue === null ? {} : { targetValue: indicator.targetValue })
    }))
  }, signal)
}
