import { SessionError } from '../../../shared/api/sessionError'
import { requestApi } from '../../../shared/api/request'
export { SessionError } from '../../../shared/api/sessionError'
export interface CurrentUser { id: string; email: string; firstName: string; lastName: string; status: 'ACTIVE' | 'PENDING_VERIFICATION' }
async function send(path: string, method: 'GET' | 'POST', body?: unknown, signal?: AbortSignal): Promise<Response> {
  return requestApi(`/api/auth/${path}`, { method, body, signal })
}
export async function login(email: string, password: string, signal?: AbortSignal): Promise<void> {
  const response = await send('login', 'POST', { email: email.trim().toLowerCase(), password }, signal)
  try {
    const result = await response.json() as { status?: string }
    if (result.status !== 'authenticated') throw new SessionError(0)
  } catch { throw new SessionError(0) }
}
export async function currentUser(signal?: AbortSignal): Promise<CurrentUser> {
  const response = await send('me', 'GET', undefined, signal)
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || !('id' in body) || !('email' in body) || !('firstName' in body) || !('lastName' in body)
      || !('status' in body) || (body.status !== 'ACTIVE' && body.status !== 'PENDING_VERIFICATION') || typeof body.id !== 'string' || typeof body.email !== 'string'
      || typeof body.firstName !== 'string' || typeof body.lastName !== 'string') throw new SessionError(0)
    return { id: body.id, email: body.email, firstName: body.firstName, lastName: body.lastName, status: body.status }
  } catch { throw new SessionError(0) }
}
export async function logout(): Promise<void> { await send('logout', 'POST') }
