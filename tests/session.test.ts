import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentUser, login, logout, SessionError } from '../src/features/access/session/sessionClient'

async function withFetch(mock: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try { await run() } finally { globalThis.fetch = original }
}
test('login y logout usan cookies same-origin y cabecera de protección, nunca localStorage', async () => {
  const paths: string[] = []
  await withFetch((async (url, init) => {
    paths.push(String(url))
    assert.equal(init?.credentials, 'same-origin')
    assert.equal(init?.cache, 'no-store')
    assert.equal((init?.headers as Record<string, string>)['X-Brotar-Request'], '1')
    if (String(url).endsWith('login')) {
      assert.deepEqual(JSON.parse(String(init?.body)), { email: 'test@example.invalid', password: ' clave exacta ' })
      return Response.json({ status: 'authenticated' })
    }
    return new Response(null, { status: 204 })
  }) as typeof fetch, async () => { await login(' TEST@example.invalid ', ' clave exacta '); await logout() })
  assert.deepEqual(paths, ['/api/auth/login', '/api/auth/logout'])
})
test('consulta de sesión valida respuesta; errores 401/403/503/red no fingen autenticación', async () => {
  const user = { id: 'own-test', email: 'test@example.invalid', firstName: 'Prueba', lastName: 'Sesión', status: 'ACTIVE' }
  await withFetch((async () => Response.json(user)) as typeof fetch, async () => assert.deepEqual(await currentUser(), user))
  for (const status of [401, 403, 503]) await withFetch((async () => new Response(null, { status })) as typeof fetch, async () => {
    await assert.rejects(currentUser(), (error: unknown) => error instanceof SessionError && error.status === status)
  })
  await withFetch((async () => Response.json({ status: 'ACTIVE' })) as typeof fetch, async () => { await assert.rejects(currentUser(), SessionError) })
  await withFetch((async () => { throw new TypeError('network') }) as typeof fetch, async () => { await assert.rejects(logout(), SessionError) })
})

test('sesión básica admite estado pendiente sin convertirlo en activo y rechaza estados no habilitados', async () => {
  const user = { id: 'own-test', email: 'test@example.invalid', firstName: 'Prueba', lastName: 'Sesión', status: 'PENDING_VERIFICATION' }
  await withFetch((async () => Response.json(user)) as typeof fetch, async () => assert.deepEqual(await currentUser(), user))
  for (const status of ['SUSPENDED', 'CLOSED', 'UNKNOWN']) {
    await withFetch((async () => Response.json({ ...user, status })) as typeof fetch, async () => { await assert.rejects(currentUser(), SessionError) })
  }
})
