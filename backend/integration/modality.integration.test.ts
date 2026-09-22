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

interface Modality {
  campaignType: string; fundingModel: string | null; rewardsApply: boolean; rewardCount: number
}

test('modalidad real: se conserva, omite recompensas en donación y no descarta datos', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.equal(config.host, '127.0.0.1'); assert.notEqual(process.env.NODE_ENV, 'production')

  const container = 'brotar-provisional-v2-postgres-1'
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
  const register = async (label: string) => {
    const email = `mod-${label}-${suffix}@example.invalid`
    const created = await call('auth/register', '', 'POST', { firstName: 'Prueba', lastName: 'Modalidad', email, password, demoConsent: true })
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

    const created = await call('campaigns/drafts', creator.cookie, 'POST', {
      title: `Modalidad ${suffix}`, summary: '', campaignType: 'REWARD'
    })
    assert.equal(created.status, 201)
    const draft = await created.json() as { id: string }

    // CA 2: en recompensa la etapa aplica; todavía no hay recompensas cargadas.
    const initial = await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie)
    assert.equal(initial.status, 200)
    assert.deepEqual(await initial.json(), { campaignType: 'REWARD', fundingModel: null, rewardsApply: true, rewardCount: 0 })

    // Sin recompensas cargadas el cambio a donación no necesita confirmarse.
    const toDonation = await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie, 'PUT', { campaignType: 'DONATION' })
    assert.equal(toDonation.status, 200)
    assert.equal((await toDonation.json() as Modality).rewardsApply, false, 'La donación omite las recompensas.')

    // Volver a recompensa y cargar una recompensa real.
    assert.equal((await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie, 'PUT', {
      campaignType: 'REWARD', fundingModel: 'ALL_OR_NOTHING'
    })).status, 200)
    // reward tiene una clave foránea compuesta (campaign_id, currency_code): la recompensa
    // debe usar la moneda de su campaña, así que el borrador la fija primero.
    admin(`UPDATE campaign SET currency_code=(SELECT code FROM currency LIMIT 1) WHERE id='${draft.id}';
      INSERT INTO reward(campaign_id, title, description, min_amount, currency_code, display_order)
      SELECT '${draft.id}','Recompensa ${suffix}','Descripción', 50, currency_code, 0
        FROM campaign WHERE id='${draft.id}';`)

    const withRewards = await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie)
    assert.deepEqual(await withRewards.json(), {
      campaignType: 'REWARD', fundingModel: 'ALL_OR_NOTHING', rewardsApply: true, rewardCount: 1
    })

    // CA 3: ahora el cambio a donación se rechaza hasta reconocerlo.
    const blocked = await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie, 'PUT', { campaignType: 'DONATION' })
    assert.equal(blocked.status, 409)
    // El contrato de errores del proyecto solo devuelve statusCode y message.
    const detail = await blocked.json() as { message: string }
    assert.match(detail.message, /1 recompensa/)
    assert.match(detail.message, /No se borran/)
    const unchanged: { campaign_type: string }[] = await source.query('SELECT campaign_type FROM campaign WHERE id = $1', [draft.id])
    assert.equal(unchanged[0]!.campaign_type, 'REWARD', 'El rechazo no cambió la modalidad.')

    // Al reconocerlo el cambio se aplica y la recompensa SIGUE existiendo: no se descarta.
    const confirmed = await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie, 'PUT', {
      campaignType: 'DONATION', acknowledgeRewards: true
    })
    assert.equal(confirmed.status, 200)
    const summary = await confirmed.json() as Modality
    assert.equal(summary.campaignType, 'DONATION')
    assert.equal(summary.rewardsApply, false)
    assert.equal(summary.rewardCount, 1, 'La recompensa se conserva tras el cambio.')
    const kept: { n: string }[] = await source.query(
      'SELECT count(*)::text AS n FROM reward WHERE campaign_id = $1 AND is_active = true', [draft.id])
    assert.equal(kept[0]!.n, '1', 'Ni se borró ni se desactivó.')

    // Volver a recompensa la recupera tal cual: el cambio era reversible.
    assert.equal((await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie, 'PUT', { campaignType: 'REWARD' })).status, 200)
    assert.equal((await (await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie)).json() as Modality).rewardCount, 1)

    // Valores inventados y propiedad ajena se rechazan.
    assert.equal((await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie, 'PUT', { campaignType: 'INVENTADA' })).status, 400)
    assert.equal((await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie, 'PUT', {
      campaignType: 'REWARD', fundingModel: 'INVENTADO'
    })).status, 400)
    assert.equal((await call(`campaigns/drafts/${draft.id}/modality`, outsider.cookie)).status, 404)
    assert.equal((await call(`campaigns/drafts/${draft.id}/modality`, outsider.cookie, 'PUT', { campaignType: 'DONATION' })).status, 404)

    // La modalidad se conserva durante el asistente: guardar otro paso no la altera.
    assert.equal((await call(`campaigns/drafts/${draft.id}`, creator.cookie, 'PUT', {
      title: `Modalidad ${suffix}`, summary: 'Avanza', campaignType: 'REWARD', builderStep: 1
    })).status, 200)
    assert.equal((await (await call(`campaigns/drafts/${draft.id}/modality`, creator.cookie)).json() as Modality).campaignType, 'REWARD')
  } finally {
    await app.close()
    try {
      for (const id of ids) {
        assert.match(id, /^[a-f0-9-]{36}$/)
        admin(`DELETE FROM reward WHERE campaign_id IN (SELECT id FROM campaign WHERE creator_user_id='${id}');
          DELETE FROM campaign WHERE creator_user_id='${id}';`)
        if (source.isInitialized) await source.getRepository(UserSchema).delete({ id })
      }
    } finally { if (source.isInitialized) await source.destroy() }
  }
})
