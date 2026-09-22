import { normalizeEmail, profileLabels, validateEmail, type AccessProfile } from '../validation'
import { PERSON_NAME, PERSON_NAME_HELP } from '../../../shared/validation/personName'

export type RegistrationValues = {
  firstName: string; lastName: string; email: string; password: string; confirmation: string
  phoneCountryCode: string; phoneNumber: string; profile: AccessProfile; terms: boolean
}
export type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>
export { profileLabels, type AccessProfile }
export const REGISTRATION_PASSWORD_HELP = 'Usa entre 15 y 128 caracteres. Puedes usar una frase; no reutilices una contraseña personal en esta prueba.'
export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {}
  for (const key of ['firstName', 'lastName'] as const) {
    if (!values[key].trim() || Array.from(values[key].trim()).length > 120) errors[key] = 'Ingresa entre 1 y 120 caracteres.'
    else if (!PERSON_NAME.test(values[key].trim())) errors[key] = PERSON_NAME_HELP
  }
  const email = validateEmail(values.email)
  if (email) errors.email = email
  const length = Array.from(values.password).length
  if (length < 15 || length > 128 || !values.password.trim()) errors.password = 'Usa entre 15 y 128 caracteres, no solo espacios.'
  if (values.confirmation !== values.password || !values.confirmation) errors.confirmation = 'Las contraseñas deben coincidir exactamente.'
  if (values.phoneCountryCode.trim() || values.phoneNumber.trim()) {
    if (!/^\+[1-9]\d{0,4}$/.test(values.phoneCountryCode.trim())) errors.phoneCountryCode = 'Ingresa el prefijo internacional, por ejemplo +591.'
    if (!/^\d{4,30}$/.test(values.phoneNumber.trim())) errors.phoneNumber = 'Ingresa de 4 a 30 dígitos, sin espacios.'
  }
  if (!Object.hasOwn(profileLabels, values.profile)) errors.profile = 'Selecciona un perfil disponible.'
  if (!values.terms) errors.terms = 'Confirma que entiendes que estos datos se guardarán en la base de pruebas.'
  return errors
}
export type RegistrationFailure = 'invalid' | 'conflict' | 'unavailable' | 'busy' | 'unknown'
export class RegistrationError extends Error {
  constructor(readonly kind: RegistrationFailure) { super(kind) }
}
export interface RegistrationResult { id: string; status: 'PENDING_VERIFICATION' }
export async function registerAccount(values: RegistrationValues, signal?: AbortSignal, send: typeof fetch = fetch): Promise<RegistrationResult> {
  const timeout = AbortSignal.timeout(15000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  const body = {
    firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: normalizeEmail(values.email),
    password: values.password, demoConsent: values.terms,
    ...(values.phoneCountryCode.trim() || values.phoneNumber.trim()
      ? { phoneCountryCode: values.phoneCountryCode.trim(), phoneNumber: values.phoneNumber.trim() } : {})
  }
  let response: Response
  try {
    response = await send('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal: combined, credentials: 'omit', cache: 'no-store', redirect: 'error'
    })
  } catch { throw new RegistrationError('unknown') }
  if (response.status === 400) throw new RegistrationError('invalid')
  if (response.status === 409) throw new RegistrationError('conflict')
  if (response.status === 429) throw new RegistrationError('busy')
  if (response.status === 503) throw new RegistrationError('unavailable')
  if (response.status !== 201) throw new RegistrationError('unknown')
  try {
    const result: unknown = await response.json()
    if (typeof result !== 'object' || result === null || !('id' in result) || !('status' in result)
      || typeof result.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(result.id) || result.status !== 'PENDING_VERIFICATION') {
      throw new Error('invalid-response')
    }
    return { id: result.id, status: result.status }
  } catch { throw new RegistrationError('unknown') }
}
