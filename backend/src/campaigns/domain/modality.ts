import { isCampaignType, type CampaignType } from './draft'
export { CAMPAIGN_TYPES, isCampaignType } from './draft'
export type { CampaignType } from './draft'

// Valores del enum funding_model del esquema oficial. No se añade ninguno.
export const FUNDING_MODELS = ['ALL_OR_NOTHING', 'FLEXIBLE'] as const
export type FundingModel = typeof FUNDING_MODELS[number]

export function isFundingModel(value: string): value is FundingModel {
  return FUNDING_MODELS.some((model) => model === value)
}

/**
 * La donación omite los requisitos de recompensas (BG-15 CA 2). Recompensa y
 * preventa sí los piden. Qué exige exactamente cada una es contenido de D02;
 * aquí solo se decide si la etapa de recompensas aplica.
 */
export function requiresRewards(type: CampaignType): boolean {
  return type === 'REWARD' || type === 'PRESALE'
}

/**
 * Cambiar de modalidad no descarta datos en silencio (BG-15 CA 3).
 *
 * Al pasar a donación, las recompensas ya cargadas dejan de aplicar. No se
 * borran ni se desactivan: se conservan intactas y el creador debe reconocer
 * el cambio antes de aplicarlo. Si vuelve a recompensa o preventa, siguen ahí.
 * Qué hacer finalmente con ellas al publicar es una decisión de D02.
 */
export function needsRewardAcknowledgement(from: CampaignType, to: CampaignType, rewardCount: number): boolean {
  return requiresRewards(from) && !requiresRewards(to) && rewardCount > 0
}

export function isValidModalityChange(to: string): to is CampaignType {
  return isCampaignType(to)
}
