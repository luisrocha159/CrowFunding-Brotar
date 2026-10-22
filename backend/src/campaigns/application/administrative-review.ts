import type { GeneralInput, StorySummary } from './general'
import type { ProjectDetail } from './projects'
import type { BudgetInput, FundingInput, PlanInput, RewardInput } from '../domain/sections'
import type { MissingField } from '../domain/submission'
import { PublicationDisabled, ReviewInvalid, ReviewMissing, validateDecision, validateDuplicateReview, type DecisionInput, type ObservationInput } from '../domain/administrative-review'
import type { DuplicateReport, DuplicateReviewInput } from '../domain/duplication'
import type { InitiativeStage } from '../domain/initiative'

export interface ReviewRound {
  id: string; round: number; decision: string; reviewerName: string | null; summary: string | null
  decidedAt: Date | null; observations: ObservationInput[]
}
export interface AdministrativeDetail {
  project: ProjectDetail; campaignType: string; organizationName: string | null; slug: string
  general: GeneralInput; story: StorySummary; cover: { fileId: string; altText: string } | null
  plan: PlanInput; budget: BudgetInput; funding: FundingInput; rewards: RewardInput[]
  rounds: ReviewRound[]; missing: MissingField[]; publicationEnabled: boolean
  duplication?: DuplicateReport
  initiative?: InitiativeStage | null
}
export interface TransitionResult { id: string; status: string; round: number }
export interface AdministrativeRepository {
  detail(id: string): Promise<AdministrativeDetail | null>
  decide(actorId: string, id: string, input: DecisionInput): Promise<TransitionResult>
  publish(actorId: string, id: string, expectedRound: number, duplicateReview?: DuplicateReviewInput): Promise<TransitionResult>
}
export class AdministrativeReview {
  constructor(private readonly repository: AdministrativeRepository, private readonly canPublish: boolean) {}
  async detail(id: string) {
    const detail = await this.repository.detail(id)
    if (!detail) throw new ReviewMissing()
    return { ...detail, publicationEnabled: this.canPublish }
  }
  decide(actorId: string, id: string, input: DecisionInput) { return this.repository.decide(actorId, id, validateDecision(input)) }
  publish(actorId: string, id: string, expectedRound: number, duplicateReview?: DuplicateReviewInput) {
    if (!this.canPublish) throw new PublicationDisabled()
    if (!Number.isInteger(expectedRound) || expectedRound < 1 || expectedRound > 32767) return Promise.reject(new ReviewInvalid('Actualiza la ronda de revisión.'))
    return this.repository.publish(actorId, id, expectedRound, validateDuplicateReview(duplicateReview))
  }
}
