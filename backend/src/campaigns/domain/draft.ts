/**
 * El asistente tiene ocho etapas (BG-15 CA 2). Aquí solo se valida la posición:
 * nombrar cada etapa es contenido del flujo y depende de D02 y D10, no de la
 * persistencia. `campaign.builder_step` es smallint y arranca en 0.
 */
export const TOTAL_BUILDER_STEPS = 8
export const FIRST_BUILDER_STEP = 0
export const LAST_BUILDER_STEP = TOTAL_BUILDER_STEPS - 1

// Valores del enum campaign_type del esquema oficial. No se añade ninguno (BG-55 CA 3).
export const CAMPAIGN_TYPES = ['DONATION', 'REWARD', 'PRESALE'] as const
export type CampaignType = typeof CAMPAIGN_TYPES[number]

export interface DraftInput {
  title: string
  summary: string
  campaignType: CampaignType
  fundingModel?: 'ALL_OR_NOTHING' | 'FLEXIBLE' | null
  categoryId: string | null
  organizationId: string | null
}

export interface Draft extends Omit<DraftInput, 'summary'> {
  id: string
  summary: string | null
  status: string
  builderStep: number
  updatedAt: Date
}

export function isCampaignType(value: string): value is CampaignType {
  return CAMPAIGN_TYPES.some((type) => type === value)
}

export function isValidBuilderStep(step: number): boolean {
  return Number.isInteger(step) && step >= FIRST_BUILDER_STEP && step <= LAST_BUILDER_STEP
}

export function normalizeDraft(input: DraftInput): DraftInput {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    campaignType: input.campaignType,
    categoryId: input.categoryId,
    organizationId: input.organizationId
  }
}

export function isValidTitle(title: string): boolean {
  const length = [...title].length
  return length > 0 && length <= 200
}

export function isValidSummary(summary: string): boolean {
  return [...summary].length <= 500
}

/**
 * Solo el borrador conserva la edición libre del asistente. Una campaña enviada o
 * publicada no vuelve a editarse por esta vía: cambiarla exige su propio flujo de
 * revisión, que no es parte de S1-16.
 */
export function allowsBuilderEditing(status: string): boolean {
  return status === 'DRAFT'
}

/**
 * Navegación entre pasos (BG-18 CA 3). Avanzar de uno en uno o retroceder a
 * cualquier paso ya alcanzado; no se salta hacia adelante sin pasar por el medio,
 * porque cada etapa valida lo suyo.
 */
export function allowsStepMove(current: number, next: number, campaignType?: CampaignType): boolean {
  return isValidBuilderStep(next) && (next <= current + 1 || (campaignType === 'DONATION' && current === 5 && next === 7))
}
