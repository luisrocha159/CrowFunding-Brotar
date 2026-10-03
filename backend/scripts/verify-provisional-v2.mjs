import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import pg from 'pg'

const baseline = JSON.parse(readFileSync(new URL('../../infra/postgres-v2/baseline.json', import.meta.url), 'utf8'))
const env = parseEnv(readFileSync(new URL('../../infra/postgres-v2/.env.backend', import.meta.url), 'utf8'))
const admin = parseEnv(readFileSync(new URL('../../infra/postgres-v2/.env', import.meta.url), 'utf8'))
assert.equal(env.DB_HOST, '127.0.0.1')
assert.equal(env.DB_PORT, admin.POSTGRES_PORT)
assert.equal(env.DB_NAME, 'brotar_db')
const client = new pg.Client({ host: env.DB_HOST, port: Number(env.DB_PORT), database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD, connectionTimeoutMillis: 5000 })
try {
  await client.connect()
  const result = await client.query(readFileSync(new URL('../../infra/postgres/verify.sql', import.meta.url), 'utf8'))
  const inventory = result.rows[0].json_build_object
  for (const [name, expected] of Object.entries(baseline.inventory)) assert.equal(inventory[name], expected, name)
  const area = await client.query("SELECT data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profile' AND column_name='administrative_area_id'")
  assert.deepEqual(area.rows, [{ data_type: 'uuid', is_nullable: 'YES' }])
  const defaults = await client.query("SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='status'")
  assert.match(defaults.rows[0].column_default, /PENDING_VERIFICATION/)
  const privileges = await client.query("SELECT rolsuper, rolcreatedb, rolcreaterole, has_schema_privilege(current_user, 'public', 'CREATE') AS ddl FROM pg_roles WHERE rolname=current_user")
  assert.deepEqual(privileges.rows[0], { rolsuper: false, rolcreatedb: false, rolcreaterole: false, ddl: false })
  console.log(JSON.stringify(inventory))
  console.log('V2: inventario, mapeo nuevo, estado pendiente y privilegios limitados verificados.')
} finally { await client.end() }
