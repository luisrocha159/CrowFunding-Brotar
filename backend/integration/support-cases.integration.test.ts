import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'
import type { SupportAdminDetail, SupportDetail, SupportPage, SupportReceipt } from '../src/support-cases/application/support-cases'

test('S3-10: reporte real propio, evidencia privada, idempotencia, contexto y auditor sin mutación', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true'); assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', timeout: 10000 }).trim()
  const previousStorage = process.env.FILE_STORAGE_DIR
  const storage = await mkdtemp(join(tmpdir(), 'brotar-support-test-')); process.env.FILE_STORAGE_DIR = storage
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const users: { id: string; cookie: string }[] = [], files: string[] = []
  const campaign = randomUUID(), otherCampaign = randomUUID(), contribution = randomUUID(), organization = randomUUID(), orgCampaign = randomUUID()
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}/api/${path}`, { method, headers: { Cookie: cookie, Origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json', 'X-Brotar-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const json = async <T>(response: Response, expected = 200): Promise<T> => { const data: unknown = await response.json(); assert.equal(response.status, expected, JSON.stringify(data)); return data as T }
  try {
    for (let i = 0; i < 3; i++) {
      const email = `support-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('hex')
      const user = await json<{ id: string }>(await call('auth/register', '', { firstName: 'Ensayo', lastName: 'Soporte', email, password, demoConsent: true }), 201)
      const login = await call('auth/login', '', { email, password }); assert.equal(login.status, 200)
      users.push({ id: user.id, cookie: login.headers.get('set-cookie')!.split(';')[0]! })
    }
    const [owner, other, support] = users as [typeof users[number], typeof users[number], typeof users[number]]
    sql(`INSERT INTO campaign(id,creator_user_id,slug,title,campaign_type,currency_code) VALUES
      ('${campaign}','${owner.id}','support-${campaign}','Proyecto propio','DONATION','BOB'),
      ('${otherCampaign}','${other.id}','support-${otherCampaign}','PRIVADO_NO_DIVULGAR','DONATION','BOB');
      INSERT INTO contribution(id,user_id,campaign_id,amount,currency_code) VALUES('${contribution}','${owner.id}','${otherCampaign}',10,'BOB');
      INSERT INTO organization(id,slug,legal_name,organization_type_id,created_by) VALUES('${organization}','support-${organization}','Organización prueba',(SELECT id FROM organization_type LIMIT 1),'${owner.id}');
      INSERT INTO organization_member(organization_id,user_id,organization_role) VALUES('${organization}','${owner.id}','OWNER');
      INSERT INTO campaign(id,creator_user_id,organization_id,slug,title,campaign_type,currency_code) VALUES('${orgCampaign}','${owner.id}','${organization}','support-${orgCampaign}','Campaña de organización','DONATION','BOB');
      UPDATE organization_member SET organization_role='MEMBER' WHERE organization_id='${organization}';`)
    assert.equal((await call('me/support-cases')).status, 401)
    assert.equal((await call(`me/support-cases/context?campaignId=${campaign}`, other.cookie)).status, 404)
    assert.equal((await call(`me/support-cases/context?campaignId=${otherCampaign}`, owner.cookie)).status, 404)
    const context = await json<{ campaignTitle: string }>(await call(`me/support-cases/context?contributionId=${contribution}`, owner.cookie))
    assert.equal(context.campaignTitle, 'Campaña no disponible')
    sql(`UPDATE campaign SET published_at=now() WHERE id='${otherCampaign}';`)
    const withdrawn = await json<{ campaignTitle: string }>(await call(`me/support-cases/context?contributionId=${contribution}`, owner.cookie))
    assert.equal(withdrawn.campaignTitle, 'Campaña no disponible', 'Una fecha histórica no publica el título actual de un borrador ajeno.')
    assert.equal((await call(`me/support-cases/context?contributionId=${contribution}`, other.cookie)).status, 404)
    assert.equal((await call(`me/support-cases/context?campaignId=${campaign}&contributionId=${contribution}`, owner.cookie)).status, 404)
    assert.equal((await call(`me/support-cases/context?campaignId=${orgCampaign}`, owner.cookie)).status, 404, 'Crear la campaña no evita validar la membresía de su organización.')
    sql(`UPDATE organization_member SET organization_role='ADMIN' WHERE organization_id='${organization}';`)
    assert.equal((await call(`me/support-cases/context?campaignId=${orgCampaign}`, owner.cookie)).status, 200)
    sql(`UPDATE organization_member SET left_at=now() WHERE organization_id='${organization}';`)
    assert.equal((await call(`me/support-cases/context?campaignId=${orgCampaign}`, owner.cookie)).status, 404)
    const upload = async (user: typeof owner, purpose: string) => {
      const result = await json<{ id: string }>(await call('files', user.cookie, { visibility: 'PRIVATE', purpose, originalName: 'evidencia.pdf', mimeType: 'application/pdf', contentBase64: Buffer.from('%PDF-1.7\n%%EOF').toString('base64') }), 201)
      files.push(result.id); return result.id
    }
    const evidence = await upload(owner, 'SUPPORT_EVIDENCE'), foreign = await upload(other, 'SUPPORT_EVIDENCE'), wrongPurpose = await upload(owner, 'VERIFICATION_DOCUMENT')
    sql(`UPDATE campaign SET status='PUBLISHED',published_at=now() WHERE id='${campaign}';`)
    const publicContext = await json<{ publicReport: boolean }>(await call(`me/support-cases/context?campaignId=${campaign}`, other.cookie))
    assert.equal(publicContext.publicReport, true)
    const publicReport = { requestId: randomUUID(), campaignId: campaign, contributionId: null, category: 'PROJECT_NOT_EXECUTED', subject: 'Consulta sobre ejecución', description: 'No encuentro información pública del avance anunciado.', confirmed: true, evidenceFileIds: [] }
    assert.equal((await call('me/support-cases', other.cookie, { ...publicReport, category: 'REFUND_REQUEST' })).status, 404)
    const publicCase = await json<SupportReceipt>(await call('me/support-cases', other.cookie, publicReport), 201)
    assert.equal((await json<SupportPage>(await call('me/support-cases', owner.cookie))).total, 0, 'El reporte de un tercero no aparece en la cuenta de la persona reportada.')
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${support.id}',id FROM role WHERE code='SUPPORT';`)
    assert.equal((await call(`admin/support-cases/${publicCase.id}`, other.cookie)).status, 403, 'El reportante externo no obtiene permiso administrativo.')
    assert.equal((await call(`admin/support-cases/${publicCase.id}/actions`, support.cookie, { status: 'IN_PROGRESS', reason: 'breve' })).status, 400)
    assert.equal((await call(`admin/support-cases/${publicCase.id}/messages`, support.cookie, { body: 'Revisaremos la información pública disponible.' })).status, 200)
    const transitionReason = 'Se revisó la información pública disponible.'
    assert.equal((await call(`admin/support-cases/${publicCase.id}/actions`, support.cookie, { status: 'AWAITING_RESPONSE', reason: transitionReason })).status, 200)
    const adminCase = await json<SupportAdminDetail>(await call(`admin/support-cases/${publicCase.id}`, support.cookie))
    assert.equal(adminCase.status, 'AWAITING_RESPONSE')
    assert.equal(adminCase.events.length, 2)
    assert.deepEqual(adminCase.events.map(event => ({ previousStatus: event.previousStatus, status: event.status, reason: event.reason })), [
      { previousStatus: 'OPEN', status: 'IN_PROGRESS', reason: 'Se envió una respuesta compartida al titular.' },
      { previousStatus: 'IN_PROGRESS', status: 'AWAITING_RESPONSE', reason: transitionReason }
    ])
    const requestId = randomUUID()
    const input = { requestId, campaignId: otherCampaign, contributionId: contribution, category: 'REFUND_REQUEST', subject: 'Consulta de devolución', description: 'Descripción privada de la incidencia', confirmed: true, evidenceFileIds: [evidence] }
    const financialCounts = () => sql("SELECT (SELECT count(*) FROM contribution)::text||':'||(SELECT count(*) FROM payment)::text||':'||(SELECT count(*) FROM refund)::text||':'||(SELECT count(*) FROM dispute)::text")
    const financeBefore = financialCounts()
    for (const patch of [{ confirmed: false }, { userId: other.id }, { evidenceFileIds: [evidence, evidence] }]) assert.equal((await call('me/support-cases', owner.cookie, { ...input, ...patch })).status, 400)
    for (const file of [foreign, wrongPurpose]) assert.equal((await call('me/support-cases', owner.cookie, { ...input, evidenceFileIds: [file] })).status, 404)
    const created = await Promise.all([call('me/support-cases', owner.cookie, input), call('me/support-cases', owner.cookie, input)])
    const first = await json<SupportReceipt>(created[0]!, 201), repeat = await json<SupportReceipt>(created[1]!, 201)
    assert.equal(first.id, repeat.id); assert.match(first.reference, /^BRT-S-/); assert.equal(first.status, 'OPEN')
    assert.equal((await call('me/support-cases', owner.cookie, { ...input, description: 'Otra descripción' })).status, 409)
    assert.equal((await call(`me/support-cases/${first.id}`, other.cookie)).status, 404)
    sql(`INSERT INTO support_case_message(support_case_id,author_user_id,body,is_internal) VALUES('${first.id}','${other.id}','Respuesta visible',false),('${first.id}','${other.id}','INTERNO_NO_DIVULGAR',true);`)
    const detail = await json<SupportDetail>(await call(`me/support-cases/${first.id}`, owner.cookie))
    assert.equal(detail.contributionId, contribution); assert.equal(detail.evidence[0]?.fileId, evidence); assert.equal(detail.messages.length, 1); assert.equal(detail.messages[0]?.body, 'Respuesta visible')
    assert.ok(!JSON.stringify(detail).includes('INTERNO_NO_DIVULGAR')); assert.ok(!JSON.stringify(detail).includes('PRIVADO_NO_DIVULGAR'))
    assert.equal((await json<SupportPage>(await call('me/support-cases', owner.cookie))).total, 1)
    assert.equal((await json<SupportPage>(await call('me/support-cases', other.cookie))).total, 0)
    assert.equal((await call(`files/${evidence}`, owner.cookie)).status, 200)
    assert.equal((await call(`files/${evidence}`, other.cookie)).status, 403)
    assert.equal((await call(`files/public/${evidence}`)).status, 404)
    assert.equal((await call(`files/${evidence}`, owner.cookie, undefined, 'DELETE')).status, 409, 'La evidencia enlazada no se elimina.')
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_name='support_case' AND entity_id='${first.id}' AND actor_user_id='${owner.id}' AND action='CREATE';`), '1')
    assert.equal(financialCounts(), financeBefore)
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code IN ('AUDITOR','ADMIN');`)
    assert.equal((await call('me/support-cases', owner.cookie, { ...input, requestId: randomUUID() })).status, 403)
    assert.equal((await call(`me/support-cases/${first.id}`, owner.cookie)).status, 200)
  } finally {
    await app.close()
    const campaignIds = `'${campaign}','${otherCampaign}','${orgCampaign}'`
    sql(`DELETE FROM audit_log WHERE entity_name='support_case' AND entity_id IN (SELECT id FROM support_case WHERE campaign_id IN (${campaignIds}));
      DELETE FROM brotar_extension.support_case_evidence WHERE case_id IN (SELECT id FROM support_case WHERE campaign_id IN (${campaignIds}));
      DELETE FROM brotar_extension.support_case_event WHERE case_id IN (SELECT id FROM support_case WHERE campaign_id IN (${campaignIds}));
      DELETE FROM brotar_extension.support_case_context WHERE case_id IN (SELECT id FROM support_case WHERE campaign_id IN (${campaignIds}));
      DELETE FROM support_case WHERE campaign_id IN (${campaignIds}); DELETE FROM contribution WHERE id='${contribution}'; DELETE FROM campaign WHERE id IN (${campaignIds}); DELETE FROM organization WHERE id='${organization}';`)
    for (const file of files) sql(`DELETE FROM file_asset WHERE id='${file}';`)
    for (const user of users) sql(`DELETE FROM app_user WHERE id='${user.id}';`)
    if (previousStorage === undefined) delete process.env.FILE_STORAGE_DIR; else process.env.FILE_STORAGE_DIR = previousStorage
    await rm(storage, { recursive: true, force: true })
  }
})
