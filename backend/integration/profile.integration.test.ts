import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { readEnvironment } from '../src/config/environment'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { UserProfileSchema, UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { ScryptPasswordHasher } from '../src/users/infrastructure/scrypt-password-hasher'

test('perfil real: acceso propio, validación, persistencia, teléfono y conservación de campos', { timeout: 60000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.ok(process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost', '::1'].includes(config.host))
  const source = createDataSource(config)
  const ids = [randomUUID(), randomUUID()]
  const password = randomBytes(24).toString('hex')
  const passwordHash = await new ScryptPasswordHasher().hash(password)
  const email = (id: string) => `profile-${id}@example.invalid`
  const createApp = async () => {
    const app = await NestFactory.create(AppModule, { logger: false })
    configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
    await app.listen(0, '127.0.0.1')
    return app
  }
  let app = await createApp()
  let base = await app.getUrl()
  const read = (cookie = '') => fetch(`${base}/api/profile`, { headers: { Cookie: cookie } })
  const patch = (body: unknown, cookie = '', extra: Record<string, string> = {}) => fetch(`${base}/api/profile`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Cookie: cookie, Origin: 'http://127.0.0.1:5173', ...extra }, body: JSON.stringify(body)
  })
  const input = { firstName: ' Nombre nuevo ', lastName: ' Apellido nuevo ', phoneCountryCode: '+591', phoneNumber: '70001234' }
  try {
    await source.initialize()
    await source.transaction(async manager => {
      for (const id of ids) {
        await manager.getRepository(UserSchema).insert({ id, email: email(id), passwordHash, status: id === ids[0] ? 'PENDING_VERIFICATION' : 'ACTIVE' })
        await manager.getRepository(UserProfileSchema).insert({ userId: id, firstName: 'Original', lastName: 'Prueba', bio: 'Se conserva', city: 'Cochabamba' })
      }
    })
    assert.equal((await read()).status, 401)
    assert.equal((await patch(input)).status, 401)
    const cookies: string[] = []
    for (const id of ids) {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1' }, body: JSON.stringify({ email: email(id), password }) })
      assert.equal(response.status, 200)
      cookies.push(response.headers.get('set-cookie')!.split(';')[0]!)
    }
    const own = cookies[0]!
    assert.equal((await patch(input, own, { 'X-Brotar-Request': '' })).status, 403)
    assert.equal((await patch(input, own, { Origin: 'https://untrusted.example' })).status, 403)
    for (const invalid of [
      { ...input, userId: ids[1] }, { ...input, status: 'ACTIVE' }, { ...input, role: 'ADMIN' },
      { ...input, email: 'change@example.invalid' }, { ...input, firstName: '' }, { ...input, lastName: 'x'.repeat(121) },
      { ...input, phoneNumber: '' }, { ...input, phoneCountryCode: '' }, { ...input, phoneNumber: null },
      { ...input, phoneNumber: 'abcdef' }
    ]) assert.equal((await patch(invalid, own)).status, 400)
    assert.equal((await source.getRepository(UserProfileSchema).findOneByOrFail({ userId: ids[0]! })).firstName, 'Original')
    const saved = await patch(input, own)
    assert.equal(saved.status, 200)
    assert.equal(saved.headers.get('cache-control'), 'no-store')
    const expected = { ...input, firstName: 'Nombre nuevo', lastName: 'Apellido nuevo', email: email(ids[0]!) }
    assert.deepEqual(await saved.json(), expected)
    const other = await (await read(cookies[1]!)).json() as { firstName: string }
    assert.equal(other.firstName, 'Original')
    const stored = await source.getRepository(UserProfileSchema).findOneByOrFail({ userId: ids[0]! })
    assert.equal(stored.city, 'Cochabamba'); assert.equal(stored.bio, 'Se conserva'); assert.equal(stored.administrativeAreaId, null)
    await app.close(); app = await createApp(); base = await app.getUrl()
    assert.deepEqual(await (await read(own)).json(), expected)
    assert.deepEqual((await source.query('SELECT status,email_verified_at,phone_verified_at FROM app_user WHERE id=$1', [ids[0]]))[0],
      { status: 'PENDING_VERIFICATION', email_verified_at: null, phone_verified_at: null })
    // Si se cambia un teléfono antes verificado, esa verificación deja de aplicar.
    await source.getRepository(UserSchema).update({ id: ids[0]! }, { phoneVerifiedAt: new Date() })
    assert.equal((await patch(input, own)).status, 200)
    assert.notEqual((await source.getRepository(UserSchema).findOneByOrFail({ id: ids[0]! })).phoneVerifiedAt, null)
    assert.equal((await patch({ ...input, phoneNumber: '70001235' }, own)).status, 200)
    assert.equal((await source.getRepository(UserSchema).findOneByOrFail({ id: ids[0]! })).phoneVerifiedAt, null)
    assert.equal((await patch({ ...input, phoneCountryCode: '', phoneNumber: '' }, own)).status, 200)
    assert.equal((await source.getRepository(UserSchema).findOneByOrFail({ id: ids[0]! })).phoneNumber, null)
    await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: own, 'X-Brotar-Request': '1' } })
    assert.equal((await patch(input, own)).status, 401)
    assert.equal((await read(own)).status, 401)
  } finally {
    await app.close()
    if (source.isInitialized) {
      try { for (const id of ids) await source.getRepository(UserSchema).delete({ id, email: email(id) }) }
      finally { await source.destroy() }
    }
  }
})
