import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import type { CampaignType, Project } from '../../shared/types/project'

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
function invalid(): never { throw new SessionError(0) }
function text(value: unknown): string { return typeof value === 'string' ? value : invalid() }
function money(value: unknown, positive = false): number {
  if (!((typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value)) || typeof value === 'number')) invalid()
  const result = Number(value)
  return Number.isFinite(result) && (positive ? result > 0 : result >= 0) ? result : invalid()
}
function date(value: unknown, nullable = false): string {
  if (value === null && nullable) return ''
  const result = text(value)
  return result && Number.isFinite(Date.parse(result)) ? result : invalid()
}
function currency(value: unknown): string { const result = text(value); return /^[A-Z]{3}$/.test(result) ? result : invalid() }
function id(value: unknown): string { const result = text(value); return uuid.test(result) ? result : invalid() }

// Adaptación del mapeo de Alison: datos incompletos no se convierten en cifras o permisos ficticios.
export function mapPublicCampaign(value: unknown): Project {
  if (!object(value) || value.status !== 'PUBLISHED') invalid()
  const name = text(value.name), slug = text(value.slug), imageId = id(value.imageId)
  if (!name.trim() || !slug.trim() || slug.length > 220 || [...slug].some(character => character.charCodeAt(0) < 32 || character === '/' || character === '\\')) invalid()
  const publishedAt = date(value.publishedAt, true), endsAt = date(value.endsAt, true)
  const types: Record<string, CampaignType> = { DONATION: 'donation', REWARD: 'reward', PRESALE: 'presale' }
  if (typeof value.campaignType !== 'string' || !Object.hasOwn(types, value.campaignType)) invalid()
  if (!Array.isArray(value.impact) || !Array.isArray(value.rewards)) invalid()
  const impact = value.impact.map(item => {
    if (!object(item)) invalid()
    return { indicator: text(item.indicator), target: text(item.target) }
  })
  const rewards = value.rewards.map(item => {
    if (!object(item)) invalid()
    return { id: id(item.id), title: text(item.title), description: text(item.description), minAmount: money(item.minAmount, true), currency: currency(item.currency) }
  })
  return {
    id: id(value.id), slug, name, summary: text(value.summary), category: text(value.category),
    creator: text(value.creator), location: text(value.location), image: `/api/files/public/${imageId}`, imageAlt: text(value.imageAlt),
    goal: money(value.goal, true), raised: money(value.raised), currencyCode: currency(value.currencyCode), verified: false, status: 'active',
    daysRemaining: endsAt ? Math.max(0, Math.ceil((Date.parse(endsAt) - Date.now()) / 86400000)) : 0, closingDateKnown: !!endsAt,
    campaignType: types[value.campaignType]!, description: text(value.description), problem: text(value.problem),
    solution: text(value.solution), beneficiaries: text(value.beneficiaries), expectedResults: text(value.expectedResults),
    impact, creatorDescription: text(value.creatorDescription), trustSignals: [], updates: [], featured: false,
    publishedAt, endsAt, imageCaption: 'Imagen pública de la campaña.', rewards, isDemo: false
  }
}
export async function listPublicCampaigns(signal?: AbortSignal): Promise<readonly Project[]> {
  const value = await readJson(await requestApi('/api/campaigns/public', { signal }))
  if (!Array.isArray(value)) invalid()
  return value.map(mapPublicCampaign)
}
export async function getPublicCampaign(slug: string, signal?: AbortSignal): Promise<Project | null> {
  try { return mapPublicCampaign(await readJson(await requestApi(`/api/campaigns/public/${encodeURIComponent(slug)}`, { signal }))) }
  catch (error) {
    if (error instanceof SessionError && error.status === 404) return null
    throw error
  }
}
