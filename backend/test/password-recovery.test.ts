import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { PasswordRecovery, PasswordResetUnavailable, type PasswordRecoveryRepository } from '../src/auth/application/password-recovery'

function fixture(issued = true, reset = true) {
  const events: string[] = []
  const repository: PasswordRecoveryRepository = {
    issue: async (email, hash, expiresAt) => { events.push(`issue:${email}:${hash}:${expiresAt.toISOString()}`); return issued },
    reset: async (hash, passwordHash) => { events.push(`reset:${hash}:${passwordHash}`); return reset }
  }
  const service = new PasswordRecovery(repository, { hash: async password => `hash-password:${password}` }, {
    hash: raw => `hash-token:${raw}`,
    create: () => ({ raw: 'a'.repeat(64), hash: 'hash-token:created', expiresAt: new Date('2026-09-18T12:00:00.000Z') })
  }, true)
  return { service, events }
}

test('recuperación normaliza correo y solo expone enlace local cuando se emitió token', async () => {
  const f = fixture()
  assert.deepEqual(await f.service.request(' TEST@example.invalid '), { accepted: true, resetPath: `/recuperar-contrasena?token=${'a'.repeat(64)}` })
  assert.deepEqual(f.events, ['issue:test@example.invalid:hash-token:created:2026-09-18T12:00:00.000Z'])
  const missing = fixture(false)
  assert.deepEqual(await missing.service.request('missing@example.invalid'), { accepted: true })
})

test('restablecimiento consume token hasheado y propaga enlace vencido o usado', async () => {
  const f = fixture()
  await f.service.reset('raw-token', 'nueva frase de prueba')
  assert.deepEqual(f.events, ['reset:hash-token:raw-token:hash-password:nueva frase de prueba'])
  await assert.rejects(fixture(true, false).service.reset('raw-token', 'nueva frase de prueba'), PasswordResetUnavailable)
})
