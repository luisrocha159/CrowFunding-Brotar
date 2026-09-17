import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readProfile, saveProfile, validateProfile } from '../src/features/access/session/profileClient'
import { SessionError } from '../src/features/access/session/sessionClient'

const input = { firstName: 'Ana', lastName: 'Prueba', phoneCountryCode: '', phoneNumber: '' }
test('perfil valida nombres y teléfono opcional en pareja', () => {
  assert.deepEqual(validateProfile(input), {})
  assert.ok(validateProfile({ ...input, firstName: ' ' }).firstName)
  assert.ok(validateProfile({ ...input, lastName: 'a'.repeat(121) }).lastName)
  assert.ok(validateProfile({ ...input, phoneCountryCode: '+591' }).phoneNumber)
  assert.deepEqual(validateProfile({ ...input, phoneCountryCode: '+591', phoneNumber: '70001234' }), {})
})
test('perfil consulta y guarda por cookie, solo campos permitidos y errores explícitos', async () => {
  const original = globalThis.fetch
  const profile = { ...input, email: 'own@example.invalid' }
  try {
    globalThis.fetch = (async (url, init) => {
      assert.equal(url, '/api/profile'); assert.equal(init?.credentials, 'same-origin'); assert.equal(init?.cache, 'no-store')
      if (init?.method === 'PATCH') {
        assert.equal((init.headers as Record<string, string>)['X-Brotar-Request'], '1')
        assert.deepEqual(JSON.parse(String(init.body)), input)
      }
      return Response.json(profile)
    }) as typeof fetch
    assert.deepEqual(await readProfile(), profile)
    assert.deepEqual(await saveProfile({ ...profile, firstName: ' Ana ' }), profile)
    for (const status of [400, 401, 503]) {
      globalThis.fetch = (async () => new Response(null, { status })) as typeof fetch
      await assert.rejects(saveProfile(input), (error: unknown) => error instanceof SessionError && error.status === status)
    }
    globalThis.fetch = (async () => Response.json({ status: 'ok' })) as typeof fetch
    await assert.rejects(readProfile(), SessionError)
    globalThis.fetch = (async () => { throw new TypeError('network') }) as typeof fetch
    await assert.rejects(saveProfile(input), SessionError)
  } finally { globalThis.fetch = original }
})
