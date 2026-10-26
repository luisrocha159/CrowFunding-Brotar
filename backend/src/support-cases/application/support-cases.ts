import { normalizeSupportInput, supportId, supportPage, SupportInvalid, type SupportInput, type SupportStatus } from '../domain/support-case'
export class SupportMissing extends Error {}
export class SupportForbidden extends Error {}
export class SupportCampaignClosed extends Error {}
export interface SupportContext { campaignId: string; campaignTitle: string; contributionId: string | null; contributionReference: string | null }
export interface SupportSummary { id: string; reference: string; category: string | null; subject: string; status: SupportStatus; createdAt: string; updatedAt: string; campaignId: string | null; contributionId: string | null }
export interface SupportDetail extends SupportSummary { description: string; evidence: { fileId: string; name: string; mimeType: string }[]; messages: { id: string; body: string; createdAt: string; from: 'you' | 'support' }[] }
export interface SupportPage { items: SupportSummary[]; total: number; page: number; pageSize: 20 }
export interface SupportReceipt { id: string; reference: string; status: SupportStatus; createdAt: string }
export interface SupportRepository {
  list(userId: string, page: number): Promise<SupportPage>
  detail(userId: string, id: string): Promise<SupportDetail | null>
  context(userId: string, campaignId: string | null, contributionId: string | null): Promise<SupportContext | null>
  create(userId: string, input: SupportInput): Promise<SupportReceipt>
}
export class SupportCases {
  constructor(private readonly repository: SupportRepository) {}
  list(userId: string, page: unknown) { return this.repository.list(userId, supportPage(page)) }
  async detail(userId: string, id: string): Promise<SupportDetail> {
    if (!supportId(id)) throw new SupportInvalid()
    const result = await this.repository.detail(userId, id)
    if (!result) throw new SupportMissing()
    return result
  }
  async context(userId: string, campaignId?: string, contributionId?: string): Promise<SupportContext> {
    if ((!campaignId && !contributionId) || (campaignId && !supportId(campaignId)) || (contributionId && !supportId(contributionId))) throw new SupportInvalid()
    const result = await this.repository.context(userId, campaignId ?? null, contributionId ?? null)
    if (!result) throw new SupportMissing()
    return result
  }
  async create(userId: string, input: unknown) { return this.repository.create(userId, normalizeSupportInput(input)) }
}
