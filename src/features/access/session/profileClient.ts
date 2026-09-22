import { SessionError } from './sessionClient'
import { PERSON_NAME, PERSON_NAME_HELP } from '../../../shared/validation/personName'
export interface ProfileInput { firstName: string; lastName: string; phoneCountryCode: string; phoneNumber: string }
export interface Profile extends ProfileInput { email: string }
export function validateProfile(input: ProfileInput): Partial<Record<keyof ProfileInput, string>> {
  const errors: Partial<Record<keyof ProfileInput, string>> = {}
  for (const key of ['firstName', 'lastName'] as const) {
    const length = [...input[key].trim()].length
    if (length < 1 || length > 120) errors[key] = 'Escribe entre 1 y 120 caracteres.'
    else if (!PERSON_NAME.test(input[key].trim())) errors[key] = PERSON_NAME_HELP
  }
  if (input.phoneCountryCode.trim() || input.phoneNumber.trim()) {
    if (!/^\+[1-9]\d{0,4}$/.test(input.phoneCountryCode.trim())) errors.phoneCountryCode = 'Usa un prefijo como +591 o deja ambos campos vacíos.'
    if (!/^\d{4,30}$/.test(input.phoneNumber.trim())) errors.phoneNumber = 'Escribe entre 4 y 30 dígitos o deja ambos campos vacíos.'
  }
  return errors
}
async function requestProfile(input?: ProfileInput, signal?: AbortSignal): Promise<Profile> {
  try {
    const response = await fetch('/api/profile', {
      method: input ? 'PATCH' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', ...(input ? { 'X-Brotar-Request': '1' } : {}) },
      ...(input ? { body: JSON.stringify({ firstName: input.firstName.trim(), lastName: input.lastName.trim(), phoneCountryCode: input.phoneCountryCode.trim(), phoneNumber: input.phoneNumber.trim() }) } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new SessionError(response.status)
    const body = await response.json() as Partial<Profile> | null
    if (!body || typeof body.email !== 'string' || typeof body.firstName !== 'string' || typeof body.lastName !== 'string'
      || typeof body.phoneCountryCode !== 'string' || typeof body.phoneNumber !== 'string') throw new SessionError(0)
    return { email: body.email, firstName: body.firstName, lastName: body.lastName, phoneCountryCode: body.phoneCountryCode, phoneNumber: body.phoneNumber }
  } catch (error) { throw error instanceof SessionError ? error : new SessionError(0) }
}
export const readProfile = (signal?: AbortSignal): Promise<Profile> => requestProfile(undefined, signal)
export const saveProfile = (input: ProfileInput, signal?: AbortSignal): Promise<Profile> => requestProfile(input, signal)
