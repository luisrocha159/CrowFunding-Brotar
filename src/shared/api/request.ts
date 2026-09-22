import { SessionError } from './sessionError'

interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  errorFromResponse?: (response: Response) => Promise<SessionError>
}

/** Transporte común; cada módulo conserva su contrato y validación de datos. */
export async function requestApi(path: string, options: ApiRequest = {}, send: typeof fetch = fetch): Promise<Response> {
  const { method = 'GET', body, signal, errorFromResponse } = options
  try {
    const response = await send(path, {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', ...(method === 'GET' ? {} : { 'X-Brotar-Request': '1' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    })
    if (!response.ok) throw errorFromResponse ? await errorFromResponse(response) : new SessionError(response.status)
    return response
  } catch (error) {
    throw error instanceof SessionError ? error : new SessionError(0)
  }
}

/** Solo los contratos opcionales admiten cuerpo vacío; no oculta JSON mal formado. */
export async function readJson(response: Response, allowEmpty = false): Promise<unknown> {
  try {
    const text = await response.text()
    if (allowEmpty && text.trim() === '') return null
    return JSON.parse(text) as unknown
  } catch { throw new SessionError(0) }
}
