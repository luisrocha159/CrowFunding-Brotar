import { SessionError } from '../access/session/sessionClient'
import { readJson, requestApi } from '../../shared/api/request'
import { DraftFieldError, fieldErrorsFrom } from './campaignsClient'

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

function section<T>(value: unknown, keys: string[], arrays: string[] = []): T {
  if (!object(value) || !keys.every(key => value[key] !== undefined) || !arrays.every(key => Array.isArray(value[key]))) throw new SessionError(0)
  return value as T
}

export async function readPlan(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<PlanInput> {
  return section<PlanInput>(await request(`${id}/plan`, 'GET', undefined, signal, send), ['activities', 'milestones'], ['activities', 'milestones'])
}
export async function savePlan(id: string, plan: PlanInput, signal?: AbortSignal, send?: typeof fetch): Promise<PlanInput> {
  return section<PlanInput>(await request(`${id}/plan`, 'PUT', plan, signal, send), ['activities', 'milestones'], ['activities', 'milestones'])
}
export async function readBudget(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<BudgetInput> {
  return section<BudgetInput>(await request(`${id}/budget`, 'GET', undefined, signal, send), ['items', 'risks'], ['items', 'risks'])
}
export async function saveBudget(id: string, budget: BudgetInput, signal?: AbortSignal, send?: typeof fetch): Promise<BudgetInput> {
  return section<BudgetInput>(await request(`${id}/budget`, 'PUT', budget, signal, send), ['items', 'risks'], ['items', 'risks'])
}
export async function readFunding(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<FundingInput> {
  return section<FundingInput>(await request(`${id}/funding`, 'GET', undefined, signal, send), ['goalAmount', 'currencyCode', 'durationDays', 'fundingModel'])
}
export async function saveFunding(id: string, funding: FundingInput, signal?: AbortSignal, send?: typeof fetch): Promise<FundingInput> {
  return section<FundingInput>(await request(`${id}/funding`, 'PUT', funding, signal, send), ['goalAmount', 'currencyCode', 'durationDays', 'fundingModel'])
}
export async function readRewards(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<RewardInput[]> {
  const data = await request(`${id}/rewards`, 'GET', undefined, signal, send)
  if (!object(data) || !Array.isArray(data.rewards)) throw new SessionError(0)
  return data.rewards as RewardInput[]
}
export async function saveRewards(id: string, rewards: RewardInput[], signal?: AbortSignal, send?: typeof fetch): Promise<RewardInput[]> {
  const data = await request(`${id}/rewards`, 'PUT', { rewards }, signal, send)
  if (!object(data) || !Array.isArray(data.rewards)) throw new SessionError(0)
  return data.rewards as RewardInput[]
}
export async function readSectionCatalogs(id: string, signal?: AbortSignal, send?: typeof fetch): Promise<SectionCatalogs> {
  return section<SectionCatalogs>(await request(`${id}/section-catalogs`, 'GET', undefined, signal, send), ['expenseCategories', 'currencies'], ['expenseCategories', 'currencies'])
}
export function budgetTotal(budget: BudgetInput): number {
  return budget.items.reduce((sum, item) => sum + item.plannedAmount, 0)
}
