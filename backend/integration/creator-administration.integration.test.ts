import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'

test('CREATOR provisional en PostgreSQL: ADMIN, CSRF, auditoría, concurrencia y conservación de identidad', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const adminSql = (sql: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 })
  const source = createDataSource(config)
  const suffix = randomUUID(); const password = randomBytes(24).toString('hex'); const ids: string[] = []
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1'); const base = await app.getUrl()
  const request = (path: string, cookie = '', body?: unknown, csrf = true) => fetch(`${base}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-Brotar-Request': '1' } : {}), Cookie: cookie, Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const register = async (label: string) => {
    const email = `grant-${label}-${suffix}@example.invalid`
    const created = await request('auth/register', '', { legalVersion:'mvp-demo-legal-1.0-20261028', firstName: 'Prueba', lastName: 'Concesión', email, password, demoConsent: true })
    assert.equal(created.status, 201)
    const { id } = await created.json() as { id: string }; assert.match(id, /^[a-f0-9-]{36}$/); ids.push(id)
    const login = await request('auth/login', '', { email, password }); assert.equal(login.status, 200)
    return { id, email, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }
  try {
    await source.initialize()
    const actor = await register('admin'); const target = await register('usuario')
    adminSql(`INSERT INTO user_role(user_id,role_id) SELECT '${actor.id}',id FROM role WHERE code='ADMIN';`)
    const path = `admin/users/${target.id}/creator`; const body = { confirmed: true, reason: 'Ensayo provisional de integración' }
    assert.equal((await request(`admin/users?email=${encodeURIComponent(target.email)}`)).status, 401)
    assert.equal((await request(`admin/users?email=${encodeURIComponent(target.email)}`, target.cookie)).status, 403)
    assert.equal((await request(path, target.cookie, body)).status, 403)
    assert.equal((await request(path, actor.cookie, body, false)).status, 403)
    assert.equal((await request(path, actor.cookie, { ...body, confirmed: false })).status, 400)
    assert.equal((await request(path, actor.cookie, { ...body, role: 'ADMIN' })).status, 400)
    assert.equal((await request(path, actor.cookie, { ...body, reason: ' ' })).status, 409)
    const lookup = await request(`admin/users?email=${encodeURIComponent(target.email)}`, actor.cookie)
    assert.equal(lookup.status, 200)
    const snapshot = () => source.query('SELECT password_hash,status,email_verified_at,phone_verified_at FROM app_user WHERE id=$1', [target.id])
    const before = await snapshot()
    const replies = await Promise.all([request(path, actor.cookie, body), request(path, actor.cookie, body)])
    assert.deepEqual(replies.map(response => response.status), [200, 200])
    const outcomes = await Promise.all(replies.map(response => response.json() as Promise<{ created: boolean }>))
    assert.deepEqual(outcomes.map(result => result.created).sort(), [false, true])
    assert.deepEqual(await snapshot(), before)
    const roles: { code: string }[] = await source.query('SELECT r.code FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id=$1 ORDER BY code', [target.id])
    assert.deepEqual(roles.map(role => role.code), ['CREATOR', 'REGISTERED_USER'])
    adminSql(`DO $$ BEGIN IF (SELECT count(*) FROM audit_log WHERE actor_user_id='${actor.id}' AND new_values->>'userId'='${target.id}' AND new_values->>'role'='CREATOR')<>1 THEN RAISE EXCEPTION 'Auditoría duplicada o ausente'; END IF; END $$;`)
    assert.equal((await request('campaigns/mine', target.cookie)).status, 200, 'Rol vigente sin recrear la sesión.')
    // Suspensión, concesión caducada y auditor no se sortean desde el panel.
    adminSql(`UPDATE app_user SET locked_until=now()+interval '1 hour' WHERE id='${target.id}';`)
    assert.equal((await request(path, actor.cookie, body)).status, 409)
    adminSql(`UPDATE app_user SET locked_until=NULL WHERE id='${target.id}'; UPDATE user_role SET granted_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE user_id='${target.id}' AND role_id=(SELECT id FROM role WHERE code='CREATOR');`)
    assert.equal((await request(path, actor.cookie, body)).status, 409)
    adminSql(`INSERT INTO user_role(user_id,role_id) SELECT '${actor.id}',id FROM role WHERE code='AUDITOR';`)
    assert.equal((await request(path, actor.cookie, body)).status, 403)
    assert.equal((await request(`admin/users/${randomUUID()}/creator`, actor.cookie, body)).status, 403)
  } finally {
    await app.close()
    for (const id of ids) {
      adminSql(`DELETE FROM audit_log WHERE actor_user_id='${id}' OR new_values->>'userId'='${id}'; DELETE FROM app_user WHERE id='${id}';`)
    }
    if (source.isInitialized) await source.destroy()
  }
})
