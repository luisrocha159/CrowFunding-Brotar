import type { CampaignType } from './draft'
import type { DuplicateReport } from './duplication'

export interface SubmissionSnapshot {
  campaignType: CampaignType
  title: string
  summary: string | null
  categoryId: string | null
  coverFileId: string | null
  countryCode: string | null
  locality: string | null
  problem: string | null
  solution: string | null
  beneficiaries: string | null
  expectedResults: string | null
  indicatorCount: number
  activityCount: number
  budgetCount: number
  goalAmount: number | null
  currencyCode: string | null
  durationDays: number | null
  fundingModel: string | null
  rewardCount: number
  invalidFields?: MissingField[]
  duplication?: DuplicateReport
}

export interface MissingField { field: string; label: string; step: number }

/** El servidor decide si la campaña se puede enviar; el cliente solo presenta esta lista. */
export function missingForSubmission(value: SubmissionSnapshot): MissingField[] {
  const missing: MissingField[] = []
  const need = (condition: boolean, field: string, label: string, step: number) => {
    if (!condition) missing.push({ field, label, step })
  }
  need(Boolean(value.campaignType), 'campaignType', 'Modalidad', 0)
  need(Boolean(value.title.trim()), 'title', 'Nombre', 1)
  need(Boolean(value.summary?.trim()), 'summary', 'Resumen', 1)
  need(Boolean(value.categoryId), 'categoryId', 'Categoría', 1)
  need(Boolean(value.countryCode), 'countryCode', 'País', 1)
  need(Boolean(value.locality?.trim()), 'locality', 'Localidad', 1)
  need(Boolean(value.problem?.trim()), 'problem', 'Problema', 2)
  need(Boolean(value.solution?.trim()), 'solution', 'Solución', 2)
  need(Boolean(value.beneficiaries?.trim()), 'beneficiaries', 'Beneficiarios', 2)
  need(Boolean(value.expectedResults?.trim()), 'expectedResults', 'Resultados esperados', 2)
  need(value.indicatorCount > 0, 'indicators', 'Indicadores de impacto', 2)
  need(Boolean(value.coverFileId), 'coverFileId', 'Portada', 3)
  need(value.activityCount > 0, 'activities', 'Actividades', 4)
  need(value.budgetCount > 0, 'budget', 'Presupuesto', 4)
  need(value.goalAmount !== null && value.goalAmount > 0, 'goalAmount', 'Meta de financiamiento', 5)
  need(Boolean(value.currencyCode), 'currencyCode', 'Moneda', 5)
  need(value.durationDays !== null && value.durationDays > 0, 'durationDays', 'Duración', 5)
  need(Boolean(value.fundingModel), 'fundingModel', 'Modelo de financiamiento', 5)
  if (value.campaignType !== 'DONATION') need(value.rewardCount > 0, 'rewards', 'Recompensas o preventas', 6)
  for (const item of value.invalidFields ?? []) {
    const previous = missing.findIndex(field => field.field === item.field)
    if (previous >= 0) missing[previous] = item
    else missing.push(item)
  }
  return missing
}
