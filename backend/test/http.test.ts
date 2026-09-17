import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { Body, Controller, Get, Module, Post, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { IsString, MinLength } from 'class-validator'
import { AppModule } from '../src/app.module'
import { readEnvironment } from '../src/config/environment'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'

class TestDto {
  @IsString()
  @MinLength(2)
  name!: string
}

// Controlador exclusivo de pruebas: nunca se carga en AppModule.
@Controller('test-only')
class TestController {
  @Post()
  validate(@Body() body: TestDto): TestDto { return body }

  @Get('error')
  error(): never { throw new Error('secret-database-password') }
}

@Module({ imports: [AppModule], controllers: [TestController] })
class HttpTestModule {}

let app: INestApplication
let base: string
before(async () => {
  app = await NestFactory.create(HttpTestModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  base = await app.getUrl()
})
after(async () => { await app?.close() })

test('liveness responde 200 y no finge conexión a PostgreSQL', async () => {
  const response = await fetch(`${base}/api/health/live`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok', service: 'brotar-api' })
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-powered-by'), null)
})

test('CORS permite el frontend conocido y no un origen distinto', async () => {
  const allowed = await fetch(`${base}/api/health/live`, { headers: { Origin: 'http://127.0.0.1:5173' } })
  const denied = await fetch(`${base}/api/health/live`, { headers: { Origin: 'https://untrusted.example' } })
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173')
  assert.equal(denied.headers.get('access-control-allow-origin'), null)
})

test('rutas desconocidas devuelven un error HTTP estructurado', async () => {
  const response = await fetch(`${base}/api/no-existe`)
  assert.equal(response.status, 404)
  assert.equal((await response.json() as { statusCode: number }).statusCode, 404)
})

test('readiness devuelve 503 cuando PostgreSQL no está configurado', async () => {
  const response = await fetch(`${base}/api/health/ready`)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { statusCode: 503, message: 'No se pudo completar la solicitud.' })
})

test('valida DTO, rechaza campos extra y acepta los campos válidos', async () => {
  for (const body of [{}, { name: 123 }, { name: 'x' }, { name: 'Bien', admin: true }]) {
    const response = await fetch(`${base}/api/test-only`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    assert.equal(response.status, 400)
  }
  const response = await fetch(`${base}/api/test-only`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Brotar' })
  })
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { name: 'Brotar' })
})

test('errores inesperados no exponen mensajes internos', async () => {
  const response = await fetch(`${base}/api/test-only/error`)
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { statusCode: 500, message: 'No se pudo completar la solicitud.' })
})
