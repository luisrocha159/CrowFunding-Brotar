import { normalizeEmail, profileLabels, validateEmail, type AccessProfile } from '../validation'
import { PERSON_NAME, PERSON_NAME_HELP } from '../../../shared/validation/personName'
import { phoneErrors } from '../../../../backend/src/shared/domain/phone'

export type RegistrationValues = {
  firstName: string; lastName: string; email: string; password: string; confirmation: string
  phoneCountryCode: string; phoneNumber: string; profile: AccessProfile; terms: boolean
}
export type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>
export { profileLabels, type AccessProfile }
export async function checkEmailAvailability(email: string, signal?: AbortSignal, send: typeof fetch = fetch): Promise<boolean> {
  const normalized = normalizeEmail(email)
  if (validateEmail(normalized)) throw new RegistrationError('invalid', { email: 'Revisa el formato del correo.' })
  const timeout = AbortSignal.timeout(10000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  let response: Response
  try {
    response = await send('/api/auth/email-availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalized }), signal: combined, credentials: 'omit', cache: 'no-store', redirect: 'error' })
  } catch { throw new RegistrationError('unavailable') }
  if (response.status === 429) throw new RegistrationError('busy')
  if (response.status !== 201) throw new RegistrationError('unavailable')
  const data: unknown = await response.json().catch(() => null)
  if (!data || typeof data !== 'object' || !('email' in data) || data.email !== normalized || !('available' in data) || typeof data.available !== 'boolean') throw new RegistrationError('unknown')
  return data.available
}
export const REGISTRATION_PASSWORD_HELP = 'Usa entre 15 y 128 caracteres. Puedes usar una frase; no reutilices una contraseña personal en esta prueba.'
export function passwordLengthGuidance(password: string): { count: number; valid: boolean; message: string } {
  const count = Array.from(password).length
  const valid = count >= 15 && count <= 128 && !!password.trim()
  return {
    count, valid,
    message: !count ? 'Escribe una frase de al menos 15 caracteres.'
      : !password.trim() ? 'La contraseña no puede contener solo espacios.'
        : count < 15 ? `Faltan ${15 - count} caracteres para el mínimo.`
          : count > 128 ? 'Supera el máximo de 128 caracteres.'
            : 'Cumple la longitud mínima. Este indicador no mide toda la seguridad de la contraseña.'
  }
}
export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {}
  const email = validateEmail(values.email)
  if (email) errors.email = email
  for (const key of ['firstName', 'lastName'] as const) {
    if (!values[key].trim() || Array.from(values[key].trim()).length > 120) errors[key] = 'Ingresa entre 1 y 120 caracteres.'
    else if (!PERSON_NAME.test(values[key].trim())) errors[key] = PERSON_NAME_HELP
  }
  const length = Array.from(values.password).length
  if (length < 15 || length > 128 || !values.password.trim()) errors.password = 'Usa entre 15 y 128 caracteres, no solo espacios.'
  if (values.confirmation !== values.password || !values.confirmation) errors.confirmation = 'Las contraseñas deben coincidir exactamente.'
  Object.assign(errors, phoneErrors(values.phoneCountryCode, values.phoneNumber))
  if (!Object.hasOwn(profileLabels, values.profile)) errors.profile = 'Selecciona un perfil disponible.'
  if (!values.terms) errors.terms = 'Confirma que entiendes que estos datos se guardarán en la base de pruebas.'
  return errors
}
export type RegistrationFailure = 'invalid' | 'conflict' | 'unavailable' | 'busy' | 'unknown'
export class RegistrationError extends Error {
  constructor(readonly kind: RegistrationFailure, readonly fields: RegistrationErrors = {}) { super(kind) }
}
const serverFields = ['firstName', 'lastName', 'email', 'password', 'phoneCountryCode', 'phoneNumber', 'demoConsent'] as const
export function registrationErrorsFrom(message: unknown): RegistrationErrors {
  const errors: RegistrationErrors = {}
  if (!Array.isArray(message)) return errors
  for (const detail of message) {
    if (typeof detail !== 'string') continue
    const field = serverFields.find(key => detail.startsWith(`${key} `) || detail.startsWith(`${key}:`))
    if (!field) continue
    const key = field === 'demoConsent' ? 'terms' : field
    errors[key] = field === 'phoneCountryCode' ? 'Revisa el prefijo internacional, por ejemplo +591.'
      : field === 'phoneNumber' ? 'Usa solo dígitos, con un máximo de 15 entre el prefijo y el teléfono.'
        : field === 'password' ? 'Usa una frase de 15 a 128 caracteres que no sea solo espacios.'
          : field === 'email' ? 'Revisa el formato del correo electrónico.'
            : field === 'demoConsent' ? 'Confirma que entiendes el uso de la base de pruebas.'
              : 'Revisa este dato; el servidor no lo aceptó.'
  }
  return errors
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
  if (response.status === 400) {
    const detail: unknown = await response.json().catch(() => null)
    const message = detail && typeof detail === 'object' && 'message' in detail ? detail.message : null
    throw new RegistrationError('invalid', registrationErrorsFrom(message))
  }
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
