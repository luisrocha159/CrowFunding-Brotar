import { DraftNotEditable, DraftNotFound, type DraftRepository } from './drafts'
import { validateBudget, validateFunding, validatePlan, validateRewards, validateBudgetGoal, validateRewardFunding, type BudgetInput, type FundingInput, type PlanInput, type RewardInput, type SectionErrors } from '../domain/sections'
import type { CampaignType } from '../domain/draft'

export class SectionInvalid extends Error {
  constructor(readonly fields: SectionErrors) { super('Sección inválida') }
}

export interface CatalogChoice { id: string; name: string }
export interface CurrencyChoice { code: string; name: string }
export interface SectionsRepository {
  readPlan(id: string): Promise<PlanInput>
  savePlan(userId: string, id: string, plan: PlanInput): Promise<void>
  readBudget(id: string): Promise<BudgetInput>
  saveBudget(userId: string, id: string, budget: BudgetInput): Promise<void>
  readFunding(id: string): Promise<FundingInput>
  saveFunding(userId: string, id: string, funding: FundingInput): Promise<void>
  readRewards(id: string): Promise<RewardInput[]>
  saveRewards(userId: string, id: string, rewards: RewardInput[]): Promise<void>
  expenseCategories(): Promise<CatalogChoice[]>
  currencies(): Promise<CurrencyChoice[]>
  countries(): Promise<CurrencyChoice[]>
  expenseCategoryActive(id: string): Promise<boolean>
  currencyActive(code: string): Promise<boolean>
}

/** La propiedad se comprueba antes de leer y se reafirma bajo bloqueo al escribir. */
export class CampaignSections {
  constructor(private readonly drafts: DraftRepository, private readonly repository: SectionsRepository) {}

  private async own(userId: string, id: string) {
    const draft = await this.drafts.findOwn(userId, id)
    if (!draft) throw new DraftNotFound()
    return draft
  }

  private async editable(userId: string, id: string) {
    const draft = await this.own(userId, id)
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(draft.status)) throw new DraftNotEditable()
    return draft
  }

  async readPlan(userId: string, id: string) { await this.own(userId, id); return this.repository.readPlan(id) }
  async readBudget(userId: string, id: string) { await this.own(userId, id); return this.repository.readBudget(id) }
  async readFunding(userId: string, id: string) { await this.own(userId, id); return this.repository.readFunding(id) }
  async readRewards(userId: string, id: string) { await this.own(userId, id); return this.repository.readRewards(id) }

  async savePlan(userId: string, id: string, input: PlanInput) {
    await this.editable(userId, id)
    const fields = validatePlan(input)
    if (Object.keys(fields).length) throw new SectionInvalid(fields)
    await this.repository.savePlan(userId, id, input)
    return this.readPlan(userId, id)
  }

  async saveBudget(userId: string, id: string, input: BudgetInput) {
    await this.editable(userId, id)
    const fields = validateBudget(input)
    Object.assign(fields, validateBudgetGoal(input, await this.repository.readFunding(id)))
    for (const [index, item] of input.items.entries()) {
      if (item.categoryId && !await this.repository.expenseCategoryActive(item.categoryId)) {
        fields[`items.${index}.categoryId`] = 'La categoría de gasto no está activa.'
      }
    }
    if (Object.keys(fields).length) throw new SectionInvalid(fields)
    await this.repository.saveBudget(userId, id, input)
    return this.readBudget(userId, id)
  }

  async saveFunding(userId: string, id: string, input: FundingInput) {
    await this.editable(userId, id)
    const fields = validateFunding(input)
    Object.assign(fields, validateBudgetGoal(await this.repository.readBudget(id), input))
    if ((await this.editable(userId, id)).campaignType !== 'DONATION') Object.assign(fields, validateRewardFunding(await this.repository.readRewards(id), input))
    if (!fields.currencyCode && !await this.repository.currencyActive(input.currencyCode)) fields.currencyCode = 'La moneda no está activa.'
    const previous = await this.repository.readFunding(id)
    if (previous.currencyCode && previous.currencyCode !== input.currencyCode && (await this.repository.readRewards(id)).length) {
      fields.currencyCode = 'Quita y guarda las recompensas antes de cambiar la moneda.'
    }
    if (Object.keys(fields).length) throw new SectionInvalid(fields)
    await this.repository.saveFunding(userId, id, input)
    return this.readFunding(userId, id)
  }

  async saveRewards(userId: string, id: string, input: RewardInput[]) {
    const draft = await this.editable(userId, id)
    const fields = validateRewards(draft.campaignType as CampaignType, input)
    const funding = await this.repository.readFunding(id)
    Object.assign(fields, validateRewardFunding(input, funding))
    if (draft.campaignType !== 'DONATION' && !funding.currencyCode) fields.currencyCode = 'Configura el financiamiento antes de las recompensas.'
    if (Object.keys(fields).length) throw new SectionInvalid(fields)
    await this.repository.saveRewards(userId, id, input)
    return this.readRewards(userId, id)
  }

  expenseCategories() { return this.repository.expenseCategories() }
  currencies() { return this.repository.currencies() }
  countries() { return this.repository.countries() }
}
