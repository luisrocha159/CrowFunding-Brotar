import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { before, after, test } from 'node:test'
import { scrypt } from 'node:crypto'
import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { RegisterUser, RegistrationConflict, type NewUser } from '../src/users/application/register-user'
import { ScryptPasswordHasher } from '../src/users/infrastructure/scrypt-password-hasher'
import { RegistrationController } from '../src/users/infrastructure/http/registration.controller'
import { RegistrationLimitGuard } from '../src/users/infrastructure/http/registration-limit.guard'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'

const valid = { firstName: ' María ', lastName: " D'Ávila ", email: ' TEST@example.invalid ', password: 'frase de prueba de registro', demoConsent: true }
let received: NewUser | undefined
let duplicate = false
const useCase = new RegisterUser({ create: async input => {
  if (duplicate) throw new RegistrationConflict()
  received = input
  return { id: '00000000-0000-4000-8000-000000000001', status: 'PENDING_VERIFICATION' }
} }, { hash: async () => 'test-only-hash' })
@Module({ controllers: [RegistrationController], providers: [RegistrationLimitGuard, { provide: RegisterUser, useValue: useCase }] })
class TestModule {}
let app: INestApplication
let base: string
before(async () => {
  app = await NestFactory.create(TestModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  base = await app.getUrl()
})
after(async () => { await app?.close() })
const post = (body: unknown) => fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('registro HTTP valida campos, teléfono en pareja y rechaza atributos no admitidos', async () => {
  for (const change of [
    { firstName: ' ' }, { firstName: 'x'.repeat(121) }, { lastName: null }, { email: 'no-email' },
    { password: 'corta' }, { password: 'x'.repeat(129) }, { password: null }, { demoConsent: false },
    { role: 'ADMIN' }, { status: 'ACTIVE' }, { phoneCountryCode: '+591' }, { phoneNumber: '12345678' },
    { phoneCountryCode: null, phoneNumber: null }
  ]) assert.equal((await post({ ...valid, ...change })).status, 400)
  assert.equal(received, undefined)
})
test('registro devuelve solo id/estado, normaliza nombres y correo y no guarda contraseña clara', async () => {
  const response = await post(valid)
  assert.equal(response.status, 201)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { id: '00000000-0000-4000-8000-000000000001', status: 'PENDING_VERIFICATION' })
  assert.equal(received?.email, 'test@example.invalid')
  assert.equal(received?.firstName, 'María')
  assert.equal(received?.lastName, "D'Ávila")
  assert.equal(received?.passwordHash, 'test-only-hash')
  assert.equal(Object.hasOwn(received ?? {}, 'password'), false)
  assert.equal(Object.hasOwn(received ?? {}, 'demoConsent'), false)
})
test('conflicto usa mensaje genérico, sin correo ni detalles SQL', async () => {
  duplicate = true
  const response = await post(valid)
  duplicate = false
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { statusCode: 409, message: 'No se puede registrar una cuenta con estos datos.' })
})
test('limita solicitudes de registro por minuto', async () => {
  let response: Response | undefined
  for (let attempt = 0; attempt < 6; attempt++) response = await post({})
  assert.equal(response?.status, 429)
  assert.equal(response?.headers.get('retry-after'), '60')
})
test('scrypt usa sal aleatoria, parámetros explícitos y conserva la contraseña exacta', async () => {
  const hasher = new ScryptPasswordHasher()
  const password = ' frase de prueba segura '
  const first = await hasher.hash(password)
  const second = await hasher.hash(password)
  assert.notEqual(first, second)
  assert.match(first, /^scrypt\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{128}$/)
  const [, , , , salt, digest] = first.split('$')
  assert.ok(salt && digest)
  const derived = await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 5 }, (error, key) => error ? reject(error) : resolve(key)))
  assert.equal(derived.toString('hex'), digest)
})
