import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { readdir, readFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { TypeormPasswordRecoveryRepository } from '../src/auth/infrastructure/typeorm-password-recovery.repository'
import { localRecoveryDirectory } from '../src/auth/infrastructure/local-recovery-delivery'

test('recuperación PostgreSQL consume una vez, rechaza vencido y revoca la sesión anterior sin enviar correo', { timeout: 30000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.equal(config.host, '127.0.0.1'); assert.notEqual(process.env.NODE_ENV, 'production')
  const previousEnv = { NODE_ENV: process.env.NODE_ENV, HOST: process.env.HOST, PUBLIC_WEB_ORIGIN: process.env.PUBLIC_WEB_ORIGIN, PASSWORD_RESET_LOCAL_FILE: process.env.PASSWORD_RESET_LOCAL_FILE }
  Object.assign(process.env, { NODE_ENV: 'development', HOST: '127.0.0.1', PUBLIC_WEB_ORIGIN: 'http://127.0.0.1:5173', PASSWORD_RESET_LOCAL_FILE: 'true' })
  let messagePath: string | undefined
  const email = `recovery-${randomUUID()}@example.invalid`
  const password = randomBytes(24).toString('hex')
  const nextPassword = randomBytes(24).toString('hex')
  const source = createDataSource(config)
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  let userId: string | undefined
  try {
    await source.initialize(); await app.listen(0, '127.0.0.1')
    const base = await app.getUrl()
    const post = (path: string, body: unknown) => fetch(`${base}/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' }, body: JSON.stringify(body)
    })
    const created = await post('auth/register', { firstName: 'Prueba', lastName: 'Recuperación', email, password, demoConsent: true })
    assert.equal(created.status, 201)
    userId = (await created.json() as { id: string }).id
    const login = await post('auth/login', { email, password })
    assert.equal(login.status, 200)
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!
    const repository = app.get(TypeormPasswordRecoveryRepository)
    const hash = (raw: string) => createHash('sha256').update(raw).digest('hex')
    const expired = randomBytes(32).toString('hex')
    assert.equal(await repository.issue(email, hash(expired), new Date(Date.now() + 1000)), true)
    await delay(1200)
    assert.equal((await post('auth/password/reset', { token: expired, password: nextPassword })).status, 401)
    const token = randomBytes(32).toString('hex')
    assert.equal(await repository.issue(email, hash(token), new Date(Date.now() + 60000)), true)
    assert.equal((await post('auth/password/reset', { token, password: ' '.repeat(20) })).status, 400)
    assert.equal((await post('auth/password/reset', { token, password: nextPassword })).status, 204)
    assert.equal((await post('auth/password/reset', { token, password })).status, 401)
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } })).status, 401)
    assert.equal((await post('auth/login', { email, password })).status, 401)
    assert.equal((await post('auth/login', { email, password: nextPassword })).status, 200)
    const requested = await post('auth/password/recovery', { email })
    assert.equal(requested.status, 202)
    assert.deepEqual(await requested.json(), { accepted: true })
    const directory = localRecoveryDirectory(process.env)
    let localToken: string | undefined
    for (const filename of await readdir(directory)) {
      const path = resolve(directory, filename)
      const message = await readFile(path, 'utf8')
      if (!message.includes(`Para: ${email}\n`)) continue
      messagePath = path
      localToken = message.match(/token=([a-f0-9]{64})/)?.[1]
      break
    }
    assert.ok(localToken, 'La solicitud HTTP debe producir un enlace en el buzón local')
    const finalPassword = randomBytes(24).toString('hex')
    assert.equal((await post('auth/password/reset', { token: localToken, password: finalPassword })).status, 204)
    assert.equal((await post('auth/password/reset', { token: localToken, password: finalPassword })).status, 401)
    assert.equal((await post('auth/login', { email, password: finalPassword })).status, 200)
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
    if (messagePath) await unlink(messagePath)
    try { if (userId && source.isInitialized) await source.getRepository(UserSchema).delete({ id: userId, email }) }
    finally { await app.close(); if (source.isInitialized) await source.destroy() }
  }
})
