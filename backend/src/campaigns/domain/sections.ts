import type { CampaignType } from './draft'

export interface ActivityInput { name: string; responsibleName: string; plannedStartOn: string; plannedEndOn: string }
export interface MilestoneInput extends ActivityInput { activityIndex: number | null }
export interface PlanInput { activities: ActivityInput[]; milestones: MilestoneInput[] }
export interface BudgetItemInput { categoryId: string; description: string; quantity: number; unitPrice: number; plannedAmount: number; notes: string }
export interface RiskInput { title: string; description: string; likelihood: string; impact: string; mitigation: string }
export interface BudgetInput { items: BudgetItemInput[]; risks: RiskInput[] }
export interface FundingInput { goalAmount: number | null; currencyCode: string; durationDays: number | null; fundingModel: string; startsAt: string | null; endsAt: string | null }
export interface RewardInput { title: string; description: string; rewardKind: string; minAmount: number; quantityTotal: number | null; estimatedDeliveryOn: string | null }

export type SectionErrors = Record<string, string>
const length = (value: string) => [...value.trim()].length
const date = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
const money = (value: number) => Number.isFinite(value) && value > 0 && value <= 999999999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7

function validateSchedule(value: ActivityInput, prefix: string, errors: SectionErrors) {
  if (!length(value.name) || length(value.name) > 200) errors[`${prefix}.name`] = 'Indica un nombre de hasta 200 caracteres.'
  if (!length(value.responsibleName) || length(value.responsibleName) > 160) errors[`${prefix}.responsibleName`] = 'Indica un responsable de hasta 160 caracteres.'
  if (!date(value.plannedStartOn)) errors[`${prefix}.plannedStartOn`] = 'Indica una fecha válida.'
  if (!date(value.plannedEndOn) || value.plannedEndOn < value.plannedStartOn) errors[`${prefix}.plannedEndOn`] = 'La fecha final debe ser igual o posterior al inicio.'
}

export function validatePlan(input: PlanInput): SectionErrors {
  const errors: SectionErrors = {}
  if (!input.activities.length) errors.activities = 'Añade al menos una actividad.'
  if (input.activities.length > 50 || input.milestones.length > 50) errors.plan = 'Máximo 50 actividades y 50 hitos.'
  input.activities.forEach((item, index) => validateSchedule(item, `activities.${index}`, errors))
  input.milestones.forEach((item, index) => {
    validateSchedule(item, `milestones.${index}`, errors)
    if (item.activityIndex !== null && (!Number.isInteger(item.activityIndex) || item.activityIndex < 0 || item.activityIndex >= input.activities.length)) {
      errors[`milestones.${index}.activityIndex`] = 'Selecciona una actividad existente.'
    }
  })
  return errors
}

export function validateBudget(input: BudgetInput): SectionErrors {
  const errors: SectionErrors = {}
  if (!input.items.length) errors.items = 'Añade al menos una partida.'
  if (input.items.length > 50 || input.risks.length > 50) errors.budget = 'Máximo 50 partidas y 50 riesgos.'
  input.items.forEach((item, index) => {
    const prefix = `items.${index}`
    if (!item.categoryId) errors[`${prefix}.categoryId`] = 'Selecciona una categoría de gasto.'
    if (!length(item.description) || length(item.description) > 300) errors[`${prefix}.description`] = 'Describe la partida en hasta 300 caracteres.'
    if (!money(item.quantity) || item.quantity > 9999999999.99) errors[`${prefix}.quantity`] = 'La cantidad debe ser positiva y tener hasta dos decimales.'
    if (!money(item.unitPrice)) errors[`${prefix}.unitPrice`] = 'El precio unitario debe ser positivo.'
    if (!money(item.plannedAmount)) errors[`${prefix}.plannedAmount`] = 'El importe planificado debe ser positivo.'
  })
  input.risks.forEach((risk, index) => {
    if (!length(risk.title) || length(risk.title) > 200) errors[`risks.${index}.title`] = 'Indica un riesgo de hasta 200 caracteres.'
    if (!length(risk.mitigation)) errors[`risks.${index}.mitigation`] = 'Indica cómo mitigar el riesgo.'
    if (length(risk.likelihood) > 40) errors[`risks.${index}.likelihood`] = 'Usa hasta 40 caracteres.'
    if (length(risk.impact) > 40) errors[`risks.${index}.impact`] = 'Usa hasta 40 caracteres.'
  })
  return errors
}

export function validateFunding(input: FundingInput): SectionErrors {
  const errors: SectionErrors = {}
  if (input.goalAmount === null || !money(input.goalAmount)) errors.goalAmount = 'La meta debe ser mayor a cero.'
  if (!/^[A-Z]{3}$/.test(input.currencyCode)) errors.currencyCode = 'Selecciona una moneda válida.'
  if (!['ALL_OR_NOTHING', 'FLEXIBLE'].includes(input.fundingModel)) errors.fundingModel = 'Selecciona un modelo válido.'
  if (input.durationDays === null || !Number.isInteger(input.durationDays) || input.durationDays <= 0 || input.durationDays > 2147483647) errors.durationDays = 'La duración debe ser un número positivo de días.'
  if (input.startsAt !== null && Number.isNaN(Date.parse(input.startsAt))) errors.startsAt = 'Indica una fecha válida.'
  if ((input.startsAt === null) !== (input.endsAt === null)) errors.endsAt = 'Indica inicio y fin juntos, o deja ambas fechas vacías.'
  else if (input.endsAt !== null && input.startsAt !== null &&
    (Number.isNaN(Date.parse(input.endsAt)) || Date.parse(input.endsAt) <= Date.parse(input.startsAt)
      || (input.durationDays !== null && (Date.parse(input.endsAt) - Date.parse(input.startsAt)) / 86400000 !== input.durationDays))) {
    errors.endsAt = 'El fin debe ser posterior al inicio y coincidir con la duración.'
  }
  return errors
}

export function validateRewards(type: CampaignType, rewards: RewardInput[]): SectionErrors {
  const errors: SectionErrors = {}
  if (type === 'DONATION') {
    if (rewards.length) errors.rewards = 'La donación no admite recompensas activas.'
    return errors
  }
  if (rewards.length > 50) errors.rewards = 'Máximo 50 recompensas.'
  rewards.forEach((reward, index) => {
    const prefix = `rewards.${index}`
    if (!length(reward.title) || length(reward.title) > 200) errors[`${prefix}.title`] = 'Indica un título de hasta 200 caracteres.'
    if (!length(reward.description)) errors[`${prefix}.description`] = 'Describe la recompensa.'
    if (!length(reward.rewardKind) || length(reward.rewardKind) > 60) errors[`${prefix}.rewardKind`] = 'Indica el tipo de recompensa.'
    if (!money(reward.minAmount)) errors[`${prefix}.minAmount`] = 'El aporte mínimo debe ser positivo.'
    if (reward.quantityTotal !== null && (!Number.isInteger(reward.quantityTotal) || reward.quantityTotal < 0 || reward.quantityTotal > 2147483647)) errors[`${prefix}.quantityTotal`] = 'La disponibilidad debe ser un entero no negativo.'
    if (reward.estimatedDeliveryOn === null || !date(reward.estimatedDeliveryOn)) errors[`${prefix}.estimatedDeliveryOn`] = 'Indica una fecha estimada válida.'
  })
  return errors
}
