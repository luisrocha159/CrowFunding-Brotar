import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { DraftNotEditable } from '../application/drafts'
import { SectionInvalid, type SectionsRepository } from '../application/sections'
import { validateBudget, validatePlan, validateFunding, validateRewards, validateBudgetGoal, validateRewardFunding, type BudgetInput, type FundingInput, type PlanInput, type RewardInput } from '../domain/sections'
import type { CampaignType } from '../domain/draft'
import { recordAudit } from '../../shared/infrastructure/database/audit'

@Injectable()
export class TypeormSectionsRepository implements SectionsRepository {
  constructor(private readonly database: DatabaseService) {}

  private async write(userId: string, id: string, change: (manager: EntityManager) => Promise<void>) {
    await this.database.connection().transaction(async manager => {
      const rows: unknown[] = await manager.query(`SELECT id FROM public.campaign
        WHERE id=$1 AND creator_user_id=$2 AND status IN ('DRAFT','CHANGES_REQUESTED') AND deleted_at IS NULL FOR UPDATE`, [id, userId])
      if (!rows.length) throw new DraftNotEditable()
      await manager.query('SELECT set_config($1, $2, true)', ['brotar.actor_id', userId])
      await change(manager)
      await manager.query('UPDATE public.campaign SET updated_at=now() WHERE id=$1', [id])
      await recordAudit(manager,userId,'UPDATE','campaign',id)
    })
  }

  async readPlan(id: string, manager = this.database.connection().manager): Promise<PlanInput> {
    const activities: (PlanInput['activities'][number] & { id: string })[] = await manager.query(
      `SELECT id, name, COALESCE(responsible_name,'') AS "responsibleName",
        planned_start_on::text AS "plannedStartOn", planned_end_on::text AS "plannedEndOn"
       FROM public.campaign_activity WHERE campaign_id=$1 ORDER BY display_order,id`, [id])
    const milestones: (Omit<PlanInput['milestones'][number], 'activityIndexes'> & { activityIds: string[] })[] = await manager.query(
      `SELECT m.name, COALESCE(m.responsible_name,'') AS "responsibleName",
        ARRAY(SELECT link.activity_id FROM brotar_extension.milestone_activity link WHERE link.milestone_id=m.id
          UNION SELECT m.activity_id WHERE m.activity_id IS NOT NULL) AS "activityIds",
        m.planned_start_on::text AS "plannedStartOn", m.planned_end_on::text AS "plannedEndOn"
       FROM public.milestone m WHERE m.campaign_id=$1 ORDER BY m.display_order,m.id`, [id])
    return {
      activities: activities.map(({ name, responsibleName, plannedStartOn, plannedEndOn }) => ({ name, responsibleName, plannedStartOn: plannedStartOn ?? '', plannedEndOn: plannedEndOn ?? '' })),
      milestones: milestones.map(({ activityIds, ...item }) => ({ ...item, plannedStartOn: item.plannedStartOn ?? '', plannedEndOn: item.plannedEndOn ?? '', activityIndexes: activityIds.map(activityId => activities.findIndex(activity => activity.id === activityId)).sort((a, b) => a - b) }))
    }
  }

  async savePlan(userId: string, id: string, plan: PlanInput) {
    await this.write(userId, id, async manager => {
      const errors = validatePlan(plan)
      if (Object.keys(errors).length) throw new SectionInvalid(errors)
      await manager.query('DELETE FROM public.milestone WHERE campaign_id=$1', [id])
      await manager.query('DELETE FROM public.campaign_activity WHERE campaign_id=$1', [id])
      const ids: string[] = []
      for (const [index, item] of plan.activities.entries()) {
        const rows: { id: string }[] = await manager.query(`INSERT INTO public.campaign_activity
          (campaign_id,name,responsible_name,planned_start_on,planned_end_on,display_order)
          VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [id, item.name.trim(), item.responsibleName.trim(), item.plannedStartOn, item.plannedEndOn, index])
        ids.push(rows[0]!.id)
      }
      for (const [index, item] of plan.milestones.entries()) {
        const rows: { id: string }[] = await manager.query(`INSERT INTO public.milestone
          (campaign_id,activity_id,name,responsible_name,planned_start_on,planned_end_on,display_order)
          VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [id, item.activityIndexes.length ? ids[item.activityIndexes[0]!] : null, item.name.trim(), item.responsibleName.trim(), item.plannedStartOn, item.plannedEndOn, index])
        for (const activityIndex of item.activityIndexes) {
          await manager.query('INSERT INTO brotar_extension.milestone_activity(milestone_id,activity_id) VALUES($1,$2)', [rows[0]!.id, ids[activityIndex]])
        }
      }
    })
  }

  async readBudget(id: string, manager = this.database.connection().manager): Promise<BudgetInput> {
    const items = await manager.query(`SELECT expense_category_id AS "categoryId", description,
        quantity::float8 AS quantity, unit_price::float8 AS "unitPrice", planned_amount::float8 AS "plannedAmount",
        COALESCE(notes,'') AS notes FROM public.budget_item WHERE campaign_id=$1 ORDER BY display_order,id`, [id]) as BudgetInput['items']
    const risks = await manager.query(`SELECT title, COALESCE(description,'') AS description,
        COALESCE(likelihood,'') AS likelihood, COALESCE(impact,'') AS impact,
        COALESCE(mitigation,'') AS mitigation FROM public.campaign_risk WHERE campaign_id=$1 ORDER BY display_order,id`, [id]) as BudgetInput['risks']
    return { items, risks }
  }

  async saveBudget(userId: string, id: string, budget: BudgetInput) {
    await this.write(userId, id, async manager => {
      const errors = { ...validateBudget(budget), ...validateBudgetGoal(budget, await this.readFunding(id, manager)) }
      if (Object.keys(errors).length) throw new SectionInvalid(errors)
      await manager.query('DELETE FROM public.budget_item WHERE campaign_id=$1', [id])
      await manager.query('DELETE FROM public.campaign_risk WHERE campaign_id=$1', [id])
      for (const [index, item] of budget.items.entries()) {
        await manager.query(`INSERT INTO public.budget_item
          (campaign_id,expense_category_id,description,quantity,unit_price,planned_amount,notes,display_order)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, item.categoryId, item.description.trim(), item.quantity, item.unitPrice, item.plannedAmount, item.notes.trim() || null, index])
      }
      for (const [index, risk] of budget.risks.entries()) {
        await manager.query(`INSERT INTO public.campaign_risk
          (campaign_id,title,description,likelihood,impact,mitigation,display_order)
          VALUES($1,$2,$3,$4,$5,$6,$7)`, [id, risk.title.trim(), risk.description.trim() || null, risk.likelihood.trim() || null, risk.impact.trim() || null, risk.mitigation.trim(), index])
      }
    })
  }

  async readFunding(id: string, manager = this.database.connection().manager): Promise<FundingInput> {
    const rows: { goalAmount: number | null; currencyCode: string | null; durationDays: number | null; fundingModel: string | null; startsAt: Date | null; endsAt: Date | null }[] = await manager.query(
      `SELECT goal_amount::float8 AS "goalAmount", currency_code AS "currencyCode", duration_days AS "durationDays",
        funding_model AS "fundingModel", starts_at AS "startsAt", ends_at AS "endsAt" FROM public.campaign WHERE id=$1`, [id])
    const row = rows[0]!
    return { goalAmount: row.goalAmount, currencyCode: row.currencyCode?.trim() ?? '', durationDays: row.durationDays,
      fundingModel: row.fundingModel ?? '', startsAt: row.startsAt?.toISOString() ?? null, endsAt: row.endsAt?.toISOString() ?? null }
  }

  async saveFunding(userId: string, id: string, funding: FundingInput) {
    await this.write(userId, id, async manager => {
      const [campaign] = await manager.query('SELECT campaign_type AS "campaignType" FROM public.campaign WHERE id=$1', [id]) as { campaignType: CampaignType }[]
      const errors = { ...validateFunding(funding), ...validateBudgetGoal(await this.readBudget(id, manager), funding),
        ...(campaign?.campaignType === 'DONATION' ? {} : validateRewardFunding(await this.readRewards(id, manager), funding)) }
      if (Object.keys(errors).length) throw new SectionInvalid(errors)
      const current: { currencyCode: string | null; rewardCount: number }[] = await manager.query(`SELECT
        currency_code AS "currencyCode",(SELECT count(*)::int FROM public.reward WHERE campaign_id=$1) AS "rewardCount"
        FROM public.campaign WHERE id=$1`, [id])
      if (current[0]?.currencyCode?.trim() && current[0].currencyCode.trim() !== funding.currencyCode && current[0].rewardCount > 0) {
        throw new SectionInvalid({ currencyCode: 'Quita y guarda las recompensas antes de cambiar la moneda.' })
      }
      await manager.query(`UPDATE public.campaign SET goal_amount=$2,currency_code=$3,duration_days=$4,
        funding_model=$5::funding_model,starts_at=$6,ends_at=$7 WHERE id=$1`,
      [id, funding.goalAmount, funding.currencyCode, funding.durationDays, funding.fundingModel, funding.startsAt, funding.endsAt])
    })
  }

  async readRewards(id: string, manager = this.database.connection().manager): Promise<RewardInput[]> {
    return manager.query(`SELECT title,description,COALESCE(reward_kind,'') AS "rewardKind",
      min_amount::float8 AS "minAmount",quantity_total AS "quantityTotal",
      estimated_delivery_on::text AS "estimatedDeliveryOn" FROM public.reward
      WHERE campaign_id=$1 AND is_active=true ORDER BY display_order,id`, [id])
  }

  async saveRewards(userId: string, id: string, rewards: RewardInput[]) {
    await this.write(userId, id, async manager => {
      const rows: { currencyCode: string | null; campaignType: CampaignType }[] = await manager.query('SELECT currency_code AS "currencyCode",campaign_type AS "campaignType" FROM public.campaign WHERE id=$1', [id])
      // La modalidad puede cambiar entre la validación inicial y la adquisición del bloqueo.
      const errors = validateRewards(rows[0]!.campaignType, rewards)
      Object.assign(errors, validateRewardFunding(rewards, await this.readFunding(id, manager)))
      if (Object.keys(errors).length) throw new SectionInvalid(errors)
      if (rows[0]!.campaignType === 'DONATION') return // Conserva las recompensas anteriores.
      const currency = rows[0]?.currencyCode?.trim()
      if (!currency) throw new DraftNotEditable()
      await manager.query('DELETE FROM public.reward WHERE campaign_id=$1 AND is_active=true', [id])
      for (const [index, item] of rewards.entries()) {
        await manager.query(`INSERT INTO public.reward
          (campaign_id,title,description,reward_kind,min_amount,currency_code,quantity_total,estimated_delivery_on,display_order)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, item.title.trim(), item.description.trim(), item.rewardKind.trim(), item.minAmount, currency, item.quantityTotal, item.estimatedDeliveryOn, index])
      }
    })
  }

  expenseCategories() { return this.database.connection().query(`SELECT id,name FROM public.expense_category WHERE is_active=true ORDER BY display_order,name`) as Promise<{ id: string; name: string }[]> }
  currencies() { return this.database.connection().query(`SELECT trim(code) AS code,name FROM public.currency WHERE is_active=true ORDER BY code`) as Promise<{ code: string; name: string }[]> }
  countries() { return this.database.connection().query('SELECT trim(code) AS code,name FROM public.country WHERE is_active=true ORDER BY name') as Promise<{ code: string; name: string }[]> }
  async expenseCategoryActive(id: string) { const rows: unknown[] = await this.database.connection().query('SELECT 1 FROM public.expense_category WHERE id=$1 AND is_active=true', [id]); return rows.length > 0 }
  async currencyActive(code: string) { const rows: unknown[] = await this.database.connection().query('SELECT 1 FROM public.currency WHERE code=$1 AND is_active=true', [code]); return rows.length > 0 }
}
