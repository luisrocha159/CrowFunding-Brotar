export type CampaignType = 'donation' | 'reward' | 'presale'
export type CampaignStatus = 'active' | 'finished' | 'cancelled'

export const campaignTypeLabels: Record<CampaignType, string> = {
  donation: 'Donación', reward: 'Recompensa', presale: 'Preventa'
}

export type ProjectCardData = Readonly<{
  slug: string
  name: string
  summary: string
  category: string
  creator: string
  location: string
  image: string
  imageAlt: string
  goal: number
  raised: number
  verified: boolean
  status: CampaignStatus
  daysRemaining: number
}>

/** Public demonstration data only: no identities, payments or private documents. */
export type Project = ProjectCardData & Readonly<{
  id: string
  campaignType: CampaignType
  description: string
  problem: string
  solution: string
  beneficiaries: string
  impact: readonly Readonly<{ indicator: string; target: string }>[]
  creatorDescription: string
  trustSignals: readonly string[]
  updates: readonly Readonly<{ id: string; date: string; title: string; content: string }>[]
  featured: boolean
  publishedAt: string
  endsAt: string
  statusReason?: string
  imageCaption: string
  isDemo: true
}>
