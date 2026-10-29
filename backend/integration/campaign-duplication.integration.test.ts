import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
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
import type { AdministrativeDetail } from '../src/campaigns/application/administrative-review'
import {approveDemoIdentity,removeDemoIdentityFixtures} from './demo-identity-fixture'

test('semejanzas PostgreSQL/HTTP: nombres repetidos, aviso privado, decisión libre, UUID/slug únicos y envíos paralelos', { timeout: 120000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', timeout: 10000, stdio: ['pipe','pipe','pipe'] }).trim()
  const suffix = randomUUID().slice(0, 8), category = randomUUID(), expense = randomUUID()
  const users: string[] = [], fileIds: string[] = []
  const root = await mkdtemp(join(tmpdir(), 'brotar-duplicate-test-'))
  const originalRoot = process.env.FILE_STORAGE_DIR, originalPublication = process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED,originalDemo=process.env.DEMO_PAYMENTS_ENABLED
  process.env.DEMO_PAYMENTS_ENABLED='true'
  process.env.FILE_STORAGE_DIR = root; process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED = 'true'
  let app: INestApplication | undefined
  let url = ''
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${url}/api/${path}`, {
    method, headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const account = async (label: string, role: string) => {
    const email = `duplicates-${label}-${suffix}@example.invalid`, password = `Ensayo seguro con Ñ ${suffix}`
    const response = await call('auth/register', '', { legalVersion:'mvp-demo-legal-1.0-20261028', firstName: 'Ensayo', lastName: label, email, password, demoConsent: true })
    assert.equal(response.status, 201)
    const { id } = await response.json() as { id: string }; users.push(id)
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`)
    const login = await call('auth/login', '', { email, password }); assert.equal(login.status, 200)
    return { id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }
  const story = { problem: `La erosión afecta parcelas de familias del sector ${suffix}`,
    solution: `Plantar árboles nativos para recuperar los suelos del sector ${suffix}`,
    beneficiaries: `Cuarenta familias agricultoras de las parcelas del sector ${suffix}`,
    expectedResults: `Mil árboles nativos plantados con la comunidad del sector ${suffix}`,
    indicators: [{ name: 'Árboles nativos', description: '', unit: 'unidades', targetValue: 1000 }] }
  const plan = { activities: [{ name: 'Preparar terreno', responsibleName: 'Ana', plannedStartOn: '2027-11-01', plannedEndOn: '2027-11-10' },
    { name: 'Plantar árboles nativos', responsibleName: 'Ana', plannedStartOn: '2027-11-11', plannedEndOn: '2027-11-20' }], milestones: [] }
  const differentStory = { ...story, problem: `Falta de equipos informáticos para educación técnica ${suffix}`,
    solution: `Instalar laboratorios escolares para aprender programación ${suffix}`,
    beneficiaries: `Estudiantes de secundaria interesados en tecnología digital ${suffix}`,
    expectedResults: `Veinte computadoras instaladas y docentes capacitados ${suffix}` }
  try {
    app = await NestFactory.create(AppModule, { logger: false }); configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
    // Cliente de ensayo aislado: no consume la cuota de la sesión del usuario ni la de otros archivos.
    app.use((request: object, _response: unknown, next: () => void) => { Object.defineProperty(request, 'ip', { value: `fixture-duplicate-${suffix}` }); next() })
    await app.listen(0, '127.0.0.1'); url = await app.getUrl()
    const a = await account('primero', 'CREATOR'), b = await account('segundo', 'CREATOR'), admin = await account('administrador', 'ADMIN')
    await approveDemoIdentity(call,a.cookie,admin.cookie);await approveDemoIdentity(call,b.cookie,admin.cookie)
    sql(`INSERT INTO category(id,slug,name) VALUES('${category}','dup-${suffix}','Categoría de ensayo');
      INSERT INTO expense_category(id,code,name) VALUES('${expense}','dup-${suffix}','Gasto de ensayo');`)
    const make = async (owner: typeof a, title: string, history = story, schedule = plan) => {
      const created = await call('campaigns/drafts', owner.cookie, { title: `${title} ${suffix}`, summary: `Ensayo de iniciativa comunitaria ${suffix}`, campaignType: 'DONATION' })
      assert.equal(created.status, 201)
      const { id } = await created.json() as { id: string }, path = `campaigns/drafts/${id}`
      for (const [section, body] of [
        ['general', { title: `${title} ${suffix}`, summary: `Ensayo de iniciativa comunitaria ${suffix}`, categoryId: category,
          location: { countryCode: 'BO', locality: `Samaipata ${suffix}`, addressLine: 'Parcela comunitaria Las Palmas', reference: '' } }],
        ['story', history], ['plan', schedule],
        ['budget', { items: [{ categoryId: expense, description: 'Compra de plantines nativos', quantity: 1000, unitPrice: 10, plannedAmount: 10000, notes: '' }], risks: [] }],
        ['funding', { goalAmount: 20000, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: null, endsAt: null }]
      ] as const) assert.equal((await call(`${path}/${section}`, owner.cookie, body, 'PUT')).status, 200, section)
      const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
      const uploaded = await call('files', owner.cookie, { visibility: 'PUBLIC', purpose: 'CAMPAIGN_PUBLIC_IMAGE', originalName: 'ensayo.png', mimeType: 'image/png', contentBase64: png })
      assert.equal(uploaded.status, 201)
      const file = await uploaded.json() as { id: string }; fileIds.push(file.id)
      assert.equal((await call(`${path}/cover`, owner.cookie, { fileId: file.id, altText: 'Portada de la iniciativa de ensayo' }, 'PATCH')).status, 200)
      return { id, path, adminPath: `admin/campaigns/${id}` }
    }
    const approve = { decision: 'APPROVED', comment: '', expectedRound: 1, observations: [] }
    const original = await make(a, 'Plantación de árboles')
    assert.equal((await call(`${original.path}/submission`, a.cookie, {})).status, 201)
    assert.equal((await call(`${original.adminPath}/decision`, admin.cookie, approve)).status, 200)
    assert.equal((await call(`${original.adminPath}/publish`, admin.cookie, { confirmed: true, expectedRound: 1 })).status, 200)
    const copy = await make(b, 'Plantación de árboles')
    const copyReport = await (await call(`${copy.path}/submission`, b.cookie)).json() as { missing: unknown[]; duplicateWarning: string | null }
    assert.deepEqual(copyReport.missing, [], 'No se exige identidad declarada ni se bloquea por contenido repetido.')
    assert.ok(copyReport.duplicateWarning)
    const privateReport = JSON.stringify(copyReport)
    assert.ok(!privateReport.includes(original.id) && !privateReport.includes('Plantación de árboles'), 'El aviso no revela referencias privadas.')
    assert.equal((await call(`${copy.path}/submission`, b.cookie, {})).status, 201)
    const copyDetail = await (await call(`${copy.adminPath}/detail`, admin.cookie)).json() as AdministrativeDetail
    assert.equal(copyDetail.duplication!.matches[0]!.kind, 'COPY', 'Coincidencia fuerte orientativa, no bloqueo.')
    assert.notEqual(copyDetail.slug, (await (await call(`${original.adminPath}/detail`, admin.cookie)).json() as AdministrativeDetail).slug)
    assert.equal((await call(`${copy.adminPath}/decision`, admin.cookie, approve)).status, 200)
    assert.equal((await call(`${copy.adminPath}/publish`, admin.cookie, { confirmed: true, expectedRound: 1 })).status, 200)
    assert.throws(() => sql(`UPDATE campaign SET slug='${copyDetail.slug}' WHERE id='${original.id}';`), /duplicate key/, 'Unicidad técnica final en PostgreSQL.')
    assert.equal((await call(`${original.adminPath}/detail`, b.cookie)).status, 403)
    const later = await make(b, 'Nueva etapa de restauración', story, { activities: plan.activities.map(activity => ({ ...activity, plannedStartOn: '2028-11-01', plannedEndOn: '2028-11-20' })), milestones: [] })
    const laterReport = await (await call(`${later.path}/submission`, b.cookie)).json() as { duplicateWarning: string; missing: unknown[] }
    assert.ok(laterReport.duplicateWarning); assert.deepEqual(laterReport.missing, [])
    assert.equal((await call(`${later.path}/submission`, b.cookie, {})).status, 201, 'Un periodo distinto no se bloquea automáticamente como copia.')
    const detail = await (await call(`${later.adminPath}/detail`, admin.cookie)).json() as AdministrativeDetail
    assert.equal(detail.duplication!.matches[0]!.kind, 'POSSIBLE')
    assert.ok(detail.duplication!.matches.some(match => match.id === original.id), 'La referencia original puede aparecer junto a otras semejanzas; no se presupone orden de UUID aleatorios.')
    assert.equal((await call(`${later.adminPath}/decision`, admin.cookie, approve)).status, 200, 'La semejanza no exige justificación obligatoria.')
    assert.equal((await call(`${later.adminPath}/publish`, admin.cookie, { confirmed: true, expectedRound: 1 })).status, 200)
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_id='${later.id}' AND description='Revisión de coincidencias de campaña' AND actor_user_id='${admin.id}';`), '2')
    const paraphrase = await make(b, 'Restauración comunitaria del bosque', { ...story, solution: story.solution + ' durante la primera temporada', beneficiaries: story.beneficiaries + ' beneficiadas directamente' })
    assert.equal((await call(`${paraphrase.path}/submission`, b.cookie, {})).status, 201)
    const old = await (await call(`${paraphrase.adminPath}/detail`, admin.cookie)).json() as AdministrativeDetail
    assert.ok(old.duplication!.matches.every(match => match.kind === 'POSSIBLE'))
    // Cambio solo en un fixture: la auditoría utiliza la evidencia actual, sin veto semántico.
    sql(`UPDATE campaign_story SET solution=solution || ' con manejo sostenible' WHERE campaign_id='${original.id}';`)
    assert.equal((await call(`${paraphrase.adminPath}/decision`, admin.cookie, { ...approve, duplicateReview: { token: old.duplication!.reviewToken!, reason: 'Comentario opcional sobre la revisión del contexto de la campaña.' } })).status, 200, 'Una evidencia orientativa antigua no se convierte en bloqueo; se audita la evidencia actual.')
    const unrelated = await make(a, 'Aula de informática', differentStory)
    const unrelatedReport = await (await call(`${unrelated.path}/submission`, a.cookie)).json() as { missing: unknown[]; duplicateWarning: string | null }
    assert.deepEqual(unrelatedReport.missing, []); assert.equal(unrelatedReport.duplicateWarning, null, 'Compartir localidad y monto no basta para rechazar o advertir.')
    // Dos campañas con contenido y nombre iguales pueden enviarse en paralelo, con IDs y slugs propios.
    const one = await make(a, 'Laboratorio comunitario', differentStory), two = await make(b, 'Laboratorio comunitario', differentStory)
    for (const item of [one, two]) assert.equal((await call(`${item.path}/story`, item.id === one.id ? a.cookie : b.cookie, differentStory, 'PUT')).status, 200)
    const concurrent = await Promise.all([call(`${one.path}/submission`, a.cookie, {}), call(`${two.path}/submission`, b.cookie, {})])
    assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 201])
    assert.equal(sql(`SELECT count(*) FROM campaign_review WHERE campaign_id IN ('${one.id}','${two.id}');`), '2')
    assert.equal(sql(`SELECT count(*) FROM campaign WHERE id IN ('${one.id}','${two.id}') AND status='IN_REVIEW';`), '2')
  } finally {
    await app?.close()
    removeDemoIdentityFixtures(sql,users)
    for (const id of users) sql(`DELETE FROM audit_log WHERE actor_user_id='${id}'; DELETE FROM status_history WHERE entity_type='CAMPAIGN' AND entity_id IN (SELECT id FROM campaign WHERE creator_user_id='${id}');
      DELETE FROM campaign WHERE creator_user_id='${id}'; DELETE FROM file_asset WHERE uploaded_by='${id}'; DELETE FROM app_user WHERE id='${id}';`)
    sql(`DELETE FROM category WHERE id='${category}'; DELETE FROM expense_category WHERE id='${expense}';`)
    for (const id of fileIds) await rm(join(root, 'CAMPAIGN_PUBLIC_IMAGE', `${id}.bin`), { force: true })
    if (originalRoot === undefined) delete process.env.FILE_STORAGE_DIR; else process.env.FILE_STORAGE_DIR = originalRoot
    if (originalPublication === undefined) delete process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED; else process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED = originalPublication
    if(originalDemo===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=originalDemo
  }
})
