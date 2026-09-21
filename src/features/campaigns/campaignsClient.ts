import { SessionError } from '../access/session/sessionClient'

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

async function request(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, signal?: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(`/api/${path}`, {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', ...(method === 'GET' ? {} : { 'X-Brotar-Request': '1' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new SessionError(response.status)
    return await response.json()
  } catch (error) {
    throw error instanceof SessionError ? error : new SessionError(0)
  }
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
  if ([...input.summary.trim()].length > 300) errors.summary = 'El resumen admite hasta 300 caracteres.'
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
