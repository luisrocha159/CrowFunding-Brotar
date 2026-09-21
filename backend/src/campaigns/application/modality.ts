import { allowsBuilderEditing } from '../domain/draft'
import {
  isFundingModel, isValidModalityChange, needsRewardAcknowledgement, requiresRewards,
  type CampaignType, type FundingModel
} from '../domain/modality'
import { DraftNotEditable, DraftNotFound, type DraftRepository } from './drafts'
export type { CampaignType, FundingModel } from '../domain/modality'

export class ModalityInvalid extends Error {}
/** Hay recompensas cargadas y el cambio las dejaría sin aplicar: exige reconocerlo. */
export class ModalityDiscardsRewards extends Error {
  constructor(readonly rewardCount: number) { super() }
}

export interface ModalitySummary {
  campaignType: CampaignType
  fundingModel: FundingModel | null
  /** Si la etapa de recompensas aplica a la modalidad actual (BG-15 CA 2). */
  rewardsApply: boolean
  rewardCount: number
}

export interface ModalityRepository {
  rewardCount(campaignId: string): Promise<number>
  setModality(creatorUserId: string, id: string, campaignType: CampaignType, fundingModel: FundingModel | null): Promise<void>
}

export class Modalities {
  constructor(
    private readonly drafts: DraftRepository,
    private readonly repository: ModalityRepository
  ) {}

  private async own(creatorUserId: string, id: string) {
    const draft = await this.drafts.findOwn(creatorUserId, id)
    if (!draft) throw new DraftNotFound()
    return draft
  }

  async read(creatorUserId: string, id: string): Promise<ModalitySummary> {
    const draft = await this.own(creatorUserId, id)
    return {
      campaignType: draft.campaignType,
      fundingModel: null,
      rewardsApply: requiresRewards(draft.campaignType),
      rewardCount: await this.repository.rewardCount(id)
    }
  }

  /**
   * Guarda la modalidad conservándola durante el asistente. Si el cambio dejaría
   * recompensas sin aplicar, se rechaza hasta que el creador lo reconozca; las
   * recompensas no se borran ni se desactivan en ningún caso.
   */
  async change(
    creatorUserId: string, id: string, to: string, fundingModel: string | null, acknowledged: boolean
  ): Promise<ModalitySummary> {
    if (!isValidModalityChange(to)) throw new ModalityInvalid()
    if (fundingModel !== null && !isFundingModel(fundingModel)) throw new ModalityInvalid()

    const draft = await this.own(creatorUserId, id)
    if (!allowsBuilderEditing(draft.status)) throw new DraftNotEditable()

    const rewardCount = await this.repository.rewardCount(id)
    if (!acknowledged && needsRewardAcknowledgement(draft.campaignType, to, rewardCount)) {
      throw new ModalityDiscardsRewards(rewardCount)
    }

    await this.repository.setModality(creatorUserId, id, to, fundingModel as FundingModel | null)
    return {
      campaignType: to,
      fundingModel: fundingModel as FundingModel | null,
      rewardsApply: requiresRewards(to),
      rewardCount
    }
  }
}
