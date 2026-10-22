import type { CampaignType } from './draft'
import { MINIMUMS, RISK_IMPACTS, plannedAmount, textError, today, totalBudget, validDate as date, validMoney as money } from './input-policy'

export interface ActivityInput { name: string; responsibleName: string; plannedStartOn: string; plannedEndOn: string }
export interface MilestoneInput extends ActivityInput { activityIndexes: number[] }
export interface PlanInput { activities: ActivityInput[]; milestones: MilestoneInput[] }
export interface BudgetItemInput { categoryId: string; description: string; quantity: number; unitPrice: number; plannedAmount: number; notes: string }
export interface RiskInput { title: string; description: string; likelihood: string; impact: string; mitigation: string }
export interface BudgetInput { items: BudgetItemInput[]; risks: RiskInput[] }
export interface FundingInput { goalAmount: number | null; currencyCode: string; durationDays: number | null; fundingModel: string; startsAt: string | null; endsAt: string | null }
export interface RewardInput { title: string; description: string; rewardKind: string; minAmount: number; quantityTotal: number | null; estimatedDeliveryOn: string | null }

export type SectionErrors = Record<string, string>
const length = (value: string) => [...value.trim()].length
const instant = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && date(value.slice(0, 10)) && !Number.isNaN(Date.parse(value))
export const SECTION_TEXT_LIMIT = 5000 // Límite técnico de entrada, no regla comercial del cliente.
const validText = (value: string, max: number) => !value.includes('\u0000') && length(value) <= max

function validateSchedule(value: ActivityInput, prefix: string, errors: SectionErrors) {
  if (!length(value.name) || !validText(value.name, 200)) errors[`${prefix}.name`] = 'Indica un nombre de hasta 200 caracteres de texto.'
  if (!length(value.responsibleName) || !validText(value.responsibleName, 160)) errors[`${prefix}.responsibleName`] = 'Indica un responsable de hasta 160 caracteres de texto.'
  if (!date(value.plannedStartOn)) errors[`${prefix}.plannedStartOn`] = 'Indica una fecha válida.'
  if (!date(value.plannedEndOn) || value.plannedEndOn < value.plannedStartOn) errors[`${prefix}.plannedEndOn`] = 'La fecha final debe ser igual o posterior al inicio.'
  for (const [field, min, max] of [['name', MINIMUMS.title, 200], ['responsibleName', MINIMUMS.name, 160]] as const) {
    const error = textError(value[field], min, max)
    if (error) errors[`${prefix}.${field}`] = error
  }
  for (const field of ['plannedStartOn', 'plannedEndOn'] as const) {
    if (date(value[field]) && value[field] < today()) errors[`${prefix}.${field}`] = 'La fecha planificada no puede ser anterior a hoy (Bolivia).'
  }
}

export function validatePlan(input: PlanInput): SectionErrors {
  const errors: SectionErrors = {}
  if (!input.activities.length) errors.activities = 'Añade al menos una actividad.'
  if (input.activities.length > 50 || input.milestones.length > 50) errors.plan = 'Máximo 50 actividades y 50 hitos.'
  input.activities.forEach((item, index) => validateSchedule(item, `activities.${index}`, errors))
  input.milestones.forEach((item, index) => {
    validateSchedule(item, `milestones.${index}`, errors)
    if (!Array.isArray(item.activityIndexes) || item.activityIndexes.length > 50 ||
      new Set(item.activityIndexes).size !== item.activityIndexes.length ||
      item.activityIndexes.some(activityIndex => !Number.isInteger(activityIndex) || activityIndex < 0 || activityIndex >= input.activities.length)) {
      errors[`milestones.${index}.activityIndexes`] = 'Selecciona actividades existentes, sin repetirlas (máximo 50).'
      return
    }
    const activities = item.activityIndexes.map(activityIndex => input.activities[activityIndex]!)
    if (activities.some(activity => item.plannedEndOn < activity.plannedEndOn)) errors[`milestones.${index}.plannedEndOn`] = 'El hito de cierre no puede terminar antes que sus actividades relacionadas.'
    if (activities.length && item.plannedStartOn < activities.reduce((start, activity) => activity.plannedStartOn < start ? activity.plannedStartOn : start, activities[0]!.plannedStartOn)) errors[`milestones.${index}.plannedStartOn`] = 'El hito no puede comenzar antes de todas sus actividades relacionadas.'
  })
  for (const key of ['activities', 'milestones'] as const) {
    const seen = new Set<string>()
    input[key].forEach((item, index) => {
      const name = item.name.trim().normalize('NFC').toLocaleLowerCase('es')
      if (seen.has(name)) errors[`${key}.${index}.name`] = 'No repitas el mismo nombre dentro de este bloque.'
      seen.add(name)
    })
  }
  return errors
}

export function validateBudget(input: BudgetInput): SectionErrors {
  const errors: SectionErrors = {}
  if (!input.items.length) errors.items = 'Añade al menos una partida.'
  if (input.items.length > 50 || input.risks.length > 50) errors.budget = 'Máximo 50 partidas y 50 riesgos.'
  input.items.forEach((item, index) => {
    const prefix = `items.${index}`
    if (!item.categoryId) errors[`${prefix}.categoryId`] = 'Selecciona una categoría de gasto.'
    if (!length(item.description) || !validText(item.description, 300)) errors[`${prefix}.description`] = 'Describe la partida en hasta 300 caracteres de texto.'
    if (!validText(item.notes, SECTION_TEXT_LIMIT)) errors[`${prefix}.notes`] = 'Las notas admiten hasta 5000 caracteres de texto.'
    if (!money(item.quantity) || item.quantity > 9999999999.99) errors[`${prefix}.quantity`] = 'La cantidad debe ser positiva y tener hasta dos decimales.'
    if (!money(item.unitPrice)) errors[`${prefix}.unitPrice`] = 'El precio unitario debe ser positivo.'
    if (!money(item.plannedAmount)) errors[`${prefix}.plannedAmount`] = 'El importe planificado debe ser positivo.'
    const description = textError(item.description, MINIMUMS.description, 300)
    const notes = textError(item.notes, 5, SECTION_TEXT_LIMIT, true)
    if (description) errors[`${prefix}.description`] = description
    if (notes) errors[`${prefix}.notes`] = notes
    const calculated = plannedAmount(item.quantity, item.unitPrice)
    if (!money(calculated) || Math.round(calculated * 100) !== Math.round(item.plannedAmount * 100)) errors[`${prefix}.plannedAmount`] = 'El importe debe ser cantidad × precio unitario, redondeado a dos decimales.'
  })
  input.risks.forEach((risk, index) => {
    if (!length(risk.title) || !validText(risk.title, 200)) errors[`risks.${index}.title`] = 'Indica un riesgo de hasta 200 caracteres de texto.'
    if (!validText(risk.description, SECTION_TEXT_LIMIT)) errors[`risks.${index}.description`] = 'Usa hasta 5000 caracteres de texto.'
    if (!length(risk.mitigation) || !validText(risk.mitigation, SECTION_TEXT_LIMIT)) errors[`risks.${index}.mitigation`] = 'Indica cómo mitigar el riesgo en hasta 5000 caracteres de texto.'
    if (!validText(risk.likelihood, 40)) errors[`risks.${index}.likelihood`] = 'Usa hasta 40 caracteres de texto.'
    if (!validText(risk.impact, 40)) errors[`risks.${index}.impact`] = 'Usa hasta 40 caracteres de texto.'
    for (const [field, min, max] of [['title', 5, 200], ['description', 10, SECTION_TEXT_LIMIT], ['mitigation', 10, SECTION_TEXT_LIMIT]] as const) {
      const error = textError(risk[field], min, max)
      if (error) errors[`risks.${index}.${field}`] = error
    }
    if (!/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(risk.likelihood) || Number(risk.likelihood) > 100) errors[`risks.${index}.likelihood`] = 'Indica un porcentaje de 0 a 100 con hasta dos decimales, sin el signo %.'
    if (!(RISK_IMPACTS as readonly string[]).includes(risk.impact)) errors[`risks.${index}.impact`] = 'Selecciona Bajo, Medio o Alto.'
  })
  if (totalBudget(input.items) > 999999999999.99) errors.items = 'El presupuesto total supera el máximo permitido.'
  return errors
}

export function validateFunding(input: FundingInput): SectionErrors {
  const errors: SectionErrors = {}
  if (input.goalAmount === null || !money(input.goalAmount)) errors.goalAmount = 'La meta debe ser mayor a cero.'
  if (!/^[A-Z]{3}$/.test(input.currencyCode)) errors.currencyCode = 'Selecciona una moneda válida.'
  if (!['ALL_OR_NOTHING', 'FLEXIBLE'].includes(input.fundingModel)) errors.fundingModel = 'Selecciona un modelo válido.'
  if (input.durationDays === null || !Number.isInteger(input.durationDays) || input.durationDays <= 0 || input.durationDays > 365) errors.durationDays = 'La duración debe ser un entero de 1 a 365 días.'
  if (input.startsAt !== null && !instant(input.startsAt)) errors.startsAt = 'Indica una fecha válida.'
  if ((input.startsAt === null) !== (input.endsAt === null)) errors.endsAt = 'Indica inicio y fin juntos, o deja ambas fechas vacías.'
  else if (input.endsAt !== null && input.startsAt !== null &&
    (!instant(input.endsAt) || Date.parse(input.endsAt) <= Date.parse(input.startsAt))) {
    errors.endsAt = 'El fin debe ser posterior al inicio.'
  }
  if (input.startsAt !== null && instant(input.startsAt) && input.startsAt.slice(0, 10) < today()) errors.startsAt = 'El inicio no puede ser anterior a hoy (Bolivia).'
  if (input.endsAt !== null && instant(input.endsAt) && input.endsAt.slice(0, 10) < today()) errors.endsAt = 'El fin no puede ser anterior a hoy (Bolivia).'
  if (input.startsAt && input.endsAt && instant(input.startsAt) && instant(input.endsAt)) {
    const days = (Date.parse(input.endsAt) - Date.parse(input.startsAt)) / 86400000
    if (days !== input.durationDays) errors.durationDays = 'La duración debe coincidir con los días entre inicio y fin.'
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
    if (!length(reward.title) || !validText(reward.title, 200)) errors[`${prefix}.title`] = 'Indica un título de hasta 200 caracteres de texto.'
    if (!length(reward.description) || !validText(reward.description, SECTION_TEXT_LIMIT)) errors[`${prefix}.description`] = 'Describe la recompensa en hasta 5000 caracteres de texto.'
    if (!length(reward.rewardKind) || !validText(reward.rewardKind, 60)) errors[`${prefix}.rewardKind`] = 'Indica el tipo de recompensa en hasta 60 caracteres de texto.'
    if (!money(reward.minAmount)) errors[`${prefix}.minAmount`] = 'El aporte mínimo debe ser positivo.'
    if (reward.quantityTotal !== null && (!Number.isInteger(reward.quantityTotal) || reward.quantityTotal < 1 || reward.quantityTotal > 2147483647)) errors[`${prefix}.quantityTotal`] = 'La disponibilidad debe ser un entero positivo.'
    if (reward.estimatedDeliveryOn === null || !date(reward.estimatedDeliveryOn)) errors[`${prefix}.estimatedDeliveryOn`] = 'Indica una fecha estimada válida.'
    const title = textError(reward.title, 5, 200)
    const description = textError(reward.description, 10, SECTION_TEXT_LIMIT)
    if (title) errors[`${prefix}.title`] = title
    if (description) errors[`${prefix}.description`] = description
    if (reward.rewardKind !== type) errors[`${prefix}.rewardKind`] = 'El tipo debe corresponder a la modalidad de la campaña.'
    if (type === 'PRESALE' && reward.quantityTotal === null) errors[`${prefix}.quantityTotal`] = 'La preventa requiere una cantidad disponible.'
    if (reward.estimatedDeliveryOn && date(reward.estimatedDeliveryOn) && reward.estimatedDeliveryOn < today()) errors[`${prefix}.estimatedDeliveryOn`] = 'La entrega no puede ser anterior a hoy (Bolivia).'
  })
  const seen = new Set<string>()
  rewards.forEach((reward, index) => {
    const title = reward.title.trim().normalize('NFC').toLocaleLowerCase('es')
    if (seen.has(title)) errors[`rewards.${index}.title`] = 'No repitas el título de una recompensa.'
    seen.add(title)
  })
  return errors
}

/** Se comprueba en ambos órdenes de guardado y otra vez bajo el bloqueo de la campaña. */
export function validateBudgetGoal(budget: BudgetInput, funding: FundingInput): SectionErrors {
  if (!budget.items.length || funding.goalAmount === null) return {}
  return funding.goalAmount > totalBudget(budget.items) ? {} : { goalAmount: 'La meta debe ser estrictamente mayor al presupuesto total. Aumenta primero la meta si necesitas ampliar el presupuesto.' }
}

export function validateRewardFunding(rewards: RewardInput[], funding: FundingInput): SectionErrors {
  const errors: SectionErrors = {}
  rewards.forEach((reward, index) => {
    if (funding.goalAmount !== null && reward.minAmount > funding.goalAmount) errors[`rewards.${index}.minAmount`] = 'El aporte mínimo no puede superar la meta de la campaña.'
    if (funding.endsAt && reward.estimatedDeliveryOn && reward.estimatedDeliveryOn < funding.endsAt.slice(0, 10)) errors[`rewards.${index}.estimatedDeliveryOn`] = 'La entrega debe ser igual o posterior al cierre del financiamiento.'
  })
  return errors
}
