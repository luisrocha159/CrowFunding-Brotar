import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { ForbiddenException } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'
import { TypeormContributionRepository } from '../src/contributions/infrastructure/typeorm-contribution.repository'
import type { ContributionDetail, ContributionPage, SponsorSummary } from '../src/contributions/application/contributions'
import { TypeormSimulationRepository } from '../src/contributions/infrastructure/typeorm-simulation.repository'
import { SimulationConflict } from '../src/contributions/application/support-simulation'
import type { SupportSimulation } from '../src/contributions/application/support-simulation'

test('S3 aportes y simulación: privacidad PostgreSQL, filtros, comprobantes, sandbox y reintentos aislados', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', timeout: 10000 }).trim()
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1')
  const base = await app.getUrl(), users: { id: string; email: string; password: string; cookie: string }[] = []
  const [campaign, reward, provider, sandbox, c1, c2, c3, c4, payment] = Array.from({ length: 9 }, () => randomUUID()) as [string, string, string, string, string, string, string, string, string]
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}/api/${path}`, { method, headers: { Cookie: cookie, Origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json', 'X-Brotar-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const json = async <T>(response: Response, expected = 200): Promise<T> => { const value: unknown = await response.json(); assert.equal(response.status, expected, JSON.stringify(value)); return value as T }
  try {
    for (let i = 0; i < 2; i++) {
      const email = `s3-contributions-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('hex')
      const user = await json<{ id: string }>(await call('auth/register', '', { legalVersion:'mvp-demo-legal-1.0-20261028', firstName: 'Ensayo', lastName: 'Patrocinador', email, password, demoConsent: true }), 201)
      const login = await call('auth/login', '', { email, password }); assert.equal(login.status, 200)
      users.push({ id: user.id, email, password, cookie: login.headers.get('set-cookie')!.split(';')[0]! })
    }
    const [owner, other] = users as [typeof users[number], typeof users[number]]
    sql(`INSERT INTO campaign(id,creator_user_id,slug,title,summary,campaign_type,status,published_at,goal_amount,currency_code,min_contribution,starts_at,ends_at) VALUES
      ('${campaign}','${owner.id}','s3-read-${campaign}','Ensayo de aportes privado','Fixture temporal de integración','REWARD','PUBLISHED',now(),1000,'BOB',10,now()-interval '1 day',now()+interval '1 day');
      INSERT INTO reward(id,campaign_id,title,description,min_amount,currency_code,quantity_total) VALUES('${reward}','${campaign}','Recompensa temporal','Descripción de ensayo',20,'BOB',1);
      INSERT INTO payment_provider(id,code,name,is_sandbox) VALUES('${provider}','test-${provider}','Proveedor ficticio ensayo',false),('${sandbox}','test-${sandbox}','Sandbox ficticio',true);
      INSERT INTO contribution(id,campaign_id,user_id,amount,currency_code,status,created_at) VALUES
      ('${c1}','${campaign}','${owner.id}',10.25,'BOB','CONFIRMED','2026-10-21T03:59:59Z'),
      ('${c2}','${campaign}','${owner.id}',20,'BOB','PENDING','2026-10-21T04:00:00Z'),
      ('${c3}','${campaign}','${owner.id}',30,'BOB','CONFIRMED','2026-10-21T04:00:00Z'),
      ('${c4}','${campaign}','${other.id}',40,'BOB','CONFIRMED','2026-10-21T04:00:00Z');
      INSERT INTO payment(id,contribution_id,provider_id,idempotency_key,amount,currency_code,status,created_at,confirmed_at,provider_payload) VALUES
      ('${payment}','${c1}','${provider}','${randomUUID()}',10.25,'BOB','CONFIRMED','2026-10-21T04:00:00Z','2026-10-21T04:01:00Z','{"private":"DO_NOT_EXPOSE"}'),
      (gen_random_uuid(),'${c2}','${provider}','${randomUUID()}',20,'BOB','FAILED','2026-10-21T04:00:00Z',null,'{}'),
      (gen_random_uuid(),'${c3}','${sandbox}','${randomUUID()}',30,'BOB','CONFIRMED','2026-10-21T04:00:00Z','2026-10-21T04:01:00Z','{}'),
      (gen_random_uuid(),'${c4}','${provider}','${randomUUID()}',40,'BOB','CONFIRMED','2026-10-21T04:00:00Z','2026-10-21T04:01:00Z','{}');
      INSERT INTO refund(payment_id,contribution_id,amount,currency_code,status) VALUES('${payment}','${c1}',2,'BOB','REFUNDED');
      INSERT INTO support_case(user_id,campaign_id,subject,description) VALUES('${owner.id}','${campaign}','Caso propio','Información de ensayo'),('${other.id}','${campaign}','AJENO_NO_DIVULGAR','Privado');`)
    assert.equal((await call('me/contributions')).status, 401)
    assert.equal((await call(`me/contributions/${c1}`, other.cookie)).status, 404)
    assert.equal((await call(`me/contributions/${c1}/receipt`, other.cookie)).status, 404)
    assert.equal((await app.get(TypeormContributionRepository).detail(owner.id, c2))?.receiptAvailable, false)
    assert.equal((await call(`me/contributions/${c2}/receipt`, owner.cookie)).status, 409)
    for (const query of ['page=0', 'status=FAILED', 'from=2026-02-30', 'from=2026-10-22&to=2026-10-21']) assert.equal((await call(`me/contributions?${query}`, owner.cookie)).status, 400)
    const filtered = await json<ContributionPage>(await call('me/contributions?from=2026-10-21&to=2026-10-21', owner.cookie)); assert.equal(filtered.total, 2)
    const detail = await json<ContributionDetail>(await call(`me/contributions/${c1}`, owner.cookie)); assert.equal(detail.refunds[0]!.amount, '2.00'); assert.equal(detail.supportCases.length, 1)
    assert.ok(!JSON.stringify(detail).includes('DO_NOT_EXPOSE')); assert.ok(!JSON.stringify(detail).includes('AJENO_NO_DIVULGAR'))
    assert.equal((await json<{ sandbox: boolean }>(await call(`me/contributions/${c3}/receipt`, owner.cookie))).sandbox, true)
    const summary = await json<SponsorSummary>(await call('me/sponsor-summary', owner.cookie)); assert.equal(summary.contributionCount, 3); assert.deepEqual(summary.totals, [{ currency: 'BOB', grossConfirmed: '10.25', refunded: '2.00', disputed: '0.00' }]); assert.equal(summary.sandboxPaymentCount, 1)
    const input = { mode: 'SIMULATION', campaignId: campaign, rewardId: reward, amount: '20.00', method: 'TEST_QR', requestId: randomUUID() }
    const financeBefore = sql(`SELECT (SELECT count(*) FROM contribution)::text||':'||(SELECT count(*) FROM payment)::text`)
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='AUDITOR'`)
    await assert.rejects(app.get(TypeormSimulationRepository).create(owner.id, { ...input, method: 'TEST_QR' }), ForbiddenException)
    sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='AUDITOR') AND revoked_at IS NULL`)
    assert.equal((await call('me/simulations', owner.cookie, { ...input, amount: '19.99' })).status, 400)
    const created = await Promise.all([call('me/simulations', owner.cookie, input), call('me/simulations', owner.cookie, input)])
    const first = await json<SupportSimulation>(created[0]!, 201), repeated = await json<SupportSimulation>(created[1]!, 201); assert.equal(first.id, repeated.id)
    assert.equal((await call('me/simulations', owner.cookie, { ...input, amount: '21.00' })).status, 409)
    assert.equal((await call(`me/simulations/${first.id}`, other.cookie)).status, 404)
    assert.equal((await json<{ items: SupportSimulation[] }>(await call('me/simulations', other.cookie))).items.length, 0)
    const update = (state: string, expectedVersion: number) => call(`me/simulations/${first.id}`, owner.cookie, { mode: 'SIMULATION', state, expectedVersion }, 'PUT')
    sql(`UPDATE app_user SET status='SUSPENDED' WHERE id='${owner.id}'`)
    await assert.rejects(app.get(TypeormSimulationRepository).transition(owner.id, first.id, { expectedVersion: 1, state: 'PENDING' }), ForbiddenException)
    sql(`UPDATE app_user SET status='PENDING_VERIFICATION' WHERE id='${owner.id}'`)
    sql(`UPDATE user_role SET expires_at=clock_timestamp()-interval '1 millisecond' WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER') AND revoked_at IS NULL`)
    await assert.rejects(app.get(TypeormSimulationRepository).transition(owner.id, first.id, { expectedVersion: 1, state: 'PENDING' }), ForbiddenException)
    sql(`UPDATE user_role SET expires_at=NULL WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER') AND revoked_at IS NULL`)
    await assert.rejects(app.get(TypeormSimulationRepository).transition(owner.id, first.id, { expectedVersion: 999, state: 'PENDING' }), SimulationConflict)
    assert.equal((await app.get(TypeormSimulationRepository).transition(owner.id, first.id, { expectedVersion: 1, state: 'PENDING' })).state, 'PENDING')
    const concurrent = await Promise.all([update('FAILED', 2), update('EXPIRED', 2)]); assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409])
    let current = await json<SupportSimulation>(await call(`me/simulations/${first.id}`, owner.cookie))
    if (current.state === 'PENDING') current = await json<SupportSimulation>(await update('EXPIRED', current.version))
    current = await json<SupportSimulation>(await update('INITIATED', current.version)); assert.equal(current.reference, first.reference); assert.equal(current.attempts, 2)
    current = await json<SupportSimulation>(await update('CONFIRMED', current.version)); assert.equal(current.mode, 'SIMULATION')
    assert.equal(sql(`SELECT (SELECT count(*) FROM contribution)::text||':'||(SELECT count(*) FROM payment)::text`), financeBefore)
    await call('auth/logout', owner.cookie, {})
    const login = await call('auth/login', '', { email: owner.email, password: owner.password }); owner.cookie = login.headers.get('set-cookie')!.split(';')[0]!
    assert.equal((await json<SupportSimulation>(await call(`me/simulations/${first.id}`, owner.cookie))).reference, first.reference)
    sql(`INSERT INTO contribution(campaign_id,user_id,amount,currency_code) SELECT '${campaign}','${owner.id}',10,'BOB' FROM generate_series(1,21); UPDATE campaign SET status='CLOSED' WHERE id='${campaign}';`)
    const page1 = await json<ContributionPage>(await call('me/contributions', owner.cookie)), page2 = await json<ContributionPage>(await call('me/contributions?page=2', owner.cookie))
    assert.equal(page1.total, 24); assert.equal(page1.items.length, 20); assert.equal(page2.items.length, 4); assert.equal(new Set([...page1.items, ...page2.items].map(item => item.id)).size, 24)
    assert.equal(page1.items[0]!.campaign.status, 'CLOSED'); assert.equal(page1.items[0]!.campaign.slug, null)
    assert.equal((await call(`me/contributions/${c1}/receipt`, owner.cookie)).status, 200)
    assert.equal((await call('me/simulations', owner.cookie, { ...input, requestId: randomUUID() })).status, 409)
    sql(`UPDATE payment SET status='DISPUTED' WHERE id='${payment}'`)
    assert.equal((await call(`me/contributions/${c1}/receipt`, owner.cookie)).status, 409)
  } finally {
    await app.close()
    // Limpieza exclusiva de fixtures efímeros de este ensayo; nunca datos previos.
    sql(`DELETE FROM brotar_extension.support_simulation WHERE campaign_id='${campaign}'; DELETE FROM support_case WHERE campaign_id='${campaign}'; DELETE FROM refund WHERE contribution_id IN (SELECT id FROM contribution WHERE campaign_id='${campaign}'); DELETE FROM payment WHERE contribution_id IN (SELECT id FROM contribution WHERE campaign_id='${campaign}'); DELETE FROM contribution WHERE campaign_id='${campaign}'; DELETE FROM campaign WHERE id='${campaign}'; DELETE FROM payment_provider WHERE id IN ('${provider}','${sandbox}');`)
    for (const user of users) sql(`DELETE FROM app_user WHERE id='${user.id}';`)
  }
})
