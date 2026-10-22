import 'reflect-metadata'
import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { RegisterUser, RegistrationInvalid } from '../src/users/application/register-user'
import { RegistrationController } from '../src/users/infrastructure/http/registration.controller'
import { RegistrationLimitGuard } from '../src/users/infrastructure/http/registration-limit.guard'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'

const requested: string[] = []
let writes = 0
const register = new RegisterUser({ emailExists: async email => { requested.push(email); return email === 'existing@example.invalid' }, create: async () => { writes++; return { id: 'test', status: 'PENDING_VERIFICATION' } } }, { hash: async () => { throw new Error('No se debe procesar contraseña en una consulta de disponibilidad.') } })
@Module({ controllers: [RegistrationController], providers: [RegistrationLimitGuard, { provide: RegisterUser, useValue: register }] })
class TestModule {}
let app: INestApplication
let base: string
before(async () => { app = await NestFactory.create(TestModule, { logger: false }); configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1'); base = await app.getUrl() })
after(async () => { await app?.close() })
const call = (body: unknown) => fetch(`${base}/api/auth/email-availability`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('registro: rechaza teléfono fuera de límites antes de calcular el hash o escribir', async () => {
  const input = { firstName: 'Ensayo', lastName: 'Validador', email: 'test@example.invalid', password: 'Contraseña de ensayo local', phoneCountryCode: '+591', phoneNumber: '1'.repeat(13) }
  await assert.rejects(() => register.execute(input), RegistrationInvalid)
  assert.equal(writes, 0)
})

test('correo HTTP: normaliza, consulta disponibilidad, no crea cuentas ni devuelve identidad', async () => {
  for (const [email, available] of [[' Existing@example.invalid ', false], ['free@example.invalid', true]] as const) {
    const response = await call({ email })
    assert.equal(response.status, 201)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { email: email.trim().toLowerCase(), available })
  }
  assert.deepEqual(requested, ['existing@example.invalid', 'free@example.invalid'])
  assert.equal(writes, 0)
})

test('correo HTTP: formato, tipos y propiedades extra se rechazan antes de consultar', async () => {
  for (const body of [{}, { email: null }, { email: 1 }, { email: 'no-correo' }, { email: 'a'.repeat(255) }, { email: 'valid@example.invalid', role: 'ADMIN' }]) {
    const response = await call(body)
    assert.equal(response.status, 400)
    const data = await response.json() as { message: string[] }
    assert.ok(data.message.every(message => message.includes(': ')))
  }
  assert.equal(requested.length, 2)
})

test('correo HTTP: limita la enumeración de cuentas por IP y no devuelve secretos', async () => {
  let response: Response | undefined
  for (let i = 0; i < 21; i++) response = await call({ email: 'free@example.invalid' })
  assert.equal(response!.status, 429)
  assert.equal(response!.headers.get('retry-after'), '60')
  assert.equal(writes, 0)
})
