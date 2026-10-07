import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { readArguments, localConfiguration, verifyContainer, grantExistingAdmin } from './grant-local-admin.mjs'

const admin = { POSTGRES_PORT: '15433', POSTGRES_PASSWORD: 'x'.repeat(64) }
const app = { NODE_ENV: 'development', DATABASE_ENABLED: 'true', DB_HOST: '127.0.0.1',
  DB_NAME: 'brotar_db', DB_USER: 'brotar_app', DB_PORT: '15433', DB_SSL: 'false', DB_PASSWORD: 'a'.repeat(64) }

test('ADMIN local exige correo válido y consentimiento explícito, sin argumentos de contraseña', () => {
  assert.equal(readArguments(['--email= Persona@example.invalid ', '--confirm-local-admin']), 'persona@example.invalid')
  for (const args of [[], ['--email=a@example.invalid'], ['--email=mal', '--confirm-local-admin'],
    ['--email=a@example.invalid', '--confirm-local-admin', '--password=NO']]) assert.throws(() => readArguments(args))
})
test('ADMIN local rechaza producción, servidor remoto, puerto incoherente y config desactivada', () => {
  assert.deepEqual(localConfiguration(admin, app), { port: 15433, project: 'brotar-provisional-v2' })
  for (const change of [{ NODE_ENV: 'production' }, { DATABASE_ENABLED: 'false' }, { DB_HOST: 'example.invalid' },
    { DB_PORT: '5432' }, { DB_USER: 'postgres' }, { DB_SSL: 'true' }, { DB_PASSWORD: '' }]) {
    assert.throws(() => localConfiguration(admin, { ...app, ...change }))
  }
  assert.throws(() => localConfiguration({ ...admin, POSTGRES_PASSWORD: '' }, app))
})
test('ADMIN local verifica proyecto Docker y publicación únicamente en loopback', () => {
  const metadata = { State: { Running: true }, Config: { Labels: { 'com.docker.compose.project': 'brotar-provisional-v2' } },
    NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '15433' }] } } }
  const config = localConfiguration(admin, app)
  assert.doesNotThrow(() => verifyContainer(metadata, config))
  assert.throws(() => verifyContainer(metadata, { ...config, project: 'otra-copia' }))
  assert.throws(() => verifyContainer(metadata, { ...config, port: 15434 }))
  metadata.NetworkSettings.Ports['5432/tcp'][0].HostIp = '0.0.0.0'
  assert.throws(() => verifyContainer(metadata, config))
})

function fixture({ status = 'PENDING_VERIFICATION', missing = false, locked = false, role = true, existing, failedInsert = false } = {}) {
  const queries = []
  return { queries, async query(sql, params) {
    queries.push({ sql, params })
    if (sql.includes('FROM public.app_user')) return { rowCount: missing ? 0 : 1,
      rows: missing ? [] : [{ id: 'user', status, deleted_at: null, locked }] }
    if (sql.includes('FROM public.role')) return { rowCount: role ? 1 : 0, rows: role ? [{ id: 'role' }] : [] }
    if (sql.includes('FROM public.user_role')) return { rowCount: existing ? 1 : 0, rows: existing ? [existing] : [] }
    if (sql.startsWith('INSERT') && failedInsert) throw new Error('simulated')
    return { rowCount: 1, rows: [] }
  } }
}
test('ADMIN local añade solo el rol y no modifica contraseña, verificación ni estado', async () => {
  const client = fixture()
  assert.equal(await grantExistingAdmin(client, 'persona@example.invalid'), 'granted')
  assert.equal(client.queries.filter(q => q.sql.startsWith('INSERT')).length, 1)
  assert.equal(client.queries.at(-1).sql, 'COMMIT')
  assert.ok(client.queries.every(q => !/UPDATE|password|email_verified/.test(q.sql.replaceAll('FOR UPDATE', ''))))
  assert.deepEqual(client.queries.find(q => q.sql.startsWith('INSERT')).params, ['user', 'role'])
})
test('ADMIN local es idempotente sin duplicar concesiones', async () => {
  const client = fixture({ existing: { id: 'assignment', active: true } })
  assert.equal(await grantExistingAdmin(client, 'persona@example.invalid'), 'existing')
  assert.ok(client.queries.every(q => !q.sql.startsWith('INSERT')))
})
test('ADMIN local no habilita cuentas ausentes, bloqueadas, suspendidas ni catálogo inexistente', async () => {
  for (const options of [{ missing: true }, { locked: true }, { status: 'SUSPENDED' }, { status: 'CLOSED' }, { role: false }]) {
    const client = fixture(options)
    await assert.rejects(grantExistingAdmin(client, 'persona@example.invalid'))
    assert.equal(client.queries.at(-1).sql, 'ROLLBACK')
    assert.ok(client.queries.every(q => !q.sql.startsWith('INSERT')))
  }
})
test('ADMIN local conserva concesiones vencidas/futuras en vez de reactivarlas', async () => {
  const client = fixture({ existing: { id: 'assignment', active: false } })
  await assert.rejects(grantExistingAdmin(client, 'persona@example.invalid'))
  assert.equal(client.queries.at(-1).sql, 'ROLLBACK')
})
test('ADMIN local revierte el fallo de escritura', async () => {
  const client = fixture({ failedInsert: true })
  await assert.rejects(grantExistingAdmin(client, 'persona@example.invalid'))
  assert.equal(client.queries.at(-1).sql, 'ROLLBACK')
})
