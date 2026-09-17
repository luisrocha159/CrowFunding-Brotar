import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { readEnvironment } from '../src/config/environment'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { UserProfileSchema, UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { SessionTokenSchema } from '../src/auth/infrastructure/session-token.schema'
import { ScryptPasswordHasher } from '../src/users/infrastructure/scrypt-password-hasher'

test('sesiones reales: cookies, estados de cuenta, rotación, expiración, revocación y reinicio de API', { timeout: 60000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.ok(process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost', '::1'].includes(config.host))
  const source = createDataSource(config)
  const ids = [randomUUID(), randomUUID()]
  const emails = ids.map(id => `session-${id}@example.invalid`)
  const password = randomBytes(24).toString('hex')
  const passwordHash = await new ScryptPasswordHasher().hash(password)
  const createApp = async () => {
    const instance = await NestFactory.create(AppModule, { logger: false })
    configureHttp(instance, readEnvironment({ NODE_ENV: 'test' }))
    await instance.listen(0, '127.0.0.1')
    return instance
  }
  let app = await createApp()
  let base = await app.getUrl()
  const post = (path: string, body: unknown = {}, cookie = '', extra: Record<string, string> = {}) => fetch(`${base}/api/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173', Cookie: cookie, ...extra }, body: JSON.stringify(body)
  })
  const me = (cookie = '') => fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } })
  const credentials = { email: emails[0], password }
  const cookieFrom = (response: Response) => {
    const header = response.headers.get('set-cookie') ?? ''
    assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=Strict/i); assert.match(header, /Path=\/api/i)
    const cookie = header.split(';')[0]!
    assert.match(cookie, /^brotar_session=[a-f0-9]{64}$/)
    return cookie
  }
  const tokenHash = (cookie: string) => createHash('sha256').update(cookie.split('=')[1]!).digest('hex')
  try {
    await source.initialize()
    await source.transaction(async manager => {
      for (let i = 0; i < ids.length; i++) {
        await manager.getRepository(UserSchema).insert({ id: ids[i]!, email: emails[i]!, passwordHash, status: i === 0 ? 'ACTIVE' : 'PENDING_VERIFICATION' })
        await manager.getRepository(UserProfileSchema).insert({ userId: ids[i]!, firstName: 'Prueba', lastName: 'Sesión' })
      }
    })
    assert.equal((await me()).status, 401)
    assert.equal((await post('login', credentials, '', { 'X-Brotar-Request': '' })).status, 403)
    assert.equal((await post('login', credentials, '', { Origin: 'https://untrusted.example' })).status, 403)
    assert.equal((await post('login', credentials, '', { 'Sec-Fetch-Site': 'cross-site' })).status, 403)
    assert.equal((await post('login', { ...credentials, role: 'ADMIN' })).status, 400)
    assert.equal((await post('login', { ...credentials, password: 'incorrecta' })).status, 401)
    assert.equal((await post('login', { email: `missing-${ids[0]}@example.invalid`, password })).status, 401)
    const pendingLogin = await post('login', { email: emails[1], password })
    assert.equal(pendingLogin.status, 200)
    const pendingCookie = cookieFrom(pendingLogin)
    const pendingMe = await me(pendingCookie)
    assert.equal(pendingMe.status, 200)
    assert.equal((await pendingMe.json() as { status: string }).status, 'PENDING_VERIFICATION')
    assert.deepEqual((await source.query('SELECT status,email_verified_at,phone_verified_at FROM app_user WHERE id=$1', [ids[1]]))[0],
      { status: 'PENDING_VERIFICATION', email_verified_at: null, phone_verified_at: null })
    await post('logout', {}, pendingCookie)
    assert.equal((await me(pendingCookie)).status, 401)
    const first = await post('login', credentials)
    assert.equal(first.status, 200)
    assert.deepEqual(await first.json(), { status: 'authenticated' })
    const cookie = cookieFrom(first)
    const stored = await source.getRepository(SessionTokenSchema).createQueryBuilder('t').addSelect('t.tokenHash').where('t.token_hash=:hash', { hash: tokenHash(cookie) }).getOneOrFail()
    assert.notEqual(stored.tokenHash, cookie.split('=')[1])
    assert.equal(stored.tokenType, 'SESSION')
    const authenticated = await me(cookie)
    assert.equal(authenticated.status, 200)
    assert.equal(authenticated.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await authenticated.json(), { id: ids[0], email: emails[0], firstName: 'Prueba', lastName: 'Sesión', status: 'ACTIVE' })
    const rotated = cookieFrom(await post('login', credentials, cookie))
    assert.notEqual(rotated, cookie)
    assert.equal((await me(cookie)).status, 401)
    assert.equal((await me(rotated)).status, 200)
    assert.equal((await post('logout', {}, rotated, { Origin: 'https://untrusted.example' })).status, 403)
    assert.equal((await me(rotated)).status, 200)
    assert.equal((await post('logout', {}, rotated)).status, 204)
    assert.equal((await me(rotated)).status, 401)
    assert.equal((await post('logout', {}, rotated)).status, 204)
    const expires = cookieFrom(await post('login', credentials))
    await source.getRepository(SessionTokenSchema).update({ tokenHash: tokenHash(expires) }, { usedAt: new Date() })
    assert.equal((await me(expires)).status, 401)
    await source.getRepository(SessionTokenSchema).update({ tokenHash: tokenHash(expires) }, { usedAt: null, createdAt: new Date(Date.now() - 7200000), expiresAt: new Date(Date.now() - 1000) })
    assert.equal((await me(expires)).status, 401)
    const suspended = cookieFrom(await post('login', credentials))
    await source.getRepository(UserSchema).update({ id: ids[0] }, { status: 'SUSPENDED' })
    assert.equal((await me(suspended)).status, 401)
    assert.equal((await post('login', credentials)).status, 403)
    await source.getRepository(UserSchema).update({ id: ids[0] }, { status: 'CLOSED' })
    assert.equal((await me(suspended)).status, 401)
    assert.equal((await post('login', credentials)).status, 403)
    await source.getRepository(UserSchema).update({ id: ids[0] }, { status: 'ACTIVE', failedLoginCount: 0 })
    await source.getRepository(UserSchema).update({ id: ids[0] }, { deletedAt: new Date() })
    assert.equal((await me(suspended)).status, 401)
    await source.getRepository(UserSchema).update({ id: ids[0] }, { deletedAt: null })
    for (let i = 0; i < 5; i++) assert.equal((await post('login', { ...credentials, password: 'incorrecta' })).status, 401)
    assert.equal((await post('login', credentials)).status, 403)
    assert.equal((await me(suspended)).status, 401)
    await source.getRepository(UserSchema).update({ id: ids[0] }, { lockedUntil: new Date(Date.now() - 1000) })
    assert.equal((await post('login', { ...credentials, password: 'incorrecta' })).status, 401)
    assert.equal((await source.getRepository(UserSchema).findOneByOrFail({ id: ids[0] })).failedLoginCount, 1)
    const persistent = cookieFrom(await post('login', credentials))
    await app.close(); app = await createApp(); base = await app.getUrl()
    assert.equal((await me(persistent)).status, 200)
    assert.equal((await post('logout', {}, persistent)).status, 204)
    assert.equal((await me(persistent)).status, 401)
    assert.equal((await source.getRepository(UserSchema).findOneByOrFail({ id: ids[1] })).status, 'PENDING_VERIFICATION')
  } finally {
    try {
      if (source.isInitialized) for (let i = 0; i < ids.length; i++) {
        // El FK del backup elimina también los tokens de estas cuentas temporales.
        await source.getRepository(UserSchema).delete({ id: ids[i]!, email: emails[i]! })
      }
    } finally { await app.close(); if (source.isInitialized) await source.destroy() }
  }
})
