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
import type { PublicCampaign } from '../src/campaigns/application/public-campaigns'

test('S2-16 PostgreSQL: lectura anónima publicada, financiación neta, contenido y exclusión privada', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'],
    { input: query, encoding: 'utf8', timeout: 10000 }).trim()
  const root = await mkdtemp(join(tmpdir(), 'brotar-public-test-'))
  const originalRoot = process.env.FILE_STORAGE_DIR
  process.env.FILE_STORAGE_DIR = root
  const suffix = randomUUID().slice(0, 8), categoryId = randomUUID(), providerId = randomUUID()
  const currency = sql('SELECT code FROM currency ORDER BY code LIMIT 1;')
  assert.match(currency, /^[A-Z]{3}$/, 'Se utiliza una moneda del catálogo oficial, sin ampliarlo.')
  const password = randomBytes(24).toString('hex'), email = `public-${suffix}@example.invalid`
  let userId: string | undefined
  const fileIds: string[] = []
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}/api/${path}`, {
    method, headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  try {
    assert.equal((await call('campaigns/public')).status, 200, 'El catálogo no exige iniciar sesión.')
    const registered = await call('auth/register', '', { legalVersion:'mvp-demo-legal-1.0-20261028', firstName: 'Creador', lastName: 'Público Ensayo', email, password, demoConsent: true })
    assert.equal(registered.status, 201)
    userId = (await registered.json() as { id: string }).id
    assert.match(userId, /^[a-f0-9-]{36}$/)
    const loggedIn = await call('auth/login', '', { email, password })
    assert.equal(loggedIn.status, 200)
    const cookie = loggedIn.headers.get('set-cookie')!.split(';')[0]!
    const created = await call('campaigns/drafts', cookie, { title: `Bosque público ${suffix}`, summary: 'Reforestación de ensayo', campaignType: 'REWARD' })
    assert.equal(created.status, 201)
    const campaign = await created.json() as { id: string; slug?: string }
    assert.match(campaign.id, /^[a-f0-9-]{36}$/)
    const slug = sql(`SELECT slug FROM campaign WHERE id='${campaign.id}';`)
    assert.ok(slug)
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
    const upload = await call('files', cookie, { visibility: 'PUBLIC', purpose: 'CAMPAIGN_PUBLIC_IMAGE', originalName: 'bosque.png', mimeType: 'image/png', contentBase64: png.toString('base64') })
    assert.equal(upload.status, 201)
    const file = await upload.json() as { id: string }; fileIds.push(file.id)
    assert.equal((await call(`campaigns/drafts/${campaign.id}/cover`, cookie, { fileId: file.id, altText: 'Portada de bosque de ensayo' }, 'PATCH')).status, 200)
    // Solo fixtures efímeros: no se simula un endpoint de publicación o de pagos.
    sql(`INSERT INTO category(id,slug,name) VALUES('${categoryId}','public-${suffix}','Ambiente de ensayo ${suffix}');
      UPDATE user_profile SET bio='Perfil público del ensayo' WHERE user_id='${userId}';
      UPDATE campaign SET category_id='${categoryId}',goal_amount=1000,currency_code='${currency}' WHERE id='${campaign.id}';
      INSERT INTO campaign_story(campaign_id,problem,solution,beneficiaries,expected_results,long_description)
        VALUES('${campaign.id}','Problema público','Solución pública','Comunidad de ensayo','Restaurar áreas','Historia pública de ensayo');
      INSERT INTO campaign_location(campaign_id,country_code,locality,address_line,reference)
        VALUES('${campaign.id}','BO','La Paz','DIRECCION_PRIVADA_NO_PUBLICAR','REFERENCIA_PRIVADA_NO_PUBLICAR');
      INSERT INTO campaign_impact_indicator(campaign_id,name,unit,target_value,achieved_value)
        VALUES('${campaign.id}','Árboles','unidades',100,0);
      INSERT INTO reward(campaign_id,currency_code,title,description,min_amount,is_active)
        VALUES('${campaign.id}','${currency}','Semillas de ensayo','Recompensa pública',10.50,true),
        ('${campaign.id}','${currency}','RECOMPENSA_INACTIVA_NO_PUBLICAR','Retirada',20,false);`)
    for (const status of ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']) {
      sql(`UPDATE campaign SET status='${status}' WHERE id='${campaign.id}';`)
      assert.equal((await call(`campaigns/public/${slug}`)).status, 404)
      const list = await (await call('campaigns/public')).json() as PublicCampaign[]
      assert.ok(!list.some(row => row.id === campaign.id), `${status} no es pública.`)
    }
    sql(`UPDATE campaign SET status='PUBLISHED',published_at=now() WHERE id='${campaign.id}';`)
    const detailResponse = await call(`campaigns/public/${slug}`)
    assert.equal(detailResponse.status, 200)
    assert.equal(detailResponse.headers.get('cache-control'), 'no-store')
    const detail = await detailResponse.json() as PublicCampaign
    assert.equal(detail.goal, '1000.00'); assert.equal(detail.raised, '0.00'); assert.equal(detail.currencyCode, currency)
    assert.equal(detail.category, `Ambiente de ensayo ${suffix}`); assert.equal(detail.location, 'La Paz')
    assert.equal(detail.description, 'Historia pública de ensayo'); assert.equal(detail.problem, 'Problema público')
    assert.equal(detail.solution, 'Solución pública'); assert.equal(detail.beneficiaries, 'Comunidad de ensayo')
    assert.equal(detail.expectedResults, 'Restaurar áreas'); assert.equal(detail.creatorDescription, 'Perfil público del ensayo')
    assert.equal(detail.imageId, file.id); assert.equal(detail.imageAlt, 'Portada de bosque de ensayo')
    assert.deepEqual(detail.impact, [{ indicator: 'Árboles', target: '100.00 unidades' }])
    assert.equal(detail.rewards.length, 1); assert.equal(detail.rewards[0]!.minAmount, '10.50')
    const json = JSON.stringify(detail)
    for (const privateValue of [email, password, 'DIRECCION_PRIVADA', 'REFERENCIA_PRIVADA', 'RECOMPENSA_INACTIVA', 'password_hash', 'provider_payload']) assert.ok(!json.includes(privateValue))
    const image = await call(`files/public/${file.id}`)
    assert.equal(image.status, 200); assert.deepEqual(Buffer.from(await image.arrayBuffer()), png)
    const contributionId = randomUUID(), pendingId = randomUUID(), paymentId = randomUUID()
    sql(`INSERT INTO payment_provider(id,code,name) VALUES('${providerId}','public-${suffix}','Proveedor de fixture');
      INSERT INTO contribution(id,campaign_id,user_id,amount,currency_code,status)
        VALUES('${contributionId}','${campaign.id}','${userId}',200,'${currency}','CONFIRMED'),
        ('${pendingId}','${campaign.id}','${userId}',50,'${currency}','PENDING');
      INSERT INTO payment(id,contribution_id,provider_id,idempotency_key,amount,currency_code,status,confirmed_at)
        VALUES('${paymentId}','${contributionId}','${providerId}','public-confirmed-${suffix}',200,'${currency}','CONFIRMED',now()),
        ('${randomUUID()}','${pendingId}','${providerId}','public-pending-${suffix}',50,'${currency}','PENDING',NULL);
      INSERT INTO refund(payment_id,contribution_id,amount,currency_code,status,completed_at)
        VALUES('${paymentId}','${contributionId}',25,'${currency}','REFUNDED',now());`)
    assert.equal((await (await call(`campaigns/public/${slug}`)).json() as PublicCampaign).raised, '175.00', 'La vista resta devoluciones y no suma pagos pendientes.')
    assert.equal((await (await call('campaigns/public')).json() as PublicCampaign[]).find(row => row.id === campaign.id)!.raised, '175.00')
    assert.equal((await call(`campaigns/public/${encodeURIComponent("missing' OR true --")}`)).status, 404)
    for (const condition of ["deleted_at=now()", 'cover_file_id=NULL']) {
      sql(`UPDATE campaign SET ${condition} WHERE id='${campaign.id}';`)
      assert.equal((await call(`campaigns/public/${slug}`)).status, 404)
      sql(`UPDATE campaign SET deleted_at=NULL,cover_file_id='${file.id}' WHERE id='${campaign.id}';`)
    }
    sql(`UPDATE file_asset SET scope='PRIVATE' WHERE id='${file.id}';`)
    assert.equal((await call(`campaigns/public/${slug}`)).status, 404)
    sql(`UPDATE file_asset SET scope='PUBLIC',deleted_at=now() WHERE id='${file.id}';`)
    assert.equal((await call(`campaigns/public/${slug}`)).status, 404)
  } finally {
    await app.close()
    if (userId) sql(`DELETE FROM refund WHERE contribution_id IN (SELECT id FROM contribution WHERE user_id='${userId}');
      DELETE FROM payment WHERE contribution_id IN (SELECT id FROM contribution WHERE user_id='${userId}');
      DELETE FROM contribution WHERE user_id='${userId}';
      DELETE FROM campaign WHERE creator_user_id='${userId}';
      DELETE FROM file_asset WHERE uploaded_by='${userId}'; DELETE FROM app_user WHERE id='${userId}';`)
    sql(`DELETE FROM category WHERE id='${categoryId}'; DELETE FROM payment_provider WHERE id='${providerId}';`)
    for (const id of fileIds) await rm(join(root, 'CAMPAIGN_PUBLIC_IMAGE', `${id}.bin`), { force: true })
    if (originalRoot === undefined) delete process.env.FILE_STORAGE_DIR
    else process.env.FILE_STORAGE_DIR = originalRoot
  }
})
