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

interface DraftBody {
  id: string; title: string; summary: string | null; campaignType: string
  categoryId: string | null; organizationId: string | null
  status: string; builderStep: number; totalSteps: number
}

test('borrador real: propiedad, guardado, recuperación tras volver a entrar y navegación', { timeout: 90000 }, async () => {
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
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const call = (path: string, cookie: string, method = 'GET', body?: unknown) => fetch(`${base}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Cookie: cookie, Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const login = async (email: string) => {
    const response = await call('auth/login', '', 'POST', { email, password })
    assert.equal(response.status, 200)
    return response.headers.get('set-cookie')!.split(';')[0]!
  }
  const register = async (label: string) => {
    const email = `draft-${label}-${suffix}@example.invalid`
    const created = await call('auth/register', '', 'POST', { firstName: 'Prueba', lastName: 'Borrador', email, password, demoConsent: true })
    assert.equal(created.status, 201)
    const { id } = await created.json() as { id: string }
    ids.push(id)
    return { id, email, cookie: await login(email) }
  }

  try {
    await source.initialize()
    const creator = await register('creador')
    const outsider = await register('ajeno')

    assert.equal((await call('campaigns/drafts', '')).status, 401)

    // Crear el borrador. El asistente arranca en la posición 0 de ocho etapas.
    const created = await call('campaigns/drafts', creator.cookie, 'POST', {
      title: `Campaña ${suffix}`, summary: 'Resumen inicial', campaignType: 'DONATION'
    })
    assert.equal(created.status, 201)
    const draft = await created.json() as DraftBody
    assert.equal(draft.status, 'DRAFT')
    assert.equal(draft.builderStep, 0)
    assert.equal(draft.totalSteps, 8)
    assert.equal(draft.campaignType, 'DONATION')

    // Datos inválidos rechazados sin escribir.
    assert.equal((await call('campaigns/drafts', creator.cookie, 'POST', { title: '', summary: '', campaignType: 'DONATION' })).status, 400)
    assert.equal((await call('campaigns/drafts', creator.cookie, 'POST', { title: 'x', summary: '', campaignType: 'INVENTADA' })).status, 400)

    // CA 3: se avanza de uno en uno; saltar etapas se rechaza y no mueve la posición.
    const skipped = await call(`campaigns/drafts/${draft.id}`, creator.cookie, 'PUT', {
      title: draft.title, summary: 'Resumen inicial', campaignType: 'DONATION', builderStep: 4
    })
    assert.equal(skipped.status, 409)
    assert.equal((await (await call(`campaigns/drafts/${draft.id}`, creator.cookie)).json() as DraftBody).builderStep, 0)

    let step = 0
    for (const title of [`Campaña ${suffix} v2`, `Campaña ${suffix} v3`]) {
      step += 1
      const saved = await call(`campaigns/drafts/${draft.id}`, creator.cookie, 'PUT', {
        title, summary: `Resumen ${step}`, campaignType: 'DONATION', builderStep: step
      })
      assert.equal(saved.status, 200)
      const body = await saved.json() as DraftBody
      assert.equal(body.builderStep, step)
      assert.equal(body.title, title)
    }

    // CA 3: retroceder es libre y no descarta lo guardado.
    const back = await call(`campaigns/drafts/${draft.id}`, creator.cookie, 'PUT', {
      title: `Campaña ${suffix} v3`, summary: 'Resumen 2', campaignType: 'DONATION', builderStep: 0
    })
    assert.equal(back.status, 200)
    assert.equal((await back.json() as DraftBody).title, `Campaña ${suffix} v3`)

    // CA 2: el borrador se recupera igual tras cerrar sesión y volver a entrar.
    assert.equal((await call('auth/logout', creator.cookie, 'POST', {})).status, 204)
    const returned = await login(creator.email)
    const recovered = await call(`campaigns/drafts/${draft.id}`, returned)
    assert.equal(recovered.status, 200)
    const after = await recovered.json() as DraftBody
    assert.equal(after.id, draft.id)
    assert.equal(after.title, `Campaña ${suffix} v3`)
    assert.equal(after.summary, 'Resumen 2')
    assert.equal(after.builderStep, 0, 'La posición del asistente sobrevive a la sesión.')

    // La lista propia lo incluye; la de otra cuenta no.
    assert.ok((await (await call('campaigns/drafts', returned)).json() as DraftBody[]).some((row) => row.id === draft.id))
    assert.deepEqual(await (await call('campaigns/drafts', outsider.cookie)).json(), [])

    // Propiedad: un borrador ajeno no se lee ni se guarda, y no se distingue de inexistente.
    assert.equal((await call(`campaigns/drafts/${draft.id}`, outsider.cookie)).status, 404)
    assert.equal((await call(`campaigns/drafts/${draft.id}`, outsider.cookie, 'PUT', {
      title: 'Secuestrada', summary: '', campaignType: 'DONATION', builderStep: 1
    })).status, 404)
    const untouched: { title: string }[] = await source.query('SELECT title FROM campaign WHERE id = $1', [draft.id])
    assert.equal(untouched[0]!.title, `Campaña ${suffix} v3`, 'El intento ajeno no modificó nada.')

    // No se adopta una organización que no se gestiona.
    const types = await (await call('organizations/types', returned)).json() as { id: string }[]
    const foreignOrganization = await call('organizations', outsider.cookie, 'POST', {
      legalName: `Ajena ${suffix}`, tradeName: 'Ajena', organizationTypeId: types[0]!.id,
      contactEmail: 'ajena@example.invalid', contactPhone: ''
    })
    assert.equal(foreignOrganization.status, 201)
    const organization = await foreignOrganization.json() as { id: string }
    assert.equal((await call(`campaigns/drafts/${draft.id}`, returned, 'PUT', {
      title: `Campaña ${suffix} v3`, summary: 'Resumen 2', campaignType: 'DONATION',
      builderStep: 0, organizationId: organization.id
    })).status, 403)

    // Una categoría retirada no se acepta, aunque exista.
    const retired = randomUUID()
    admin(`INSERT INTO category(id, slug, name, is_active) VALUES('${retired}','ret-${suffix}','Retirada ${suffix}', false);`)
    assert.equal((await call(`campaigns/drafts/${draft.id}`, returned, 'PUT', {
      title: `Campaña ${suffix} v3`, summary: 'Resumen 2', campaignType: 'DONATION',
      builderStep: 0, categoryId: retired
    })).status, 400)

    // Dejar de ser borrador cierra la edición del asistente sin borrar nada.
    // campaign_check1 exige importe y moneda fuera de DRAFT; el fixture los aporta.
    admin(`UPDATE campaign SET status='IN_REVIEW', goal_amount=1000,
      currency_code=(SELECT code FROM currency LIMIT 1) WHERE id='${draft.id}';`)
    assert.equal((await call(`campaigns/drafts/${draft.id}`, returned, 'PUT', {
      title: 'Tras revisión', summary: '', campaignType: 'DONATION', builderStep: 1
    })).status, 409)
    assert.equal((await call(`campaigns/drafts/${draft.id}`, returned)).status, 200, 'Se sigue pudiendo consultar.')
  } finally {
    await app.close()
    try {
      for (const id of ids) {
        assert.match(id, /^[a-f0-9-]{36}$/)
        admin(`DELETE FROM campaign WHERE creator_user_id='${id}';
          DELETE FROM organization WHERE created_by='${id}';`)
        if (source.isInitialized) await source.getRepository(UserSchema).delete({ id })
      }
      admin(`DELETE FROM category WHERE slug='ret-${suffix}';`)
    } finally { if (source.isInitialized) await source.destroy() }
  }
})
