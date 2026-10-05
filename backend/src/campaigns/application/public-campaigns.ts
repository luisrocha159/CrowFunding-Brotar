// Adaptación de S2-16 de Alison: el caso de uso no depende de NestJS ni de SQL.
export interface PublicCampaign {
  id: string; slug: string; name: string; summary: string; category: string; location: string; creator: string
  campaignType: string; status: 'PUBLISHED'; goal: string; raised: string; currencyCode: string
  publishedAt: Date | null; endsAt: Date | null; imageId: string; imageUrl: string; imageAlt: string
  description: string; problem: string; solution: string; beneficiaries: string; expectedResults: string; creatorDescription: string
  impact: { indicator: string; target: string }[]
  rewards: { id: string; title: string; description: string; minAmount: string; currency: string }[]
}
export interface PublicCampaignRepository { list(slug?: string): Promise<PublicCampaign[]> }
export class PublicCampaignMissing extends Error {}
export class PublicCampaigns {
  constructor(private readonly repository: PublicCampaignRepository) {}
  list() { return this.repository.list() }
  async find(slug: string) {
    if (!slug || slug.length > 220 || [...slug].some(character => character.charCodeAt(0) < 32 || character === '/' || character === '\\')) throw new PublicCampaignMissing()
    const [campaign] = await this.repository.list(slug)
    if (!campaign) throw new PublicCampaignMissing()
    return campaign
  }
}
