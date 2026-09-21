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

test('catálogos reales: edición autorizada, referencias protegidas y parámetros no acordados', { timeout: 90000 }, async () => {
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
  const campaignId = randomUUID()
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
    const email = `cat-${label}-${suffix}@example.invalid`
    const created = await call('auth/register', '', 'POST', { firstName: 'Prueba', lastName: 'Catálogo', email, password, demoConsent: true })
    assert.equal(created.status, 201)
    const { id } = await created.json() as { id: string }
    ids.push(id)
    const login = await call('auth/login', '', 'POST', { email, password })
    assert.equal(login.status, 200)
    return { id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }

  try {
    await source.initialize()
    const plain = await register('simple')
    const manager = await register('admin')
    admin(`INSERT INTO user_role(user_id, role_id) SELECT '${manager.id}', id FROM role WHERE code='ADMIN';`)

    // CA 1: la edición exige ADMIN, comprobado en la API y no ocultando el formulario.
    const draft = { slug: `cat-${suffix}`, name: `Categoría ${suffix}`, description: 'Prueba', displayOrder: 5 }
    assert.equal((await call('catalogs/admin/categories', plain.cookie, 'POST', draft)).status, 403)
    assert.equal((await call('catalogs/admin/categories', '', 'POST', draft)).status, 401)

    const created = await call('catalogs/admin/categories', manager.cookie, 'POST', draft)
    assert.equal(created.status, 201)
    const category = await created.json() as { id: string; slug: string; isActive: boolean; parentId: string | null }
    assert.equal(category.slug, `cat-${suffix}`)
    assert.equal(category.isActive, true)

    // Identificador repetido: conflicto, no una segunda categoría.
    assert.equal((await call('catalogs/admin/categories', manager.cookie, 'POST', draft)).status, 409)
    // Datos inválidos rechazados antes de tocar la base.
    assert.equal((await call('catalogs/admin/categories', manager.cookie, 'POST', { ...draft, slug: 'MAYÚSCULAS' })).status, 400)
    assert.equal((await call('catalogs/admin/categories', manager.cookie, 'POST', { ...draft, displayOrder: -1 })).status, 400)
    // Padre inexistente rechazado: no se cuelga el catálogo de una rama inválida.
    assert.equal((await call('catalogs/admin/categories', manager.cookie, 'POST',
      { ...draft, slug: `hija-${suffix}`, parentId: randomUUID() })).status, 400)

    // Cualquier cuenta registrada lee el catálogo activo; el asistente de campaña lo consumirá.
    const listed = await call('catalogs/categories', plain.cookie)
    assert.equal(listed.status, 200)
    assert.ok((await listed.json() as { id: string }[]).some((row) => row.id === category.id))

    // CA 1: una subcategoría activa protege a su madre frente a la desactivación.
    const child = await call('catalogs/admin/categories', manager.cookie, 'POST',
      { slug: `hija-${suffix}`, name: `Hija ${suffix}`, description: '', displayOrder: 1, parentId: category.id })
    assert.equal(child.status, 201)
    const childCategory = await child.json() as { id: string }
    assert.equal((await call(`catalogs/admin/categories/${category.id}/state`, manager.cookie, 'PUT', { isActive: false })).status, 409)

    assert.equal((await call(`catalogs/admin/categories/${childCategory.id}/state`, manager.cookie, 'PUT', { isActive: false })).status, 200)

    // CA 1: una campaña que la referencia también la protege.
    admin(`INSERT INTO campaign(id, slug, title, campaign_type, creator_user_id, category_id)
      VALUES('${campaignId}','camp-${suffix}','Campaña ${suffix}','DONATION','${manager.id}','${category.id}');`)
    const blocked = await call(`catalogs/admin/categories/${category.id}/state`, manager.cookie, 'PUT', { isActive: false })
    assert.equal(blocked.status, 409, 'Una categoría en uso por campañas no se desactiva.')
    const still: { is_active: boolean }[] = await source.query('SELECT is_active FROM category WHERE id = $1', [category.id])
    assert.equal(still[0]!.is_active, true, 'El rechazo no dejó la categoría a medias.')

    admin(`DELETE FROM campaign WHERE id='${campaignId}';`)
    assert.equal((await call(`catalogs/admin/categories/${category.id}/state`, manager.cookie, 'PUT', { isActive: false })).status, 200)
    // Desactivada deja de aparecer en el catálogo público, sin borrarse.
    assert.equal((await (await call('catalogs/categories', plain.cookie)).json() as { id: string }[])
      .some((row) => row.id === category.id), false)

    // CA 2: ningún parámetro está acordado todavía; D02 y D10 siguen abiertas.
    const rejected = await call(`catalogs/admin/settings/campaign.max_goal`, manager.cookie, 'PUT', { value: 1000 })
    assert.equal(rejected.status, 400)
    assert.match((await rejected.json() as { message: string }).message, /D02 y D10/)
    const settings: { n: string }[] = await source.query('SELECT count(*)::text AS n FROM system_setting')
    assert.equal(settings[0]!.n, '0', 'No se escribió ningún parámetro de negocio.')

    // CA 3: el auditor no edita el catálogo aunque acumule ADMIN.
    admin(`INSERT INTO user_role(user_id, role_id) SELECT '${manager.id}', id FROM role WHERE code='AUDITOR';`)
    assert.equal((await call('catalogs/admin/categories', manager.cookie, 'POST',
      { ...draft, slug: `auditor-${suffix}` })).status, 403)
    assert.equal((await call('catalogs/admin/categories', manager.cookie)).status, 200, 'El auditor conserva la lectura.')
  } finally {
    await app.close()
    try {
      admin(`DELETE FROM campaign WHERE id='${campaignId}';
        DELETE FROM category WHERE slug LIKE '%-${suffix}' OR slug='cat-${suffix}';`)
      for (const id of ids) {
        assert.match(id, /^[a-f0-9-]{36}$/)
        if (source.isInitialized) await source.getRepository(UserSchema).delete({ id })
      }
    } finally { if (source.isInitialized) await source.destroy() }
  }
})
