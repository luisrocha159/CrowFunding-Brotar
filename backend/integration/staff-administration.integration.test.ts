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

test('responsabilidades HTTP/PostgreSQL: conceder, revocar, idempotencia, revocación inmediata y separación', { timeout: 120000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true'); assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  const app = await NestFactory.create(AppModule, { logger: false }); configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1')
  const base = await app.getUrl(), suffix = randomUUID(), password = randomBytes(24).toString('hex'), users: string[] = []
  const call = (path: string, cookie = '', body?: unknown, extra: Record<string, string> = {}) => fetch(`${base}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173', ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  async function account(role: string) {
    const email = `staff-${role.toLowerCase()}-${suffix}@example.invalid`
    const registered = await call('auth/register', '', { firstName: 'Ensayo', lastName: 'Roles', email, password, demoConsent: true }); assert.equal(registered.status, 201)
    const { id } = await registered.json() as { id: string }; users.push(id)
    if (role !== 'REGISTERED_USER') sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}'`)
    const login = await call('auth/login', '', { email, password }); assert.equal(login.status, 200)
    return { id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }
  try {
    const admin = await account('ADMIN'), target = await account('REGISTERED_USER'), auditor = await account('AUDITOR')
    const path = `admin/users/${target.id}/responsibilities`, input = { role: 'FINANCE', operation: 'GRANT', reason: 'Ensayo de asignación independiente', confirmed: true }
    assert.equal((await call(path, '', input)).status, 401)
    assert.equal((await call(path, target.cookie, input)).status, 403)
    assert.equal((await call(path, admin.cookie, input, { Origin: 'https://example.invalid' })).status, 403)
    assert.equal((await call(`admin/users/${admin.id}/responsibilities`, admin.cookie, input)).status, 403)
    for (const patch of [{ confirmed: false }, { role: 'ADMIN' }, { userId: target.id }, { reason: 'corto' }, { operation: 'DELETE' }]) assert.equal((await call(path, admin.cookie, { ...input, ...patch })).status, 400)
    const [first, second] = await Promise.all([call(path, admin.cookie, input), call(path, admin.cookie, input)])
    assert.equal(first.status, 200); assert.equal(second.status, 200)
    const results = await Promise.all([first.json(), second.json()]) as { changed: boolean }[]
    assert.equal(results.filter(row => row.changed).length, 1)
    assert.equal(sql(`SELECT count(*) FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id='${target.id}' AND r.code='FINANCE'`), '1')
    assert.equal((await call('admin/finance/payments', target.cookie)).status, 200, 'La cookie existente obtiene el nuevo permiso sin iniciar sesión otra vez.')
    assert.equal((await call(path, admin.cookie, { ...input, operation: 'REVOKE' })).status, 200)
    assert.equal((await call('admin/finance/payments', target.cookie)).status, 403, 'Revocar no deja permisos en caché de sesión.')
    assert.equal((await (await call(path, admin.cookie, { ...input, operation: 'REVOKE' })).json() as { changed: boolean }).changed, false)
    assert.equal((await call(path, admin.cookie, input)).status, 200)
    assert.equal(sql(`SELECT count(*) FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id='${target.id}' AND r.code='FINANCE'`), '2', 'Nueva concesión conserva la revocada.')
    sql(`UPDATE user_role SET granted_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE user_id='${target.id}' AND revoked_at IS NULL AND role_id=(SELECT id FROM role WHERE code='FINANCE')`)
    assert.equal((await call(path, admin.cookie, input)).status, 409)
    assert.equal((await call(path, admin.cookie, { ...input, operation: 'REVOKE' })).status, 200)
    sql(`UPDATE app_user SET status='SUSPENDED' WHERE id='${target.id}'`)
    assert.equal((await call(path, admin.cookie, input)).status, 409)
    sql(`UPDATE app_user SET status='PENDING_VERIFICATION' WHERE id='${target.id}'; INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='ADMIN'`)
    assert.equal((await call(path, auditor.cookie, input)).status, 403)
    assert.equal((await call(`admin/users/${auditor.id}/responsibilities`, admin.cookie, input)).status, 409)
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE actor_user_id='${admin.id}' AND entity_name='user_role' AND new_values->>'source'='APPLICATION'`), '4')
    for (const role of ['REVIEWER','COMPLIANCE','SUPPORT','AUDITOR']) {
      assert.equal((await call(path,admin.cookie,{...input,role})).status,200,role)
      const capabilities=await (await call('access/permissions',target.cookie)).json() as {permissions:string[];readOnly:boolean}
      assert.equal(capabilities.readOnly,role==='AUDITOR')
      if (role==='AUDITOR') assert.equal(capabilities.permissions.includes('campaign.review.decide'),false)
      if (role==='REVIEWER') assert.ok(capabilities.permissions.includes('campaign.review.decide'))
      if (role==='COMPLIANCE') assert.ok(capabilities.permissions.includes('verification.review'))
      if (role==='SUPPORT') assert.ok(capabilities.permissions.includes('support.resolve'))
      assert.equal((await call(path,admin.cookie,{...input,role,operation:'REVOKE'})).status,200,role)
    }
    assert.equal(sql("SELECT has_column_privilege('brotar_app','public.user_role','revoked_at','UPDATE') AND NOT has_table_privilege('brotar_app','public.user_role','UPDATE') AND NOT has_column_privilege('brotar_app','public.user_role','role_id','UPDATE')"), 't')
  } finally {
    await app.close()
    for (const id of users) sql(`DELETE FROM audit_log WHERE actor_user_id='${id}' OR entity_id IN(SELECT id FROM user_role WHERE user_id='${id}'); DELETE FROM app_user WHERE id='${id}'`)
  }
})
