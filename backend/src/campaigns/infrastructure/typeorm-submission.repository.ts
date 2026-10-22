import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { DraftNotEditable } from '../application/drafts'
import { SubmissionIncomplete, type ReviewObservation, type SubmissionRepository } from '../application/submission'
import { missingForSubmission, type SubmissionSnapshot } from '../domain/submission'
import { validateGeneral } from '../domain/general'
import { validateStory, validateIndicator } from '../domain/story'
import { validatePlan, validateBudget, validateFunding, validateRewards, validateBudgetGoal, validateRewardFunding } from '../domain/sections'
import { TypeormGeneralRepository } from './typeorm-general.repository'
import { TypeormSectionsRepository } from './typeorm-sections.repository'
import { campaignDuplicateReport } from './campaign-duplicates'

@Injectable()
export class TypeormSubmissionRepository implements SubmissionRepository {
  constructor(private readonly database: DatabaseService) {}

  private async load(manager: EntityManager, id: string): Promise<SubmissionSnapshot> {
    const rows: SubmissionSnapshot[] = await manager.query(`SELECT c.campaign_type AS "campaignType", c.title,c.summary,
      category.id AS "categoryId",f.id AS "coverFileId",l.country_code AS "countryCode",l.locality,
      s.problem,s.solution,s.beneficiaries,s.expected_results AS "expectedResults",
      (SELECT count(*)::int FROM public.campaign_impact_indicator WHERE campaign_id=c.id) AS "indicatorCount",
      (SELECT count(*)::int FROM public.campaign_activity WHERE campaign_id=c.id) AS "activityCount",
      (SELECT count(*)::int FROM public.budget_item WHERE campaign_id=c.id) AS "budgetCount",
      c.goal_amount::float8 AS "goalAmount",trim(currency.code) AS "currencyCode",c.duration_days AS "durationDays",
      c.funding_model AS "fundingModel",
      (SELECT count(*)::int FROM public.reward WHERE campaign_id=c.id AND is_active=true) AS "rewardCount"
      FROM public.campaign c LEFT JOIN public.campaign_location l ON l.campaign_id=c.id
      LEFT JOIN public.category category ON category.id=c.category_id AND category.is_active=true
      LEFT JOIN public.currency currency ON currency.code=c.currency_code AND currency.is_active=true
      LEFT JOIN public.file_asset f ON f.id=c.cover_file_id AND f.scope='PUBLIC'
        AND f.storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%' AND f.deleted_at IS NULL
      LEFT JOIN public.campaign_story s ON s.campaign_id=c.id WHERE c.id=$1`, [id])
    const snapshot = rows[0]!
    const general = new TypeormGeneralRepository(this.database)
    const sections = new TypeormSectionsRepository(this.database)
    const info = await general.readGeneral(id, manager)
    const story = await general.readStory(id, manager)
    const plan = await sections.readPlan(id, manager)
    const budget = await sections.readBudget(id, manager)
    const funding = await sections.readFunding(id, manager)
    const rewards = snapshot.campaignType === 'DONATION' ? [] : await sections.readRewards(id, manager)
    snapshot.invalidFields = []
    const collect = (errors: Record<string, string>, step: number) => {
      for (const [field, label] of Object.entries(errors)) snapshot.invalidFields!.push({ field, label, step })
    }
    collect(validateGeneral(info), 1)
    collect(validateStory(story.story), 2)
    story.indicators.forEach((indicator, index) => {
      const errors: Record<string, string> = {}
      for (const [field, message] of Object.entries(validateIndicator(indicator))) errors[`indicators.${index}.${field}`] = message
      collect(errors, 2)
    })
    collect(validatePlan(plan), 4)
    collect(validateBudget(budget), 4)
    collect(validateFunding(funding), 5)
    collect(validateBudgetGoal(budget, funding), 5)
    collect(validateRewards(snapshot.campaignType, rewards), 6)
    collect(validateRewardFunding(rewards, funding), 6)
    snapshot.duplication = await campaignDuplicateReport(manager, id)
    return snapshot
  }

  snapshot(id: string, manager = this.database.connection().manager) { return this.load(manager, id) }

  async observations(id: string): Promise<ReviewObservation[]> {
    return this.database.connection().query(`SELECT o.section,o.field_path AS "fieldPath",o.message
      FROM public.campaign_review_observation o JOIN public.campaign_review r ON r.id=o.review_id
      WHERE r.campaign_id=$1 AND r.decision='CHANGES_REQUESTED'
        AND r.round=(SELECT max(round) FROM public.campaign_review WHERE campaign_id=$1 AND decision='CHANGES_REQUESTED')
      ORDER BY o.created_at,o.id`, [id])
  }

  async submit(userId: string, id: string): Promise<void> {
    await this.database.connection().transaction(async manager => {
      const rows: { status: string }[] = await manager.query(`SELECT status FROM public.campaign
        WHERE id=$1 AND creator_user_id=$2 AND deleted_at IS NULL FOR UPDATE`, [id, userId])
      if (!rows[0] || !['DRAFT', 'CHANGES_REQUESTED'].includes(rows[0].status)) throw new DraftNotEditable()
      const missing = missingForSubmission(await this.load(manager, id))
      if (missing.length) throw new SubmissionIncomplete(missing)
      await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', userId])
      await manager.query(`UPDATE public.campaign SET status='IN_REVIEW',submitted_at=now(),updated_at=now() WHERE id=$1`, [id])
      await manager.query(`INSERT INTO public.campaign_review(campaign_id,round,decision)
        SELECT $1,COALESCE(max(round),0)+1,'PENDING'::review_decision FROM public.campaign_review WHERE campaign_id=$1`, [id])
    })
  }
}
