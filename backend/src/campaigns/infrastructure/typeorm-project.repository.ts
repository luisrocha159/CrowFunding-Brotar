import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { ProjectConflict, ProjectMissing, type ProjectDetail, type ProjectRepository, type ProjectSummary } from '../application/projects'

const SUMMARY = `SELECT c.id, c.title, c.summary, c.status, cat.name AS "categoryName",
  c.goal_amount::text AS "goalAmount", c.currency_code AS "currencyCode",
  c.updated_at AS "updatedAt", c.submitted_at AS "submittedAt",
  concat_ws(' ', p.first_name, p.last_name) AS "creatorName"
  FROM public.campaign c
  LEFT JOIN public.category cat ON cat.id=c.category_id
  LEFT JOIN public.user_profile p ON p.user_id=c.creator_user_id`

@Injectable()
export class TypeormProjectRepository implements ProjectRepository {
  constructor(private readonly database: DatabaseService) {}
  listOwn(userId: string): Promise<ProjectSummary[]> {
    return this.database.connection().query(`${SUMMARY}
      WHERE c.creator_user_id=$1 AND c.deleted_at IS NULL ORDER BY c.updated_at DESC, c.id`, [userId])
  }
  reviewQueue(): Promise<ProjectSummary[]> {
    // PENDING_VERIFICATION no se equipara a revisión: KYC queda fuera de esta cola.
    return this.database.connection().query(`${SUMMARY}
      WHERE c.status='IN_REVIEW' AND c.deleted_at IS NULL ORDER BY c.submitted_at ASC NULLS LAST, c.id`)
  }
  findOwn(userId: string, id: string) {
    return this.detail(`${SUMMARY} WHERE c.id=$1 AND c.creator_user_id=$2 AND c.deleted_at IS NULL`, [id, userId])
  }
  findForReview(id: string) {
    return this.detail(`${SUMMARY} WHERE c.id=$1 AND c.status='IN_REVIEW' AND c.deleted_at IS NULL`, [id])
  }
  private async detail(sql: string, parameters: string[]): Promise<ProjectDetail | null> {
    // Una transacción de lectura conserva un único corte entre cabecera, historia e historial.
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const summaries: ProjectSummary[] = await manager.query(sql, parameters)
      if (!summaries[0]) return null
      const id = parameters[0]
      const locations: ProjectDetail['location'][] = await manager.query(
        'SELECT locality, country_code AS "countryCode" FROM public.campaign_location WHERE campaign_id=$1', [id])
      const stories: ProjectDetail['story'][] = await manager.query(
        'SELECT problem, solution, beneficiaries, expected_results AS "expectedResults" FROM public.campaign_story WHERE campaign_id=$1', [id])
      const history: ProjectDetail['history'] = await manager.query(
        `SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_at AS "changedAt", reason
         FROM public.status_history WHERE entity_type='CAMPAIGN' AND entity_id=$1 ORDER BY changed_at, id`, [id])
      return { ...summaries[0], location: locations[0] ?? null, story: stories[0] ?? null, history }
    })
  }
  async discardOwn(userId: string, id: string): Promise<void> {
    await this.database.connection().transaction(async manager => {
      const rows: { status: string }[] = await manager.query(
        `SELECT status FROM public.campaign WHERE id=$1 AND creator_user_id=$2 AND deleted_at IS NULL FOR UPDATE`, [id, userId])
      if (!rows[0]) throw new ProjectMissing()
      if (rows[0].status !== 'DRAFT') throw new ProjectConflict()
      await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', userId])
      // Descarte lógico: conserva relaciones y archivos; no se concede DELETE a la aplicación.
      await manager.query(`UPDATE public.campaign SET deleted_at=now(), updated_at=now()
        WHERE id=$1 AND creator_user_id=$2 AND status='DRAFT' AND deleted_at IS NULL`, [id, userId])
      await manager.query(`INSERT INTO public.status_history(entity_type,entity_id,from_status,to_status,changed_by,reason,metadata)
        VALUES('CAMPAIGN',$1,'DRAFT','DRAFT',$2,'Borrador descartado por su creador','{"action":"DISCARD_DRAFT"}'::jsonb)`, [id, userId])
    })
  }
}
