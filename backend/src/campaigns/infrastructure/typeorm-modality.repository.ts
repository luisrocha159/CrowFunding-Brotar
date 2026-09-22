import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { CampaignType, FundingModel, ModalityRepository } from '../application/modality'
import { DraftNotEditable } from '../application/drafts'

@Injectable()
export class TypeormModalityRepository implements ModalityRepository {
  constructor(private readonly database: DatabaseService) {}

  async rewardCount(campaignId: string): Promise<number> {
    const rows: { n: string }[] = await this.database.connection().query(
      'SELECT count(*)::text AS n FROM public.reward WHERE campaign_id = $1', [campaignId])
    return Number(rows[0]?.n ?? 0)
  }

  async setModality(
    creatorUserId: string, id: string, campaignType: CampaignType, fundingModel: FundingModel | null
  ): Promise<void> {
    // Solo la modalidad. Las recompensas no se tocan: cambiar de tipo no las descarta.
    // El estado se reafirma en el WHERE para no alterar una campaña que dejó de ser borrador.
    await this.database.connection().transaction(async (manager) => {
      await manager.query('SELECT set_config($1, $2, true)', ['brotar.actor_id', creatorUserId])
      const result: [unknown[], number] = await manager.query(
        `UPDATE public.campaign
            SET campaign_type = $3::campaign_type, funding_model = $4::funding_model, updated_at = now()
          WHERE id = $2 AND creator_user_id = $1 AND status = 'DRAFT' AND deleted_at IS NULL RETURNING id`,
        [creatorUserId, id, campaignType, fundingModel])
      if (result[1] !== 1) throw new DraftNotEditable()
    })
  }
}
