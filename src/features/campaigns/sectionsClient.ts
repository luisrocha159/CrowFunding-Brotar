import { SessionError } from '../access/session/sessionClient'
import { readJson, requestApi } from '../../shared/api/request'
import { DraftFieldError, fieldErrorsFrom } from './campaignsClient'
import { validatePlan, validateBudget, validateFunding, validateRewards } from './sectionValidation'

export interface ActivityInput { name: string; responsibleName: string; plannedStartOn: string; plannedEndOn: string }
export interface MilestoneInput extends ActivityInput { activityIndex: number | null }
export interface PlanInput { activities: ActivityInput[]; milestones: MilestoneInput[] }
export interface BudgetItemInput { categoryId: string; description: string; quantity: number; unitPrice: number; plannedAmount: number; notes: string }
export interface RiskInput { title: string; description: string; likelihood: string; impact: string; mitigation: string }
export interface BudgetInput { items: BudgetItemInput[]; risks: RiskInput[] }
export interface FundingInput { goalAmount: number | null; currencyCode: string; durationDays: number | null; fundingModel: string; startsAt: string | null; endsAt: string | null }
export interface RewardInput { title: string; description: string; rewardKind: string; minAmount: number; quantityTotal: number | null; estimatedDeliveryOn: string | null }
export interface CatalogChoice { id: string; name: string }
export interface CurrencyChoice { code: string; name: string }
export interface SectionCatalogs { expenseCategories: CatalogChoice[]; currencies: CurrencyChoice[] }

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

async function request(path: string, method: 'GET' | 'PUT', body?: unknown, signal?: AbortSignal, send?: typeof fetch): Promise<unknown> {
  const response = await requestApi(`/api/campaigns/drafts/${path}`, {
    method, body, signal,
    errorFromResponse: async response => {
      if (response.status === 400) {
        const details: unknown = await response.json().catch(() => null)
        const fields = fieldErrorsFrom(object(details) ? details.message : null)
        if (Object.keys(fields).length) return new DraftFieldError(fields)
      }
      return new SessionError(response.status)
    }
  }, send)
  return readJson(response)
}

const text = (value: unknown): value is string => typeof value === 'string'
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const optionalText = (value: unknown) => value === null || text(value)
const optionalNumber = (value: unknown) => value === null || finite(value)
const arrayOf = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.length <= 50 && value.every(check)
const activity = (value: unknown) => object(value) && ['name', 'responsibleName', 'plannedStartOn', 'plannedEndOn'].every(key => text(value[key]))
const milestone = (value: unknown) => activity(value) && object(value) && (value.activityIndex === null || (Number.isInteger(value.activityIndex) && Number(value.activityIndex) >= 0))
const item = (value: unknown) => object(value) && ['categoryId', 'description', 'notes'].every(key => text(value[key])) && ['quantity', 'unitPrice', 'plannedAmount'].every(key => finite(value[key]))
const risk = (value: unknown) => object(value) && ['title', 'description', 'likelihood', 'impact', 'mitigation'].every(key => text(value[key]))
const reward = (value: unknown) => object(value) && ['title', 'description', 'rewardKind'].every(key => text(value[key])) && finite(value.minAmount) && optionalNumber(value.quantityTotal) && optionalText(value.estimatedDeliveryOn)
function checked<T>(value: unknown, valid: boolean): T {
  if (!valid) throw new SessionError(0)
  return value as T
}
export function planFrom(value: unknown): PlanInput {
  return checked(value, object(value) && arrayOf(value.activities, activity) && arrayOf(value.milestones, milestone))
}
export function budgetFrom(value: unknown): BudgetInput {
  return checked(value, object(value) && arrayOf(value.items, item) && arrayOf(value.risks, risk))
}
export function fundingFrom(value: unknown): FundingInput {
  return checked(value, object(value) && optionalNumber(value.goalAmount) && optionalNumber(value.durationDays) && text(value.currencyCode) && text(value.fundingModel) && optionalText(value.startsAt) && optionalText(value.endsAt))
}
export function rewardsFrom(value: unknown): RewardInput[] {
  if (!object(value)) throw new SessionError(0)
  return checked(value.rewards, arrayOf(value.rewards, reward))
}
function requireValid(errors: Record<string, string>) {
  if (Object.keys(errors).length) throw new DraftFieldError(errors)
}

export async function readPlan(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<PlanInput> {
  return planFrom(await request(`${encodeURIComponent(id)}/plan`, 'GET', undefined, signal, send))
}
export async function savePlan(id: string, plan: PlanInput, signal?: AbortSignal, send?: typeof fetch): Promise<PlanInput> {
  requireValid(validatePlan(plan))
  return planFrom(await request(`${encodeURIComponent(id)}/plan`, 'PUT', plan, signal, send))
}
export async function readBudget(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<BudgetInput> {
  return budgetFrom(await request(`${encodeURIComponent(id)}/budget`, 'GET', undefined, signal, send))
}
export async function saveBudget(id: string, budget: BudgetInput, signal?: AbortSignal, send?: typeof fetch): Promise<BudgetInput> {
  requireValid(validateBudget(budget))
  return budgetFrom(await request(`${encodeURIComponent(id)}/budget`, 'PUT', budget, signal, send))
}
export async function readFunding(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<FundingInput> {
  return fundingFrom(await request(`${encodeURIComponent(id)}/funding`, 'GET', undefined, signal, send))
}
export async function saveFunding(id: string, funding: FundingInput, signal?: AbortSignal, send?: typeof fetch): Promise<FundingInput> {
  requireValid(validateFunding(funding))
  return fundingFrom(await request(`${encodeURIComponent(id)}/funding`, 'PUT', funding, signal, send))
}
export async function readRewards(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<RewardInput[]> {
  return rewardsFrom(await request(`${encodeURIComponent(id)}/rewards`, 'GET', undefined, signal, send))
}
export async function saveRewards(id: string, rewards: RewardInput[], signal?: AbortSignal, send?: typeof fetch): Promise<RewardInput[]> {
  requireValid(validateRewards('REWARD', rewards)) // La API decide la modalidad real bajo bloqueo.
  return rewardsFrom(await request(`${encodeURIComponent(id)}/rewards`, 'PUT', { rewards }, signal, send))
}
export async function readSectionCatalogs(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<SectionCatalogs> {
  const value = await request(`${encodeURIComponent(id)}/section-catalogs`, 'GET', undefined, signal, send)
  return checked(value, object(value) && Array.isArray(value.expenseCategories) && value.expenseCategories.every(row => object(row) && text(row.id) && text(row.name)) && Array.isArray(value.currencies) && value.currencies.every(row => object(row) && text(row.code) && /^[A-Z]{3}$/.test(row.code) && text(row.name)))
}
export function budgetTotal(budget: BudgetInput): number {
  // Hasta 50 partidas numeric(14,2): los centavos acumulados caben en un entero seguro.
  return budget.items.reduce((cents, item) => cents + Math.round(item.plannedAmount * 100), 0) / 100
}
