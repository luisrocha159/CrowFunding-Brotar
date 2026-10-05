import 'reflect-metadata'
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { Sessions, SessionMissing } from '../src/auth/application/sessions'
import { SessionMutationGuard } from '../src/auth/infrastructure/http/session-http'
import { RoleAccess } from '../src/roles/application/roles'
import { PermissionAccess } from '../src/roles/application/permissions'
import { RoleGuard } from '../src/roles/infrastructure/roles-http'
import { Projects, type ProjectDetail, type ProjectRepository } from '../src/campaigns/application/projects'
import { CampaignReviewQueueController, ProjectsController } from '../src/campaigns/infrastructure/projects.controller'
import { readEnvironment } from '../src/config/environment'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'

// Módulo aislado con repositorio en memoria. Ninguna cuenta/rol se provisiona en la base real.
const id = '11111111-1111-4111-8111-111111111111'
const fixture: ProjectDetail = { id, title: 'Prueba local', summary: null, status: 'DRAFT', categoryName: null,
  goalAmount: null, currencyCode: null, creatorName: 'Creador', updatedAt: new Date(), submittedAt: null,
  location: null, story: null, history: [] }
let writes = 0
const repository: ProjectRepository = {
  listOwn: async () => [fixture], findOwn: async (user, requested) => user === 'creator' && requested === id ? fixture : null,
  discardOwn: async () => { writes++ }, reviewQueue: async () => [], findForReview: async () => null
}
@Module({
  controllers: [ProjectsController, CampaignReviewQueueController],
  providers: [RoleGuard, SessionMutationGuard,
    { provide: Projects, useValue: new Projects(repository) },
    { provide: Sessions, useValue: { current: async (token?: string) => {
      const user = token === 'a'.repeat(64) ? 'creator' : token === 'b'.repeat(64) ? 'admin' : token === 'c'.repeat(64) ? 'basic' : null
      if (!user) throw new SessionMissing()
      return { id: user, email: `${user}@example.invalid`, firstName: user, lastName: 'Prueba', status: 'ACTIVE' }
    } } },
    { provide: RoleAccess, useValue: new RoleAccess({ active: async user => [{ code: user === 'creator' ? 'CREATOR' : user === 'admin' ? 'ADMIN' : 'REGISTERED_USER', name: user }] }) },
    { provide: PermissionAccess, useValue: new PermissionAccess({ granted: async () => [] }) }
  ]
})
class ProjectsTestModule {}
let app: INestApplication
let base: string
before(async () => {
  app = await NestFactory.create(ProjectsTestModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1'); base = await app.getUrl()
})
after(async () => { await app?.close() })
const call = (path: string, role = '', body?: unknown, headers: Record<string, string> = {}) => fetch(`${base}/api/${path}`, {
  method: body === undefined ? 'GET' : 'POST', headers: {
    Cookie: role ? `brotar_session=${role.repeat(64)}` : '', 'Content-Type': 'application/json', 'X-Brotar-Request': '1', ...headers
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
})
test('HTTP S2: sesión y roles se exigen en servidor aunque se conozca la URL', async () => {
  assert.equal((await call('campaigns/mine')).status, 401)
  assert.equal((await call('campaigns/mine', 'c')).status, 403)
  assert.equal((await call('admin/campaigns/review', 'a')).status, 403)
  assert.equal((await call('campaigns/mine', 'a')).status, 200)
  const admin = await call('admin/campaigns/review', 'b')
  assert.equal(admin.status, 200); assert.deepEqual(await admin.json(), [])
  assert.equal(admin.headers.get('cache-control'), 'no-store')
})
test('HTTP S2: UUID, propiedad, confirmación, campos extra y origen se validan sin escribir', async () => {
  const before = writes
  assert.equal((await call('campaigns/mine/no-uuid', 'a')).status, 400)
  assert.equal((await call('campaigns/mine/22222222-2222-4222-8222-222222222222', 'a')).status, 404)
  for (const body of [{}, { confirmed: false }, { confirmed: 'true' }, { confirmed: true, owner: 'otro' }]) {
    assert.equal((await call(`campaigns/mine/${id}/discard`, 'a', body)).status, 400)
  }
  assert.equal((await call(`campaigns/mine/${id}/discard`, 'a', { confirmed: true }, { Origin: 'https://other.example' })).status, 403)
  assert.equal(writes, before)
  assert.equal((await call(`campaigns/mine/${id}/discard`, 'a', { confirmed: true })).status, 204)
  assert.equal(writes, before + 1)
})
