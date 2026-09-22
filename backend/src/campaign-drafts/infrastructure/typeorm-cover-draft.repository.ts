import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { CampaignCoverUnavailable, type CampaignCoverDraft, type CoverDraftRepository } from '../application/cover-draft'

@Injectable()
export class TypeormCoverDraftRepository implements CoverDraftRepository {
  constructor(private readonly database: DatabaseService) {}

  async read(ownerUserId: string, campaignId: string): Promise<CampaignCoverDraft | null> {
    const rows = await this.database.connection().query(`
      SELECT c.cover_file_id AS "fileId", c.updated_at AS "updatedAt", a.caption AS "altText"
      FROM public.campaign c
      LEFT JOIN public.file_attachment a ON a.campaign_id=c.id AND a.file_id=c.cover_file_id AND a.attachment_role='COVER'
      WHERE c.id=$1 AND c.creator_user_id=$2 AND c.deleted_at IS NULL`, [campaignId, ownerUserId]) as { fileId: string | null; updatedAt: Date; altText: string | null }[]
    const row = rows[0]
    if (!row) throw new CampaignCoverUnavailable()
    return row.fileId ? { campaignId, ownerUserId, fileId: row.fileId, altText: row.altText ?? '', imageUrl: `/api/files/public/${row.fileId}`, updatedAt: row.updatedAt.toISOString() } : null
  }

  async save(input: CampaignCoverDraft): Promise<CampaignCoverDraft> {
    await this.database.connection().transaction(async manager => {
      const owned: unknown[] = await manager.query(`SELECT id FROM public.campaign
        WHERE id=$1 AND creator_user_id=$2 AND status='DRAFT' AND deleted_at IS NULL FOR UPDATE`, [input.campaignId, input.ownerUserId])
      if (!owned.length) throw new CampaignCoverUnavailable()
      const files: unknown[] = await manager.query(`SELECT id FROM public.file_asset WHERE id=$1 AND uploaded_by=$2
        AND scope='PUBLIC' AND storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%' AND deleted_at IS NULL FOR UPDATE`, [input.fileId, input.ownerUserId])
      if (!files.length) throw new CampaignCoverUnavailable()
      await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', input.ownerUserId])
      await manager.query('UPDATE public.campaign SET cover_file_id=$2, updated_at=now() WHERE id=$1', [input.campaignId, input.fileId])
      await manager.query("DELETE FROM public.file_attachment WHERE campaign_id=$1 AND attachment_role='COVER'", [input.campaignId])
      await manager.query(`INSERT INTO public.file_attachment(file_id,campaign_id,attachment_role,caption)
        VALUES($1,$2,'COVER',$3)`, [input.fileId, input.campaignId, input.altText])
    })
    return input
  }
}
