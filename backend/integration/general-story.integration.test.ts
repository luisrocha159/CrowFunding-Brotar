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
import { UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { readTestDatabaseTarget } from './database-target'

interface Review {
  status: string
  general: { title: string; summary: string; categoryId: string | null; location: { countryCode: string | null; locality: string } }
  story: { problem: string; solution: string; beneficiaries: string; expectedResults: string }
  indicators: { name: string; unit: string; targetValue: number | null; achievedValue: number | null }[]
  raisedAmount: number | null
  goalAmount: number | null
  verified: boolean
}

test('información, historia e impacto reales: límites, errores por campo y revisión sin cifras inventadas', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.equal(config.host, '127.0.0.1'); assert.notEqual(process.env.NODE_ENV, 'production')

  const { container } = readTestDatabaseTarget(config)
  const admin = (sql: string) => execFileSync('docker',
    ['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'],
    { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 })

  const source = createDataSource(config)
  const suffix = randomUUID().slice(0, 8)
  const password = randomBytes(24).toString('hex')
  const ids: string[] = []
  const categoryId = randomUUID()
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const call = (path: string, cookie: string, method = 'GET', body?: unknown) => fetch(`${base}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Cookie: cookie, Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const register = async (label: string) => {
    const email = `gen-${label}-${suffix}@example.invalid`
    const created = await call('auth/register', '', 'POST', { firstName: 'Prueba', lastName: 'General', email, password, demoConsent: true })
    assert.equal(created.status, 201)
    const { id } = await created.json() as { id: string }
    ids.push(id)
    const login = await call('auth/login', '', 'POST', { email, password })
    assert.equal(login.status, 200)
    return { id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }

  try {
    await source.initialize()
    const creator = await register('creador')
    const outsider = await register('ajeno')
    admin(`INSERT INTO category(id, slug, name) VALUES('${categoryId}','gen-${suffix}','Categoría ${suffix}');`)

    const created = await call('campaigns/drafts', creator.cookie, 'POST', {
      title: `General ${suffix}`, summary: '', campaignType: 'DONATION'
    })
    assert.equal(created.status, 201)
    const draft = await created.json() as { id: string }

    // CA 1: la API publica los límites para que el asistente los muestre.
    const limits = await (await call(`campaigns/drafts/${draft.id}/general`, creator.cookie)).json() as { limits: Record<string, number> }
    assert.equal(limits.limits.title, 200)
    assert.equal(limits.limits.summary, 500)

    // CA 2: los campos requeridos fallan con un error por campo, no con un aviso genérico.
    const invalid = await call(`campaigns/drafts/${draft.id}/general`, creator.cookie, 'PUT', {
      title: '', summary: '', location: { locality: '', addressLine: '', reference: '' }
    })
    assert.equal(invalid.status, 400)
    const messages = (await invalid.json() as { message: string[] }).message
    assert.ok(Array.isArray(messages))
    for (const field of ['title', 'summary', 'categoryId', 'countryCode']) {
      assert.ok(messages.some((text) => text.startsWith(`${field}:`)), `Falta el error de ${field}: ${messages.join(' | ')}`)
    }

    // Un país o una categoría que no existen se rechazan contra el catálogo real.
    const valid = {
      title: `General ${suffix}`, summary: 'Resumen de la campaña', categoryId,
      location: { countryCode: 'BO', locality: 'La Paz', addressLine: 'Calle 1', reference: 'Frente a la plaza' }
    }
    assert.equal((await call(`campaigns/drafts/${draft.id}/general`, creator.cookie, 'PUT', {
      ...valid, location: { ...valid.location, countryCode: 'ZZ' }
    })).status, 400)
    assert.equal((await call(`campaigns/drafts/${draft.id}/general`, creator.cookie, 'PUT', {
      ...valid, categoryId: randomUUID()
    })).status, 400)

    const saved = await call(`campaigns/drafts/${draft.id}/general`, creator.cookie, 'PUT', valid)
    assert.equal(saved.status, 200)
    const general = await saved.json() as { location: { countryCode: string; locality: string } }
    assert.equal(general.location.countryCode, 'BO')
    assert.equal(general.location.locality, 'La Paz')

    // Errores ordinarios de formulario no llegan a persistencia ni producen un 500.
    for (const location of [null, undefined, [], 'BO']) {
      assert.equal((await call(`campaigns/drafts/${draft.id}/general`, creator.cookie, 'PUT', { ...valid, location })).status, 400)
    }

    // BG-19: historia e indicadores con unidad y meta.
    const storyBody = {
      problem: 'Problema', solution: 'Solución', beneficiaries: '120 familias',
      expectedResults: 'Resultados esperados',
      indicators: [{ name: 'Familias atendidas', description: '', unit: 'familias', baselineValue: 0, targetValue: 120 }]
    }
    assert.equal((await call(`campaigns/drafts/${draft.id}/story`, creator.cookie, 'PUT', storyBody)).status, 200)
    for (const targetValue of [1e12, 1.234]) {
      assert.equal((await call(`campaigns/drafts/${draft.id}/story`, creator.cookie, 'PUT', {
        ...storyBody, indicators: [{ ...storyBody.indicators[0], targetValue }]
      })).status, 400)
    }

    // Una meta sin unidad se rechaza señalando el indicador concreto.
    const badIndicator = await call(`campaigns/drafts/${draft.id}/story`, creator.cookie, 'PUT', {
      ...storyBody, indicators: [storyBody.indicators[0], { name: 'Sin unidad', description: '', unit: '', targetValue: 10 }]
    })
    assert.equal(badIndicator.status, 400)
    assert.ok((await badIndicator.json() as { message: string[] }).message.some((text) => text.startsWith('indicators.1.unit:')))

    // CA 2 de BG-19: achieved_value no se puede fijar desde el asistente.
    assert.equal((await call(`campaigns/drafts/${draft.id}/story`, creator.cookie, 'PUT', {
      ...storyBody,
      indicators: [{ ...storyBody.indicators[0], achievedValue: 999 }]
    })).status, 400, 'Un campo no declarado se rechaza; no se acepta un resultado ejecutado.')
    const stored: { achieved_value: string | null }[] = await source.query(
      'SELECT achieved_value FROM campaign_impact_indicator WHERE campaign_id = $1', [draft.id])
    assert.equal(stored[0]!.achieved_value, null, 'El indicador guardado no tiene resultado conseguido.')

    // CA 3: la revisión reutiliza lo guardado y no inventa cifras ni verificaciones.
    const review = await (await call(`campaigns/drafts/${draft.id}/review`, creator.cookie)).json() as Review
    assert.equal(review.status, 'DRAFT')
    assert.equal(review.general.title, `General ${suffix}`)
    assert.equal(review.general.location.locality, 'La Paz')
    assert.equal(review.story.beneficiaries, '120 familias')
    assert.equal(review.indicators[0]!.targetValue, 120)
    assert.equal(review.indicators[0]!.achievedValue, null)
    assert.equal(review.raisedAmount, null, 'Un borrador no ha recaudado nada.')
    assert.equal(review.goalAmount, null)
    assert.equal(review.verified, false, 'No hay verificación en un borrador.')

    // Propiedad: nada de esto es accesible para otra cuenta.
    for (const path of ['general', 'story', 'review']) {
      assert.equal((await call(`campaigns/drafts/${draft.id}/${path}`, outsider.cookie)).status, 404)
    }
    assert.equal((await call(`campaigns/drafts/${draft.id}/general`, outsider.cookie, 'PUT', valid)).status, 404)

    // Dejar de ser borrador cierra la edición pero no impide consultar.
    admin(`UPDATE campaign SET status='IN_REVIEW', goal_amount=1000,
      currency_code=(SELECT code FROM currency LIMIT 1) WHERE id='${draft.id}';`)
    assert.equal((await call(`campaigns/drafts/${draft.id}/general`, creator.cookie, 'PUT', valid)).status, 409)
    assert.equal((await call(`campaigns/drafts/${draft.id}/review`, creator.cookie)).status, 200)
  } finally {
    await app.close()
    try {
      for (const id of ids) {
        assert.match(id, /^[a-f0-9-]{36}$/)
        admin(`DELETE FROM campaign WHERE creator_user_id='${id}';`)
        if (source.isInitialized) await source.getRepository(UserSchema).delete({ id })
      }
      admin(`DELETE FROM category WHERE id='${categoryId}';`)
    } finally { if (source.isInitialized) await source.destroy() }
  }
})
