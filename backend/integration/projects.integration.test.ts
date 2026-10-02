import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'

test('S2 PostgreSQL: proyectos propios, rol, cola, descarte lógico e historial', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true', 'Prueba explícita: requiere base local y ALLOW_DB_TEST_WRITES=true.')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'],
    { input: query, encoding: 'utf8', timeout: 10000 }).trim()
  const suffix = randomUUID().slice(0, 8)
  const password = randomBytes(24).toString('hex')
  const users: string[] = []
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const call = (path: string, cookie = '', body?: unknown) => fetch(`${base}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const register = async (label: string) => {
    const email = `projects-${label}-${suffix}@example.invalid`
    const created = await call('auth/register', '', { firstName: 'Ensayo', lastName: label, email, password, demoConsent: true })
    assert.equal(created.status, 201)
    const { id } = await created.json() as { id: string }
    assert.match(id, /^[a-f0-9-]{36}$/); users.push(id)
    const login = await call('auth/login', '', { email, password })
    assert.equal(login.status, 200)
    return { id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }
  try {
    const creator = await register('creator')
    const other = await register('other')
    const administrator = await register('admin')
    assert.equal((await call('campaigns/mine')).status, 401)
    assert.equal((await call('campaigns/mine', creator.cookie)).status, 403, 'El registro no concede CREATOR.')
    // Solo estas cuentas efímeras reciben roles de fixture. No resuelve la provisión D06.
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${creator.id}',id FROM role WHERE code='CREATOR';
      INSERT INTO user_role(user_id,role_id) SELECT '${other.id}',id FROM role WHERE code='CREATOR';
      INSERT INTO user_role(user_id,role_id) SELECT '${administrator.id}',id FROM role WHERE code='ADMIN';`)
    const create = async () => {
      const response = await call('campaigns/drafts', creator.cookie, { title: `Proyecto ${suffix}`, summary: '', campaignType: 'DONATION' })
      assert.equal(response.status, 201)
      const { id } = await response.json() as { id: string }; assert.match(id, /^[a-f0-9-]{36}$/)
      return id
    }
    const draftId = await create()
    const ownList = await call('campaigns/mine', creator.cookie)
    assert.equal(ownList.status, 200)
    assert.ok((await ownList.json() as { id: string; status: string }[]).some(item => item.id === draftId && item.status === 'DRAFT'))
    const foreignList = await call('campaigns/mine', other.cookie)
    assert.equal(foreignList.status, 200)
    assert.ok(!(await foreignList.json() as { id: string }[]).some(item => item.id === draftId))
    // Son las lecturas reales usadas al continuar el borrador concreto desde Mis proyectos.
    for (const suffix of ['', '/modality', '/general', '/story']) {
      assert.equal((await call(`campaigns/drafts/${draftId}${suffix}`, creator.cookie)).status, 200)
    }
    assert.equal((await call(`campaigns/mine/${draftId}`, other.cookie)).status, 404)
    assert.equal((await call(`campaigns/mine/${draftId}/discard`, other.cookie, { confirmed: true })).status, 404)
    assert.equal((await call(`campaigns/mine/${draftId}/discard`, creator.cookie, { confirmed: false })).status, 400)
    assert.equal((await call(`campaigns/mine/${draftId}`, creator.cookie)).status, 200)
    assert.equal((await call(`campaigns/mine/${draftId}/discard`, creator.cookie, { confirmed: true })).status, 204)
    assert.equal(sql(`SELECT deleted_at IS NOT NULL FROM campaign WHERE id='${draftId}';`), 't')
    assert.equal(sql(`SELECT count(*) FROM status_history WHERE entity_id='${draftId}' AND changed_by='${creator.id}' AND metadata->>'action'='DISCARD_DRAFT';`), '1')
    assert.equal((await call(`campaigns/drafts/${draftId}`, creator.cookie)).status, 404)
    assert.ok(!(await (await call('campaigns/mine', creator.cookie)).json() as { id: string }[]).some(item => item.id === draftId))
    assert.equal((await call(`campaigns/mine/${draftId}/discard`, creator.cookie, { confirmed: true })).status, 404)
    const reviewedId = await create()
    sql(`UPDATE campaign SET status='IN_REVIEW',goal_amount=1000,currency_code=(SELECT code FROM currency LIMIT 1),submitted_at=now() WHERE id='${reviewedId}';`)
    assert.equal((await call(`campaigns/mine/${reviewedId}/discard`, creator.cookie, { confirmed: true })).status, 409)
    assert.equal((await call('admin/campaigns/review', creator.cookie)).status, 403)
    const queue = await call('admin/campaigns/review', administrator.cookie)
    assert.equal(queue.status, 200)
    assert.ok((await queue.json() as { id: string }[]).some(item => item.id === reviewedId))
    assert.equal((await call(`admin/campaigns/review/${reviewedId}`, administrator.cookie)).status, 200)
    assert.equal((await call(`admin/campaigns/review/${draftId}`, administrator.cookie)).status, 404)
  } finally {
    await app.close()
    // Limpieza limitada a UUID de las cuentas creadas por esta prueba, nunca a datos del equipo.
    for (const id of users) {
      sql(`DELETE FROM status_history WHERE entity_type='CAMPAIGN' AND entity_id IN (SELECT id FROM campaign WHERE creator_user_id='${id}');
        DELETE FROM campaign WHERE creator_user_id='${id}'; DELETE FROM app_user WHERE id='${id}';`)
    }
  }
})
