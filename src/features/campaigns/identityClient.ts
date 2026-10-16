import { SessionError } from '../../shared/api/sessionError'
import { validDate } from '../../../backend/src/campaigns/domain/input-policy'
import type { InitiativeStage } from '../../../backend/src/campaigns/domain/initiative'

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
export function initiativeStageFrom(value: unknown): InitiativeStage {
  const keys = ['id','initiativeId','initiativeName','purpose','siteReference','countryCode','locality','stageName','objective','startsOn','endsOn']
  if (!object(value) || !keys.every(key => typeof value[key] === 'string') || !validDate(value.startsOn as string) || !validDate(value.endsOn as string)) throw new SessionError(0)
  return value as unknown as InitiativeStage
}
