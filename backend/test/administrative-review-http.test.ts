import 'reflect-metadata'
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { ConflictException, InternalServerErrorException, Module, type ArgumentsHost, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { Sessions, SessionMissing } from '../src/auth/application/sessions'
import { SessionMutationGuard } from '../src/auth/infrastructure/http/session-http'
import { RoleAccess } from '../src/roles/application/roles'
import { PermissionAccess } from '../src/roles/application/permissions'
import { RoleGuard, type AuthenticatedRequest } from '../src/roles/infrastructure/roles-http'
import { AdministrativeReview, type AdministrativeRepository } from '../src/campaigns/application/administrative-review'
import { PublicationRequirementsMissing, ReviewConflict } from '../src/campaigns/domain/administrative-review'
import { AdministrativeReviewController } from '../src/campaigns/infrastructure/administrative-review.controller'
import { readEnvironment } from '../src/config/environment'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { ApiExceptionFilter } from '../src/shared/infrastructure/http/api-exception.filter'

const id = '11111111-1111-4111-8111-111111111111'
let writes = 0
const repository: AdministrativeRepository = {
  detail: async () => null,
  decide: async (_actor, _id, input) => { if (input.expectedRound !== 1) throw new ReviewConflict(); writes++; return { id, status: input.decision, round: 1 } },
  publish: async () => { writes++; return { id, status: 'PUBLISHED', round: 1 } }
}
@Module({ controllers: [AdministrativeReviewController], providers: [RoleGuard, SessionMutationGuard,
  { provide: AdministrativeReview, useValue: new AdministrativeReview(repository, false) },
  { provide: Sessions, useValue: { current: async (token?: string) => { if (!token) throw new SessionMissing(); return { id: token[0] === 'a' ? 'admin' : 'creator', email: 'test@example.invalid', firstName: 'Ensayo', lastName: 'Prueba', status: 'ACTIVE' } } } },
  { provide: RoleAccess, useValue: new RoleAccess({ active: async user => [{ code: user === 'admin' ? 'ADMIN' : 'CREATOR', name: user }] }) },
  { provide: PermissionAccess, useValue: new PermissionAccess({ granted: async user => user === 'admin' ? ['campaign.review.read','campaign.review.decide','campaign.publish'] : [] }) }
] })
class TestModule {}
let app: INestApplication, base: string
before(async () => { app = await NestFactory.create(TestModule, { logger: false }); configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1'); base = await app.getUrl() })
after(async () => { await app?.close() })
const call = (path: string, user = '', body?: unknown, headers: Record<string, string> = {}) => fetch(`${base}/api/admin/campaigns/${path}`, {
  method: body === undefined ? 'GET' : 'POST', headers: { Cookie: user ? `brotar_session=${user.repeat(64)}` : '', 'Content-Type': 'application/json', 'X-Brotar-Request': '1', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
})
const decision = { decision: 'APPROVED', comment: '', expectedRound: 1, observations: [] }

test('publicación: requisito incumplido conserva código y motivo público como conflicto 409', async () => {
  for (const subject of ['PERSON', 'ORGANIZATION', 'REPRESENTATION'] as const) {
    const requirement = new PublicationRequirementsMissing(subject)
    const controller = new AdministrativeReviewController(new AdministrativeReview({ ...repository, publish: async () => { throw requirement } }, true))
    await assert.rejects(controller.publish({ brotarUser: { id: 'admin' } } as AuthenticatedRequest, id, { confirmed: true, expectedRound: 1 }), error => {
      assert.ok(error instanceof ConflictException)
      assert.equal(error.getStatus(), 409)
      assert.deepEqual(error.getResponse(), { code: 'PUBLICATION_REQUIREMENTS', message: requirement.message })
      return true
    })
  }
})

test('publicación: el filtro HTTP conserva solo el código permitido y oculta errores internos', () => {
  let body: unknown
  const response = { status: () => response, json: (value: unknown) => { body = value } }
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost
  const filter = new ApiExceptionFilter()
  filter.catch(new ConflictException({ code: 'PUBLICATION_REQUIREMENTS', message: 'Falta identidad aprobada.', sql: 'secret' }), host)
  assert.deepEqual(body, { statusCode: 409, code: 'PUBLICATION_REQUIREMENTS', message: 'Falta identidad aprobada.' })
  filter.catch(new ConflictException({ code: 'UNKNOWN_INTERNAL_CODE', message: 'Actualiza la ronda.' }), host)
  assert.deepEqual(body, { statusCode: 409, message: 'Actualiza la ronda.' })
  filter.catch(new InternalServerErrorException({ code: 'PUBLICATION_REQUIREMENTS', message: 'SELECT secret' }), host)
  assert.deepEqual(body, { statusCode: 500, message: 'No se pudo completar la solicitud.' })
})
test('revisión HTTP: exige administrador en lectura y escritura, UUID válido y no-store', async () => {
  assert.equal((await call(`${id}/detail`)).status, 401)
  assert.equal((await call(`${id}/detail`, 'b')).status, 403)
  assert.equal((await call(`${id}/decision`, 'b', decision)).status, 403)
  assert.equal((await call('incorrecto/detail', 'a')).status, 400)
  assert.equal((await call(`${id}/detail`, 'a')).status, 404)
  const response = await call(`${id}/decision`, 'a', decision)
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal((await response.json() as { status: string }).status, 'APPROVED')
})
test('revisión HTTP: DTO anidados, motivos, rondas, campos extra y origen se rechazan sin escribir', async () => {
  const before = writes
  for (const patch of [{ decision: 'REJECTED', comment: ' ' }, { expectedRound: 0 }, { expectedRound: '1' }, { observations: [null] }, { decision: 'CHANGES_REQUESTED', comment: 'Ajustar', observations: [{ section: 'story', message: ' ', fieldPath: null }] }, { actorId: 'otro' }]) assert.equal((await call(`${id}/decision`, 'a', { ...decision, ...patch })).status, 400)
  assert.equal((await call(`${id}/decision`, 'a', decision, { Origin: 'https://other.example' })).status, 403)
  assert.equal((await call(`${id}/decision`, 'a', decision, { 'X-Brotar-Request': '' })).status, 403)
  assert.equal((await call(`${id}/decision`, 'a', { ...decision, expectedRound: 2 })).status, 409)
  assert.equal(writes, before)
})
test('publicación HTTP: configuración desactivada y confirmación inválida no mutan aunque se tenga ADMIN', async () => {
  const before = writes
  assert.equal((await call(`${id}/publish`, 'a', { confirmed: false, expectedRound: 1 })).status, 400)
  assert.equal((await call(`${id}/publish`, 'a', { confirmed: true, expectedRound: 1 })).status, 403)
  assert.equal((await call(`${id}/publish`, 'b', { confirmed: true, expectedRound: 1 })).status, 403)
  assert.equal(writes, before)
})
