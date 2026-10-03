import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import type { Project } from '../../shared/types/project'

function numberValue(value: unknown): number { return typeof value === 'number' ? value : Number(value ?? 0) }

function mapCampaign(value: unknown): Project {
  const data = value as Record<string, unknown>
  const image = data.imageUrl || `/api/files/public/${data.imageId}`
  const status = data.status === 'PUBLISHED' ? 'active' : data.status === 'CLOSED' || data.status === 'FUNDING_ENDED' ? 'finished' : 'cancelled'
  return {
    id: String(data.id), slug: String(data.slug), name: String(data.name), summary: String(data.summary ?? ''), category: String(data.category ?? ''),
    creator: String(data.creator ?? ''), location: String(data.location || 'Bolivia'), image: String(image), imageAlt: `Portada de ${String(data.name)}`,
    goal: numberValue(data.goal), raised: numberValue(data.raised), verified: false, status,
    daysRemaining: data.endsAt ? Math.max(0, Math.ceil((Date.parse(String(data.endsAt)) - Date.now()) / 86400000)) : 0,
    campaignType: String(data.campaignType).toLowerCase() as Project['campaignType'], description: String(data.description ?? ''),
    problem: String(data.problem ?? ''), solution: String(data.solution ?? ''), beneficiaries: String(data.beneficiaries ?? ''),
    impact: Array.isArray(data.impact) ? data.impact as Project['impact'] : [], creatorDescription: String(data.creatorDescription ?? ''),
    trustSignals: [], updates: [], featured: false, publishedAt: String(data.publishedAt ?? ''), endsAt: String(data.endsAt ?? ''),
    imageCaption: 'Imagen pública de la campaña.', rewards: Array.isArray(data.rewards) ? data.rewards as Project['rewards'] : [], isDemo: false
  }
}

export async function listPublicCampaigns(signal?: AbortSignal): Promise<readonly Project[]> {
  const response = await requestApi('/api/campaigns/public', { signal })
  const value = await readJson(response)
  if (!Array.isArray(value)) throw new SessionError(0)
  return value.map(mapCampaign)
}

export async function getPublicCampaign(slug: string, signal?: AbortSignal): Promise<Project | null> {
  try {
    const response = await requestApi(`/api/campaigns/public/${encodeURIComponent(slug)}`, { signal })
    return mapCampaign(await readJson(response))
  } catch (error) {
    if (error instanceof SessionError && error.status === 404) return null
    throw error
  }
}
