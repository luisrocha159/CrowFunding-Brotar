import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import type { Request } from 'express'
import { AccountUnavailable, InvalidCredentials, SessionMissing, Sessions, type Credentials, type SessionRepository } from '../src/auth/application/sessions'
import { readSessionCookie, sessionCookieOptions } from '../src/auth/infrastructure/http/session-http'
import { ScryptPasswordHasher } from '../src/users/infrastructure/scrypt-password-hasher'

function fixture() {
  let user: Credentials | null = { id: 'test-user', passwordHash: 'encoded', status: 'ACTIVE', lockedUntil: null }
  const events: string[] = []
  let allow = true
  const repository: SessionRepository = {
    credentials: async email => { events.push(email); return user },
    failedAttempt: async () => { events.push('failed') },
    open: async (_user, hash, _expiry, old) => { events.push(`open:${hash}:${old}`); return allow },
    current: async () => null,
    revoke: async hash => { events.push(`revoke:${hash}`) }
  }
  const service = new Sessions(repository, { verify: async (password, encoded) => password === 'correct' && encoded === 'encoded' }, {
    hash: raw => `hash:${raw}`, create: () => ({ raw: 'new', hash: 'hash:new', expiresAt: new Date(Date.now() + 3600000) })
  })
  return { service, events, setUser: (value: Credentials | null) => { user = value }, denyOpen: () => { allow = false } }
}
test('acceso normaliza correo, abre sesión nueva y transmite hash del token anterior', async () => {
  const f = fixture()
  assert.equal((await f.service.login(' TEST@EXAMPLE.INVALID ', 'correct', 'previous')).token, 'new')
  assert.deepEqual(f.events, ['test@example.invalid', 'open:hash:new:hash:previous'])
})
test('credenciales inválidas no crean sesión; cuenta inexistente usa la misma ruta de verificación', async () => {
  const f = fixture()
  await assert.rejects(f.service.login('x', 'wrong'), InvalidCredentials)
  assert.deepEqual(f.events, ['x', 'failed'])
  f.setUser(null)
  await assert.rejects(f.service.login('missing', 'correct'), InvalidCredentials)
  assert.equal(f.events.some(item => item.startsWith('open:')), false)
})
test('cuenta pendiente puede acceder sin cambiar su estado', async () => {
  const f = fixture()
  const user: Credentials = { id: 'own-test', passwordHash: 'encoded', status: 'PENDING_VERIFICATION', lockedUntil: null }
  f.setUser(user)
  assert.equal((await f.service.login('x', 'correct')).token, 'new')
  assert.equal(user.status, 'PENDING_VERIFICATION')
})

test('suspendidos, cerrados, estados desconocidos y bloqueados no abren sesión', async () => {
  for (const value of [
    { status: 'SUSPENDED', lockedUntil: null }, { status: 'CLOSED', lockedUntil: null },
    { status: 'UNKNOWN', lockedUntil: null },
    { status: 'PENDING_VERIFICATION', lockedUntil: new Date(Date.now() + 60000) },
    { status: 'ACTIVE', lockedUntil: new Date(Date.now() + 60000) }
  ]) {
    const f = fixture(); f.setUser({ id: 'own-test', passwordHash: 'encoded', ...value })
    await assert.rejects(f.service.login('x', 'correct'), AccountUnavailable)
    assert.equal(f.events.length, 1)
  }
})
test('rechaza cambio de estado durante la autenticación y revoca por hash al salir', async () => {
  const f = fixture(); f.denyOpen()
  await assert.rejects(f.service.login('x', 'correct'), AccountUnavailable)
  await assert.rejects(f.service.current(), SessionMissing)
  await assert.rejects(f.service.current('missing'), SessionMissing)
  await f.service.logout('own-token')
  assert.ok(f.events.includes('revoke:hash:own-token'))
})
test('cookie rechaza valores ambiguos/malformados y tiene HttpOnly/SameSite', () => {
  const raw = 'a'.repeat(64)
  const read = (cookie: string) => readSessionCookie({ headers: { cookie } } as Request)
  assert.equal(read(`brotar_session=${raw}`), raw)
  assert.equal(read(`brotar_session=${raw}; brotar_session=${raw}`), undefined)
  assert.equal(read('brotar_session=malformed'), undefined)
  assert.equal(read(`otro=${raw}`), undefined)
  assert.equal(sessionCookieOptions().httpOnly, true)
  assert.equal(sessionCookieOptions().sameSite, 'strict')
})
test('verificador de contraseñas acepta solo formato soportado y contraseña exacta', async () => {
  const hasher = new ScryptPasswordHasher()
  const hash = await hasher.hash(' frase exclusiva de prueba ')
  assert.equal(await hasher.verify(' frase exclusiva de prueba ', hash), true)
  assert.equal(await hasher.verify('frase exclusiva de prueba', hash), false)
  assert.equal(await hasher.verify('incorrecta', null), false)
  assert.equal(await hasher.verify('incorrecta', 'scrypt$999999999999$8$1$invalid'), false)
})
