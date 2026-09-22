import { normalizeEmail, validateEmail } from '../validation'

export type RecoveryFailure = 'invalid' | 'busy' | 'expired' | 'unavailable' | 'unknown'
export class RecoveryError extends Error {
  constructor(readonly kind: RecoveryFailure) { super(kind) }
}
export type RecoveryRequestResult = { accepted: true; resetPath?: string }
export type ResetValues = { token: string; password: string; confirmation: string }
export type ResetErrors = Partial<Record<keyof ResetValues | 'email', string>>
export const RESET_PASSWORD_HELP = 'Usa entre 15 y 128 caracteres. No reutilices una contraseña personal en esta prueba.'

async function send(path: string, body: unknown, signal?: AbortSignal, request: typeof fetch = fetch): Promise<Response> {
  let response: Response
  try {
    response = await request(`/api/auth/password/${path}`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1' },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    })
  } catch { throw new RecoveryError('unknown') }
  if (response.status === 400) throw new RecoveryError('invalid')
  if (response.status === 401) throw new RecoveryError('expired')
  if (response.status === 429) throw new RecoveryError('busy')
  if (response.status === 503) throw new RecoveryError('unavailable')
  return response
}

export function validateRecoveryEmail(email: string): ResetErrors {
  const error = validateEmail(email)
  return error ? { email: error } : {}
}

export function validateReset(values: ResetValues): ResetErrors {
  const errors: ResetErrors = {}
  if (!/^[a-f0-9]{64}$/i.test(values.token)) errors.token = 'El enlace de recuperación no es válido.'
  const length = Array.from(values.password).length
  if (length < 15 || length > 128 || !values.password.trim()) errors.password = 'Usa entre 15 y 128 caracteres, no solo espacios.'
  if (values.confirmation !== values.password || !values.confirmation) errors.confirmation = 'Las contraseñas deben coincidir exactamente.'
  return errors
}

export async function requestPasswordRecovery(email: string, signal?: AbortSignal, request?: typeof fetch): Promise<RecoveryRequestResult> {
  const response = await send('recovery', { email: normalizeEmail(email) }, signal, request)
  if (response.status !== 202) throw new RecoveryError('unknown')
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || !('accepted' in body) || body.accepted !== true) throw new Error('invalid-response')
    const resetPath = 'resetPath' in body && typeof body.resetPath === 'string' && body.resetPath.startsWith('/recuperar-contrasena?token=') ? body.resetPath : undefined
    return { accepted: true, ...(resetPath ? { resetPath } : {}) }
  } catch { throw new RecoveryError('unknown') }
}

export async function resetPassword(values: ResetValues, signal?: AbortSignal, request?: typeof fetch): Promise<void> {
  const response = await send('reset', { token: values.token, password: values.password }, signal, request)
  if (response.status !== 204) throw new RecoveryError('unknown')
}
