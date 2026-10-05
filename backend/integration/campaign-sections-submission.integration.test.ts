import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'
import type { CampaignSubmission } from '../src/campaigns/application/submission'
import type { AdministrativeDetail } from '../src/campaigns/application/administrative-review'
type SubmissionReport = Awaited<ReturnType<CampaignSubmission['review']>>

test('S2 completo PostgreSQL: constructor, revisión real, corrección, aprobación privada, publicación y rechazo', { timeout: 120000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', timeout: 10000 }).trim()
  const suffix = randomUUID().slice(0, 8), category = randomUUID(), expense = randomUUID()
  const currency = sql('SELECT trim(code) FROM currency WHERE is_active=true ORDER BY code LIMIT 1;')
  assert.match(currency, /^[A-Z]{3}$/)
  const users: string[] = [], files: string[] = []
  const root = await mkdtemp(join(tmpdir(), 'brotar-santiago-test-'))
  const originalRoot = process.env.FILE_STORAGE_DIR
  const originalPublication = process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED
  process.env.FILE_STORAGE_DIR = root
  process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED = 'true' // Política provisional de entrega autorizada; solo fixtures tienen ADMIN.
  const password = ` Ñ y acentos: ${randomBytes(24).toString('hex')} `
  let app: INestApplication | undefined
  let base = ''
  async function start() {
    app = await NestFactory.create(AppModule, { logger: false })
    configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
    await app.listen(0, '127.0.0.1'); base = await app.getUrl()
  }
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}/api/${path}`, {
    method, headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const register = async (label: string) => {
    const email = `santiago-${label}-${suffix}@example.invalid`
    const registered = await call('auth/register', '', { firstName: 'Ensayo', lastName: label, email, password, demoConsent: true })
    assert.equal(registered.status, 201)
    const { id } = await registered.json() as { id: string }
    assert.match(id, /^[a-f0-9-]{36}$/); users.push(id)
    const alteredLogin = await call('auth/login', '', { email, password: password.trim() })
    assert.equal(alteredLogin.status, 401, 'La contraseña conserva Ñ y espacios; no se normaliza.')
    const login = await call('auth/login', '', { email, password })
    assert.equal(login.status, 200)
    return { id, email, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }
  try {
    await start()
    const creator = await register('creador'), other = await register('otro'), admin = await register('administrador')
    sql(`INSERT INTO category(id,slug,name) VALUES('${category}','santiago-${suffix}','Categoría temporal');
      INSERT INTO expense_category(id,code,name) VALUES('${expense}','santiago-${suffix}','Gasto temporal');`)
    const created = await call('campaigns/drafts', creator.cookie, { title: 'Campaña integrada', summary: 'Resumen de ensayo', campaignType: 'REWARD' })
    assert.equal(created.status, 201)
    const { id } = await created.json() as { id: string }
    const path = `campaigns/drafts/${id}`
    const adminPath = `admin/campaigns/${id}`
    assert.equal((await call(`${adminPath}/detail`, admin.cookie)).status, 403)
    for (const section of ['plan', 'budget', 'funding', 'rewards', 'submission', 'section-catalogs']) {
      assert.equal((await call(`${path}/${section}`)).status, 401)
      assert.equal((await call(`${path}/${section}`, other.cookie)).status, section === 'section-catalogs' ? 200 : 404, `Propiedad de datos privados: ${section}; el catálogo no contiene datos de campaña.`)
      assert.equal((await call(`${path}/${section}`, creator.cookie)).status, 200, `Lectura propia: ${section}`)
    }
    assert.equal((await call(`${path}/submission`, creator.cookie, {})).status, 403, 'Registro no concede CREATOR.')
    // Roles de cuentas efímeras, no provisión de roles del producto ni resolución de D06.
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${creator.id}',id FROM role WHERE code='CREATOR';
      INSERT INTO user_role(user_id,role_id) SELECT '${admin.id}',id FROM role WHERE code='ADMIN';`)
    assert.equal((await call(`${path}/submission`, other.cookie, {})).status, 403)
    const incomplete = await call(`${path}/submission`, creator.cookie, {})
    assert.equal(incomplete.status, 422)
    const missing = await incomplete.json() as { missing: { step: number }[] }
    assert.ok(missing.missing.some(item => item.step === 4))
    assert.equal(sql(`SELECT count(*) FROM campaign_review WHERE campaign_id='${id}';`), '0')
    const plan = { activities: [{ name: 'Plantación', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-10' }], milestones: [{ name: 'Entrega', responsibleName: 'Ana', plannedStartOn: '2026-11-10', plannedEndOn: '2026-11-10', activityIndex: 0 }] }
    assert.equal((await call(`${path}/plan`, creator.cookie, plan, 'PUT')).status, 200)
    assert.deepEqual(await (await call(`${path}/plan`, creator.cookie)).json(), plan)
    assert.equal((await call(`${path}/plan`, creator.cookie, { ...plan, activities: [{ ...plan.activities[0], plannedEndOn: '2026-10-01' }] }, 'PUT')).status, 400)
    assert.equal((await call(`${path}/plan`, creator.cookie, { ...plan, activities: [{ ...plan.activities[0], name: 42 }] }, 'PUT')).status, 400)
    assert.equal((await call(`${path}/plan`, creator.cookie, plan, 'PUT')).status, 200)
    assert.equal((await call(`${path}/plan`, other.cookie, plan, 'PUT')).status, 404)
    const budget = { items: [{ categoryId: expense, description: 'Semillas', quantity: 2, unitPrice: 5, plannedAmount: 10, notes: 'Compra local' }], risks: [{ title: 'Retraso', description: 'Proveedor', likelihood: 'Media', impact: 'Medio', mitigation: 'Proveedor alternativo' }] }
    assert.equal((await call(`${path}/budget`, creator.cookie, budget, 'PUT')).status, 200)
    assert.deepEqual(await (await call(`${path}/budget`, creator.cookie)).json(), budget)
    for (const invalid of [{ ...budget, items: [{ ...budget.items[0], notes: 'Nulo\u0000' }] },
      { ...budget, items: [{ ...budget.items[0], notes: 'a'.repeat(5001) }] },
      { ...budget, risks: [{ ...budget.risks[0], mitigation: 'a'.repeat(5001) }] }]) {
      assert.equal((await call(`${path}/budget`, creator.cookie, invalid, 'PUT')).status, 400)
      assert.deepEqual(await (await call(`${path}/budget`, creator.cookie)).json(), budget, 'Validar antes de escribir conserva lo guardado.')
    }
    assert.equal((await call(`${path}/budget`, creator.cookie, { ...budget, items: [{ ...budget.items[0], plannedAmount: -1 }] }, 'PUT')).status, 400)
    assert.deepEqual(await (await call(`${path}/budget`, creator.cookie)).json(), budget, 'Una entrada inválida no reemplaza las partidas anteriores.')
    sql(`UPDATE expense_category SET is_active=false WHERE id='${expense}';`)
    assert.equal((await call(`${path}/budget`, creator.cookie, budget, 'PUT')).status, 400)
    sql(`UPDATE expense_category SET is_active=true WHERE id='${expense}';`)
    const funding = { goalAmount: 1000, currencyCode: currency, durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: null, endsAt: null }
    assert.equal((await call(`${path}/funding`, creator.cookie, funding, 'PUT')).status, 200)
    assert.equal((await call(`${path}/funding`, creator.cookie, { ...funding, goalAmount: 0 }, 'PUT')).status, 400)
    assert.equal((await call(`${path}/funding`, creator.cookie, { ...funding, fundingModel: 'INVALID' }, 'PUT')).status, 400)
    const rewards = [{ title: 'Planta', description: 'Una planta', rewardKind: 'REWARD', minAmount: 10, quantityTotal: 20, estimatedDeliveryOn: '2027-01-01' }]
    assert.equal((await call(`${path}/rewards`, creator.cookie, { rewards }, 'PUT')).status, 200)
    assert.equal((await call(`${path}/rewards`, creator.cookie, { rewards: [{ ...rewards[0], minAmount: 0 }] }, 'PUT')).status, 400)
    assert.equal((await call(`${path}/modality`, creator.cookie, { campaignType: 'DONATION', fundingModel: 'FLEXIBLE' }, 'PUT')).status, 409)
    assert.equal((await call(`${path}/modality`, creator.cookie, { campaignType: 'DONATION', fundingModel: 'FLEXIBLE', acknowledgeRewards: true }, 'PUT')).status, 200)
    assert.equal((await call(`${path}/rewards`, creator.cookie, { rewards }, 'PUT')).status, 400)
    assert.equal((await call(`${path}/rewards`, creator.cookie, { rewards: [] }, 'PUT')).status, 200)
    assert.equal(sql(`SELECT count(*) FROM reward WHERE campaign_id='${id}';`), '1', 'Cambiar a donación no borra las recompensas.')
    assert.equal((await call(`${path}/modality`, creator.cookie, { campaignType: 'REWARD', fundingModel: 'FLEXIBLE' }, 'PUT')).status, 200)
    assert.deepEqual((await (await call(`${path}/rewards`, creator.cookie)).json() as { rewards: unknown[] }).rewards, rewards)
    const general = { title: 'Campaña integrada', summary: 'Resumen de ensayo', categoryId: category, location: { countryCode: 'BO', locality: 'La Paz', addressLine: '', reference: '' } }
    assert.equal((await call(`${path}/general`, creator.cookie, general, 'PUT')).status, 200)
    const story = { problem: 'Problema de ensayo', solution: 'Solución de ensayo', beneficiaries: 'Familias de ensayo', expectedResults: 'Resultado de ensayo', indicators: [{ name: 'Plantas', description: 'Meta de ensayo', unit: 'unidades', targetValue: 100 }] }
    assert.equal((await call(`${path}/story`, creator.cookie, story, 'PUT')).status, 200)
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
    const uploaded = await call('files', creator.cookie, { visibility: 'PUBLIC', purpose: 'CAMPAIGN_PUBLIC_IMAGE', originalName: 'ensayo.png', mimeType: 'image/png', contentBase64: png.toString('base64') })
    assert.equal(uploaded.status, 201)
    const file = await uploaded.json() as { id: string }; files.push(file.id)
    assert.equal((await call(`${path}/cover`, creator.cookie, { fileId: file.id, altText: 'Plantas para la campaña de ensayo' }, 'PATCH')).status, 200)
    assert.deepEqual((await (await call(`${path}/submission`, creator.cookie)).json() as SubmissionReport).missing, [])
    sql(`UPDATE file_asset SET scope='PRIVATE' WHERE id='${file.id}';`)
    assert.equal((await call(`${path}/submission`, creator.cookie, {})).status, 422, 'No envía una campaña con portada privada.')
    sql(`UPDATE file_asset SET scope='PUBLIC' WHERE id='${file.id}';`)
    await app!.close(); app = undefined; await start()
    assert.deepEqual(await (await call(`${path}/plan`, creator.cookie)).json(), plan, 'Datos y sesión sobreviven al reinicio de la API.')
    assert.deepEqual(await (await call(`${path}/funding`, creator.cookie)).json(), funding)
    const sent = await Promise.all([call(`${path}/submission`, creator.cookie, {}), call(`${path}/submission`, creator.cookie, {})])
    assert.deepEqual(sent.map(response => response.status).sort(), [201, 409])
    assert.equal(sql(`SELECT count(*) FROM campaign_review WHERE campaign_id='${id}' AND decision='PENDING';`), '1')
    assert.equal(sql(`SELECT status FROM campaign WHERE id='${id}';`), 'IN_REVIEW')
    assert.equal(sql(`SELECT count(*) FROM status_history WHERE entity_id='${id}' AND to_status='IN_REVIEW' AND changed_by='${creator.id}';`), '1')
    for (const [section, body] of [['plan', plan], ['budget', budget], ['funding', funding], ['rewards', { rewards }]] as const) {
      assert.equal((await call(`${path}/${section}`, creator.cookie, body, 'PUT')).status, 409)
    }
    const queue = await (await call('admin/campaigns/review', admin.cookie)).json() as { id: string }[]
    assert.ok(queue.some(row => row.id === id), 'El envío aparece en la cola S2-17.')
    assert.ok((await (await call('campaigns/mine', creator.cookie)).json() as { id: string }[]).some(row => row.id === id), 'La lista S2-15 conserva la campaña enviada.')
    const review = await (await call(`${adminPath}/detail`, admin.cookie)).json() as AdministrativeDetail
    assert.equal(review.project.status, 'IN_REVIEW'); assert.equal(review.campaignType, 'REWARD')
    assert.deepEqual(review.plan, plan); assert.deepEqual(review.budget, budget); assert.deepEqual(review.funding, funding)
    assert.deepEqual(review.rewards, rewards); assert.equal(review.cover!.fileId, file.id)
    assert.equal(review.story.indicators[0]!.name, 'Plantas'); assert.deepEqual(review.missing, [])
    assert.equal(review.rounds.at(-1)!.round, 1); assert.equal(review.publicationEnabled, true)
    assert.equal((await call(`${adminPath}/detail`)).status, 401)
    assert.equal((await call(`${adminPath}/detail`, creator.cookie)).status, 403)
    const changes = { decision: 'CHANGES_REQUESTED', comment: 'Aclara la historia antes de aprobar.', expectedRound: 1,
      observations: [{ section: 'story', fieldPath: 'problem', message: 'Aclara el problema' }] }
    assert.equal((await call(`${adminPath}/decision`, '', changes)).status, 401)
    assert.equal((await call(`${adminPath}/decision`, creator.cookie, changes)).status, 403)
    for (const patch of [{ comment: ' ' }, { expectedRound: '1' }, { decision: 'PUBLISHED' }, { owner: creator.id }, { observations: [{ section: 'invalid', message: 'Ajusta' }] }]) {
      assert.equal((await call(`${adminPath}/decision`, admin.cookie, { ...changes, ...patch })).status, 400)
    }
    const beforeDenied = sql(`SELECT count(*) FROM status_history WHERE entity_id='${id}';`)
    const denied = await fetch(`${base}/api/${adminPath}/decision`, { method: 'POST', headers: { Cookie: admin.cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(changes) })
    assert.equal(denied.status, 403)
    assert.equal(sql(`SELECT count(*) FROM status_history WHERE entity_id='${id}';`), beforeDenied)
    const decisions = await Promise.all([call(`${adminPath}/decision`, admin.cookie, changes), call(`${adminPath}/decision`, admin.cookie, changes)])
    assert.deepEqual(decisions.map(response => response.status).sort(), [200, 409])
    assert.equal(sql(`SELECT count(*) FROM campaign_review_observation WHERE review_id IN (SELECT id FROM campaign_review WHERE campaign_id='${id}');`), '1')
    assert.equal(sql(`SELECT reviewer_user_id FROM campaign_review WHERE campaign_id='${id}' AND round=1;`), admin.id)
    assert.equal(sql(`SELECT reason FROM status_history WHERE entity_id='${id}' AND to_status='CHANGES_REQUESTED';`), changes.comment)
    assert.equal(sql(`SELECT changed_by FROM status_history WHERE entity_id='${id}' AND to_status='CHANGES_REQUESTED';`), admin.id)
    const observed = await (await call(`${path}/submission`, creator.cookie)).json() as SubmissionReport
    assert.equal(observed.observations[0]!.message, 'Aclara el problema')
    assert.equal((await call(`${path}/story`, creator.cookie, { ...story, problem: 'Problema corregido' }, 'PUT')).status, 200)
    assert.equal((await call(`${path}/cover`, creator.cookie, { fileId: file.id, altText: 'Portada corregida de la campaña' }, 'PATCH')).status, 200)
    assert.equal((await call(`${path}/plan`, creator.cookie, plan, 'PUT')).status, 200)
    assert.equal((await call(`campaigns/mine/${id}/discard`, creator.cookie, { confirmed: true })).status, 409)
    assert.equal((await call(`${path}/submission`, creator.cookie, {})).status, 201)
    assert.equal(sql(`SELECT count(*) FROM campaign_review WHERE campaign_id='${id}';`), '2')
    assert.equal(sql(`SELECT count(*) FROM campaign_review_observation WHERE review_id IN (SELECT id FROM campaign_review WHERE campaign_id='${id}');`), '1', 'Reenviar no borra observaciones históricas.')
    assert.equal(sql(`SELECT problem FROM campaign_story WHERE campaign_id='${id}';`), 'Problema corregido')
    assert.equal((await call(`${adminPath}/decision`, admin.cookie, changes)).status, 409, 'No decide sobre otra ronda usando una vista antigua.')
    assert.equal((await call(`${adminPath}/decision`, admin.cookie, { ...changes, expectedRound: 2, comment: 'Detalla las partidas', observations: [{ section: 'budget', fieldPath: null, message: 'Detalla las partidas' }] })).status, 200)
    const second = await (await call(`${path}/submission`, creator.cookie)).json() as SubmissionReport
    assert.deepEqual(second.observations.map(item => item.message), ['Detalla las partidas'], 'Se presenta la última ronda, no las observaciones anteriores.')
    assert.equal((await call(`${path}/submission`, creator.cookie, {})).status, 201)
    const slug = sql(`SELECT slug FROM campaign WHERE id='${id}';`)
    assert.equal((await call(`campaigns/public/${slug}`)).status, 404)
    const approve = { decision: 'APPROVED', comment: 'Campaña revisada y corregida.', expectedRound: 3, observations: [] }
    assert.equal((await call(`${adminPath}/publish`, admin.cookie, { confirmed: true, expectedRound: 3 })).status, 409, 'Publicar exige aprobación previa.')
    sql(`UPDATE category SET is_active=false WHERE id='${category}';`)
    assert.equal((await call(`${adminPath}/decision`, admin.cookie, approve)).status, 422, 'Aprobar revalida información y catálogos bajo bloqueo.')
    assert.equal(sql(`SELECT decision FROM campaign_review WHERE campaign_id='${id}' AND round=3;`), 'PENDING')
    sql(`UPDATE category SET is_active=true WHERE id='${category}';`)
    assert.equal((await call(`${adminPath}/decision`, admin.cookie, approve)).status, 200)
    assert.equal(sql(`SELECT status FROM campaign WHERE id='${id}';`), 'APPROVED')
    assert.equal(sql(`SELECT published_at IS NULL AND approved_at IS NOT NULL FROM campaign WHERE id='${id}';`), 't')
    assert.equal((await call(`campaigns/public/${slug}`)).status, 404, 'Aprobación privada, no publicación implícita.')
    assert.equal((await call(`${path}/story`, creator.cookie, story, 'PUT')).status, 409)
    assert.ok((await (await call('admin/campaigns/review', admin.cookie)).json() as { id: string }[]).some(row => row.id === id), 'Aprobada queda visible para publicar.')
    for (const body of [{ confirmed: false, expectedRound: 3 }, { confirmed: 'true', expectedRound: 3 }, { confirmed: true, expectedRound: 3, role: 'ADMIN' }]) assert.equal((await call(`${adminPath}/publish`, admin.cookie, body)).status, 400)
    assert.equal((await call(`${adminPath}/publish`, creator.cookie, { confirmed: true, expectedRound: 3 })).status, 403)
    assert.equal((await call(`${adminPath}/publish`, admin.cookie, { confirmed: true, expectedRound: 2 })).status, 409)
    const publication = await Promise.all([call(`${adminPath}/publish`, admin.cookie, { confirmed: true, expectedRound: 3 }), call(`${adminPath}/publish`, admin.cookie, { confirmed: true, expectedRound: 3 })])
    assert.deepEqual(publication.map(response => response.status).sort(), [200, 409])
    assert.equal(sql(`SELECT count(*) FROM status_history WHERE entity_id='${id}' AND to_status='PUBLISHED' AND changed_by='${admin.id}';`), '1')
    const history = await (await call(`campaigns/mine/${id}`, creator.cookie)).json() as { history: { toStatus: string; reason: string }[] }
    assert.deepEqual(history.history.map(event => event.toStatus), ['DRAFT','IN_REVIEW','CHANGES_REQUESTED','IN_REVIEW','CHANGES_REQUESTED','IN_REVIEW','APPROVED','PUBLISHED'])
    assert.equal(history.history.at(-1)!.reason, 'Publicación administrativa explícita')
    assert.ok(!(await (await call('admin/campaigns/review', admin.cookie)).json() as { id: string }[]).some(row => row.id === id))
    const publicView = await call(`campaigns/public/${slug}`)
    assert.equal(publicView.status, 200)
    assert.equal((await publicView.json() as { rewards: unknown[] }).rewards.length, 1)
    await app!.close(); app = undefined; await start()
    assert.equal((await call(`campaigns/public/${slug}`)).status, 200, 'La publicación persiste tras reiniciar la API.')
    const publishedDetail = await (await call(`${adminPath}/detail`, admin.cookie)).json() as AdministrativeDetail
    assert.equal(publishedDetail.project.status, 'PUBLISHED'); assert.equal(publishedDetail.rounds.length, 3)
    assert.equal(publishedDetail.rounds.at(-1)!.reviewerName, 'Ensayo administrador')
    // Segundo recorrido para rechazo, usando constructor y envío reales, sin fabricar estados.
    const rejectedDraft = await (await call('campaigns/drafts', creator.cookie, { title: 'Campaña para rechazo', summary: 'Ensayo negativo', campaignType: 'DONATION' })).json() as { id: string }
    const rejectedPath = `campaigns/drafts/${rejectedDraft.id}`, rejectedAdmin = `admin/campaigns/${rejectedDraft.id}`
    for (const [section, body] of [['general', { ...general, title: 'Campaña para rechazo' }], ['story', story], ['plan', plan], ['budget', budget], ['funding', funding]] as const) assert.equal((await call(`${rejectedPath}/${section}`, creator.cookie, body, 'PUT')).status, 200)
    assert.equal((await call(`${rejectedPath}/cover`, creator.cookie, { fileId: file.id, altText: 'Portada de prueba' }, 'PATCH')).status, 200)
    assert.equal((await call(`${rejectedPath}/submission`, creator.cookie, {})).status, 201)
    const rejection = { decision: 'REJECTED', comment: 'No satisface el alcance de esta convocatoria.', expectedRound: 1, observations: [] }
    assert.equal((await call(`${rejectedAdmin}/decision`, admin.cookie, rejection)).status, 200)
    assert.equal(sql(`SELECT status FROM campaign WHERE id='${rejectedDraft.id}';`), 'REJECTED')
    assert.equal(sql(`SELECT reason FROM status_history WHERE entity_id='${rejectedDraft.id}' AND to_status='REJECTED';`), rejection.comment)
    const rejectionDetail = await (await call(`campaigns/mine/${rejectedDraft.id}`, creator.cookie)).json() as { status: string; history: { reason: string }[] }
    assert.equal(rejectionDetail.status, 'REJECTED'); assert.equal(rejectionDetail.history.at(-1)!.reason, rejection.comment)
    for (const operation of [`${rejectedPath}/submission`, `${rejectedAdmin}/publish`]) assert.equal((await call(operation, operation.includes('admin/') ? admin.cookie : creator.cookie, operation.includes('admin/') ? { confirmed: true, expectedRound: 1 } : {})).status, 409)
    assert.equal((await call(`${rejectedPath}/general`, creator.cookie, general, 'PUT')).status, 409)
    const rejectedSlug = sql(`SELECT slug FROM campaign WHERE id='${rejectedDraft.id}';`)
    assert.equal((await call(`campaigns/public/${rejectedSlug}`)).status, 404)
    assert.ok(!(await (await call('campaigns/public')).json() as { id: string }[]).some(row => row.id === rejectedDraft.id))
    sql(`UPDATE campaign SET campaign_type='DONATION' WHERE id='${id}';`)
    assert.equal((await (await call(`campaigns/public/${slug}`)).json() as { rewards: unknown[] }).rewards.length, 0, 'El público no ve recompensas inaplicables a donación.')
  } finally {
    await app?.close()
    for (const id of users) sql(`DELETE FROM status_history WHERE entity_type='CAMPAIGN' AND entity_id IN (SELECT id FROM campaign WHERE creator_user_id='${id}');
      DELETE FROM campaign WHERE creator_user_id='${id}'; DELETE FROM file_asset WHERE uploaded_by='${id}'; DELETE FROM app_user WHERE id='${id}';`)
    sql(`DELETE FROM category WHERE id='${category}'; DELETE FROM expense_category WHERE id='${expense}';`)
    for (const id of files) await rm(join(root, 'CAMPAIGN_PUBLIC_IMAGE', `${id}.bin`), { force: true })
    if (originalRoot === undefined) delete process.env.FILE_STORAGE_DIR
    else process.env.FILE_STORAGE_DIR = originalRoot
    if (originalPublication === undefined) delete process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED
    else process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED = originalPublication
  }
})
