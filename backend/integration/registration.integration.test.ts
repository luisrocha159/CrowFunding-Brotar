import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { randomUUID, randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { readEnvironment } from '../src/config/environment'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { UserProfileSchema, UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { TypeormRegistrationRepository } from '../src/users/infrastructure/persistence/typeorm-registration.repository'

test('registro HTTP real: persistencia atómica, duplicados, teléfono y rollback', { timeout: 30000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.ok(process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost', '::1'].includes(config.host))
  const suffix = randomUUID()
  const emails = [`registration-${suffix}@example.invalid`, `race-${suffix}@example.invalid`, `rollback-${suffix}@example.invalid`]
  const source = createDataSource(config)
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  try {
    await source.initialize()
    await app.listen(0, '127.0.0.1')
    const base = await app.getUrl()
    const post = (body: unknown) => fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const input = { firstName: 'Prueba', lastName: 'Registro', email: emails[0], password: randomBytes(24).toString('hex'), demoConsent: true }
    const response = await post(input)
    assert.equal(response.status, 201)
    const result = await response.json() as { id: string; status: string }
    assert.deepEqual(Object.keys(result).sort(), ['id', 'status'])
    assert.equal(result.status, 'PENDING_VERIFICATION')
    await source.destroy()
    await source.initialize()
    const user = await source.getRepository(UserSchema).findOneByOrFail({ id: result.id })
    assert.equal(user.email, emails[0])
    assert.equal(user.emailVerifiedAt, null)
    assert.equal(user.acceptedTermsAt, null)
    assert.deepEqual(await source.query('SELECT r.code FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=$1', [result.id]), [{ code: 'REGISTERED_USER' }])
    assert.equal(user.passwordHash, undefined)
    assert.equal((await source.getRepository(UserProfileSchema).findOneByOrFail({ userId: result.id })).firstName, 'Prueba')
    const secret = await source.getRepository(UserSchema).createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :id', { id: result.id }).getOneOrFail()
    assert.match(secret.passwordHash, /^scrypt\$16384\$8\$5\$/)
    assert.notEqual(secret.passwordHash, input.password)
    assert.equal((await post({ ...input, email: emails[0]!.toUpperCase() })).status, 409)
    const race = { ...input, email: emails[1], phoneCountryCode: '+591', phoneNumber: `9${Date.now()}` }
    const responses = await Promise.all([post(race), post(race)])
    assert.deepEqual(responses.map(item => item.status).sort(), [201, 409])
    const phoneUser = await source.getRepository(UserSchema).findOneByOrFail({ email: emails[1] })
    assert.equal(phoneUser.phoneCountryCode, '+591')
    assert.equal(phoneUser.phoneNumber, race.phoneNumber)
    assert.equal(await source.getRepository(UserSchema).countBy({ email: emails[1] }), 1)
    // Falla el perfil después del INSERT de usuario: ambos deben revertirse.
    await assert.rejects(app.get(TypeormRegistrationRepository).create({ firstName: 'x'.repeat(121), lastName: 'Prueba', email: emails[2]!, passwordHash: secret.passwordHash }))
    assert.equal(await source.getRepository(UserSchema).countBy({ email: emails[2] }), 0)
  } finally {
    try {
      if (!source.isInitialized) await source.initialize()
      for (const email of emails) {
        const user = await source.getRepository(UserSchema).findOneBy({ email })
        if (user) await source.transaction(async manager => {
          await manager.getRepository(UserProfileSchema).delete({ userId: user.id })
          await manager.getRepository(UserSchema).delete({ id: user.id, email })
        })
      }
    } finally { await app.close(); if (source.isInitialized) await source.destroy() }
  }
})
