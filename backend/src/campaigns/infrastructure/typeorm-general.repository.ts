import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { EntityManager } from 'typeorm'
import type { GeneralInput, GeneralRepository, Indicator, IndicatorInput, StoryInput, StorySummary } from '../application/general'
import { DraftNotEditable } from '../application/drafts'

const EMPTY_STORY: StoryInput = { problem: '', solution: '', beneficiaries: '', expectedResults: '' }

@Injectable()
export class TypeormGeneralRepository implements GeneralRepository {
  constructor(private readonly database: DatabaseService) {}

  async readGeneral(campaignId: string): Promise<GeneralInput> {
    const rows: {
      title: string; summary: string | null; categoryId: string | null
      countryCode: string | null; locality: string | null; addressLine: string | null; reference: string | null
    }[] = await this.database.connection().query(
      `SELECT c.title, c.summary, c.category_id AS "categoryId",
              l.country_code AS "countryCode", l.locality, l.address_line AS "addressLine", l.reference
         FROM public.campaign c
         LEFT JOIN public.campaign_location l ON l.campaign_id = c.id
        WHERE c.id = $1`, [campaignId])
    const row = rows[0]
    if (!row) throw new Error('No se pudo leer la información general.')
    return {
      title: row.title, summary: row.summary ?? '', categoryId: row.categoryId,
      location: {
        countryCode: row.countryCode?.trim() || null,
        locality: row.locality ?? '', addressLine: row.addressLine ?? '', reference: row.reference ?? ''
      }
    }
  }

  async countryExists(code: string): Promise<boolean> {
    const rows: { code: string }[] = await this.database.connection().query(
      'SELECT code FROM public.country WHERE code = $1', [code])
    return rows.length > 0
  }

  async categoryIsActive(categoryId: string): Promise<boolean> {
    const rows: { id: string }[] = await this.database.connection().query(
      'SELECT id FROM public.category WHERE id = $1 AND is_active = true', [categoryId])
    return rows.length > 0
  }

  private actor(manager: EntityManager, creatorUserId: string) {
    return manager.query('SELECT set_config($1, $2, true)', ['brotar.actor_id', creatorUserId])
  }

  private async lockDraft(manager: EntityManager, campaignId: string, creatorUserId: string): Promise<void> {
    const rows: unknown[] = await manager.query(`SELECT id FROM public.campaign
      WHERE id=$1 AND creator_user_id=$2 AND status='DRAFT' AND deleted_at IS NULL FOR UPDATE`, [campaignId, creatorUserId])
    if (!rows.length) throw new DraftNotEditable()
  }

  async saveGeneral(creatorUserId: string, campaignId: string, input: GeneralInput): Promise<void> {
    await this.database.connection().transaction(async (manager) => {
      await this.lockDraft(manager, campaignId, creatorUserId)
      await this.actor(manager, creatorUserId)
      // El estado se reafirma en el WHERE: no se edita una campaña que dejó de ser borrador.
      await manager.query(
        `UPDATE public.campaign SET title = $2, summary = $3, category_id = $4, updated_at = now()
          WHERE id = $1 AND creator_user_id = $5 AND status = 'DRAFT' AND deleted_at IS NULL`,
        [campaignId, input.title, input.summary || null, input.categoryId, creatorUserId])
      // campaign_location tiene campaign_id como clave primaria: una fila por campaña.
      await manager.query(
        `INSERT INTO public.campaign_location(campaign_id, country_code, locality, address_line, reference)
         VALUES($1, $2, $3, $4, $5)
         ON CONFLICT (campaign_id) DO UPDATE SET country_code = EXCLUDED.country_code,
           locality = EXCLUDED.locality, address_line = EXCLUDED.address_line, reference = EXCLUDED.reference`,
        [campaignId, input.location.countryCode, input.location.locality || null,
          input.location.addressLine || null, input.location.reference || null])
    })
  }

  async readStory(campaignId: string): Promise<StorySummary> {
    const stories: { problem: string | null; solution: string | null; beneficiaries: string | null; expectedResults: string | null }[] =
      await this.database.connection().query(
        `SELECT problem, solution, beneficiaries, expected_results AS "expectedResults"
           FROM public.campaign_story WHERE campaign_id = $1`, [campaignId])
    const indicators: Indicator[] = await this.database.connection().query(
      `SELECT id, name, COALESCE(description, '') AS description, COALESCE(unit, '') AS unit,
              baseline_value::float8 AS "baselineValue", target_value::float8 AS "targetValue",
              achieved_value::float8 AS "achievedValue", display_order AS "displayOrder"
         FROM public.campaign_impact_indicator WHERE campaign_id = $1 ORDER BY display_order, name`,
      [campaignId])
    const row = stories[0]
    return {
      story: row
        ? {
          problem: row.problem ?? '', solution: row.solution ?? '',
          beneficiaries: row.beneficiaries ?? '', expectedResults: row.expectedResults ?? ''
        }
        : { ...EMPTY_STORY },
      indicators
    }
  }

  async saveStory(
    creatorUserId: string, campaignId: string, story: StoryInput, indicators: IndicatorInput[]
  ): Promise<void> {
    await this.database.connection().transaction(async (manager) => {
      await this.lockDraft(manager, campaignId, creatorUserId)
      await this.actor(manager, creatorUserId)
      await manager.query(
        `INSERT INTO public.campaign_story(campaign_id, problem, solution, beneficiaries, expected_results, updated_at)
         VALUES($1, $2, $3, $4, $5, now())
         ON CONFLICT (campaign_id) DO UPDATE SET problem = EXCLUDED.problem, solution = EXCLUDED.solution,
           beneficiaries = EXCLUDED.beneficiaries, expected_results = EXCLUDED.expected_results, updated_at = now()`,
        [campaignId, story.problem || null, story.solution || null,
          story.beneficiaries || null, story.expectedResults || null])
      // Se reemplaza el conjunto declarado. achieved_value no se escribe nunca desde aquí:
      // un indicador del asistente es una meta esperada, no un resultado ejecutado.
      await manager.query('DELETE FROM public.campaign_impact_indicator WHERE campaign_id = $1', [campaignId])
      for (const [index, indicator] of indicators.entries()) {
        await manager.query(
          `INSERT INTO public.campaign_impact_indicator(campaign_id, name, description, unit, baseline_value, target_value, display_order)
           VALUES($1, $2, $3, $4, $5, $6, $7)`,
          [campaignId, indicator.name, indicator.description || null, indicator.unit || null,
            indicator.baselineValue, indicator.targetValue, index])
      }
    })
  }
}
