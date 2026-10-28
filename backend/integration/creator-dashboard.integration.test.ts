import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'

test('panel del creador: paginación, totales completos, pendientes y representación revocada', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const target = readTestDatabaseTarget(config)
  assert.match(target.project, /qa/)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', target.container, 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1')
  const base = await app.getUrl(), users: string[] = [], org = randomUUID(), suffix = randomUUID()
  const request = (path: string, cookie = '', body?: unknown) => fetch(`${base}/api/${path}`, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173', 'X-Brotar-Request': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  try {
    const cookies: string[] = []
    for (let i = 0; i < 2; i++) {
      const email = `dashboard-${i}-${suffix}@example.invalid`, password = randomBytes(24).toString('hex')
      const r = await request('auth/register', '', { firstName: 'Panel', lastName: 'Ensayo', email, password, demoConsent: true }); assert.equal(r.status, 201)
      users.push((await r.json() as { id: string }).id)
      const login = await request('auth/login', '', { email, password }); assert.equal(login.status, 200); cookies.push(login.headers.get('set-cookie')!.split(';')[0]!)
      sql(`INSERT INTO public.user_role(user_id,role_id) SELECT '${users[i]}',id FROM public.role WHERE code='CREATOR';`)
    }
    sql(`INSERT INTO public.organization(id,slug,legal_name,organization_type_id,created_by) SELECT '${org}','qa-${suffix}','Organización de prueba',id,'${users[0]}' FROM public.organization_type LIMIT 1;
      INSERT INTO public.organization_member(organization_id,user_id,organization_role) VALUES('${org}','${users[0]}','OWNER');
      INSERT INTO public.campaign(slug,title,campaign_type,creator_user_id,goal_amount,currency_code)
        SELECT 'qa-${suffix}-'||n,'Proyecto de prueba '||n,'DONATION','${users[0]}',100,'BOB' FROM generate_series(1,23) n;
      INSERT INTO public.campaign(slug,title,campaign_type,creator_user_id,organization_id,goal_amount,currency_code) VALUES('qa-org-${suffix}','Proyecto institucional','DONATION','${users[0]}','${org}',100,'BOB');
      INSERT INTO public.campaign(slug,title,campaign_type,creator_user_id) VALUES('qa-other-${suffix}','Proyecto ajeno','DONATION','${users[1]}');`)
    const panel = async (query = '') => {
      const r = await request(`campaigns/creator-dashboard${query}`, cookies[0]); assert.equal(r.status, 200, await r.clone().text())
      return await r.json() as { total: number; items: { id: string; organizationId: string | null; pendingActivities: number; verificationStatus: string | null }[]; states: { count: number }[]; funding: { currencyCode: string; amountRaised: string; demoAmountRaised: string }[] }
    }
    assert.equal((await request('campaigns/creator-dashboard')).status, 401)
    const first = await panel(), second = await panel('?page=2')
    assert.equal(first.total, 24); assert.equal(first.items.length, 20); assert.equal(second.items.length, 4)
    assert.equal(new Set([...first.items, ...second.items].map(i => i.id)).size, 24)
    assert.equal(first.states.reduce((sum, s) => sum + s.count, 0), 24)
    assert.deepEqual(first.funding, [{ currencyCode: 'BOB', amountRaised: '0.00', demoAmountRaised: '0.00' }])
    assert.equal((await panel('?scope=personal')).total, 23)
    assert.equal((await panel('?scope=institutional')).total, 1)
    const id = first.items[0]!.id
    sql(`INSERT INTO public.campaign_activity(campaign_id,name) VALUES('${id}','Actividad pendiente de ensayo');`)
    const changed = await panel(); assert.equal(changed.items.find(i => i.id === id)!.pendingActivities, 1)
    assert.equal(changed.items.find(i => i.id === id)!.verificationStatus, null)
    sql(`UPDATE public.campaign_activity SET status='COMPLETED',progress_percent=100 WHERE campaign_id='${id}';`)
    assert.equal((await panel()).items.find(i => i.id === id)!.pendingActivities, 1, 'Sin fechas reales completas sigue pendiente para ejecución y cierre')
    sql(`UPDATE public.organization_member SET left_at=clock_timestamp() WHERE organization_id='${org}' AND user_id='${users[0]}';`)
    assert.equal((await panel('?scope=institutional')).total, 0)
    assert.equal((await panel()).total, 23, 'La autoría histórica no permite conservar acceso institucional tras revocación')
    for (const query of ['?page=0', '?page=1e2', '?scope=someone-else']) assert.equal((await request(`campaigns/creator-dashboard${query}`, cookies[0])).status, 400)
  } finally {
    await app.close()
    for (const id of users) sql(`DELETE FROM public.campaign WHERE creator_user_id='${id}';`)
    sql(`DELETE FROM public.organization WHERE id='${org}';`)
    for (const id of users) sql(`DELETE FROM public.audit_log WHERE actor_user_id='${id}'; DELETE FROM public.app_user WHERE id='${id}';`)
  }
})
