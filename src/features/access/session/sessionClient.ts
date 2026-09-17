export interface CurrentUser { id: string; email: string; firstName: string; lastName: string; status: 'ACTIVE' | 'PENDING_VERIFICATION' }
export class SessionError extends Error {
  constructor(readonly status: number) { super('No se pudo completar la operación de sesión.') }
}
async function send(path: string, method: 'GET' | 'POST', body?: unknown, signal?: AbortSignal): Promise<Response> {
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', ...(method === 'POST' ? { 'X-Brotar-Request': '1' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new SessionError(response.status)
    return response
  } catch (error) {
    throw error instanceof SessionError ? error : new SessionError(0)
  }
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
