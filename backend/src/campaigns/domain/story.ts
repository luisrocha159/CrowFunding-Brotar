/** Límite del esquema oficial: campaign_impact_indicator.name varchar(200), unit varchar(60). */
import { INDICATOR_UNITS, MINIMUMS, textError } from './input-policy'

export const STORY_LIMITS = { text: 5000, indicatorName: 200, unit: 60, indicators: 20 } as const

export interface StoryInput {
  problem: string
  solution: string
  beneficiaries: string
  expectedResults: string
}

export interface IndicatorInput {
  name: string
  description: string
  unit: string
  baselineValue: number | null
  /** Meta esperada. Nunca un resultado ya conseguido (BG-19 CA 2). */
  targetValue: number | null
}

export function normalizeStory(input: StoryInput): StoryInput {
  return {
    problem: input.problem.trim(), solution: input.solution.trim(),
    beneficiaries: input.beneficiaries.trim(), expectedResults: input.expectedResults.trim()
  }
}

export function validateStory(input: StoryInput): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of ['problem', 'solution', 'beneficiaries', 'expectedResults'] as const) {
    const length = [...input[field]].length
    if (length > STORY_LIMITS.text) errors[field] = `Admite hasta ${STORY_LIMITS.text} caracteres.`
    if (input[field].includes('\u0000')) errors[field] = 'El campo contiene un carácter de control no admitido.'
    const error = textError(input[field], MINIMUMS.story, STORY_LIMITS.text)
    if (error) errors[field] = error
  }
  return errors
}

export function normalizeIndicator(input: IndicatorInput): IndicatorInput {
  return {
    name: input.name.trim(), description: input.description.trim(), unit: input.unit.trim(),
    baselineValue: input.baselineValue, targetValue: input.targetValue
  }
}

/**
 * Un indicador es una meta esperada, no un resultado ejecutado (BG-19 CA 2).
 * `achieved_value` existe en el esquema pero NO se acepta desde el asistente: llenarlo
 * aquí presentaría como conseguido algo que todavía no ha ocurrido. Se registra durante
 * el seguimiento, con su propia evidencia, fuera de este sprint.
 */
export function validateIndicator(input: IndicatorInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = [...input.name].length
  if (name === 0) errors.name = 'El indicador necesita un nombre.'
  else if (name > STORY_LIMITS.indicatorName) errors.name = `Admite hasta ${STORY_LIMITS.indicatorName} caracteres.`
  if ([...input.unit].length > STORY_LIMITS.unit) errors.unit = `La unidad admite hasta ${STORY_LIMITS.unit} caracteres.`
  if ([...input.description].length > STORY_LIMITS.text) errors.description = `Admite hasta ${STORY_LIMITS.text} caracteres.`
  for (const field of ['baselineValue', 'targetValue'] as const) {
    const value = input[field]
    // PostgreSQL numeric(14,2): doce enteros y dos decimales, sin redondeo silencioso.
    if (value !== null && (!Number.isFinite(value) || Math.abs(value) > 999999999999.99
      || value !== Number(value.toFixed(2)))) errors[field] = 'Usa un número entre -999999999999.99 y 999999999999.99 con hasta dos decimales.'
  }
  // La meta sin unidad no se interpreta: el criterio pide unidad y meta juntas cuando apliquen.
  if (input.targetValue !== null && input.unit.length === 0) errors.unit = 'Indica la unidad de la meta.'
  for (const field of ['name', 'description', 'unit'] as const) {
    if (input[field].includes('\u0000')) errors[field] = 'El campo contiene un carácter de control no admitido.'
  }
  const nameError = textError(input.name, MINIMUMS.title, 200)
  const descriptionError = textError(input.description, MINIMUMS.description, 5000, true)
  if (nameError) errors.name = nameError
  if (descriptionError) errors.description = descriptionError
  if (!(INDICATOR_UNITS as readonly string[]).includes(input.unit)) errors.unit = 'Selecciona una unidad disponible.'
  if (input.targetValue === null) errors.targetValue = 'Indica una meta esperada.'
  for (const field of ['baselineValue', 'targetValue'] as const) {
    const value = input[field]
    if (value === null) continue
    if (value < 0) errors[field] = 'El valor no puede ser negativo.'
    if (input.unit === '%' && value > 100) errors[field] = 'El porcentaje no puede superar 100 %.'
    if (['personas', 'familias', 'unidades'].includes(input.unit) && !Number.isInteger(value)) errors[field] = 'Esta unidad requiere un número entero.'
  }
  return errors
}
