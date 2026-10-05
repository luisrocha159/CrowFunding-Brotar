import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { DataSource } from 'typeorm'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readMigrationConfig } from '../src/shared/infrastructure/database/migration.config'
import {
  createMigrationDataSource, MIGRATIONS, MIGRATIONS_SCHEMA, MIGRATIONS_TABLE
} from '../src/shared/infrastructure/database/migration-data-source'

// Base desechable con nombre propio: nunca se toca brotar_db ni la copia del ensayo.
const GUARD_DATABASE = `brotar_db_drill_guard_${randomBytes(6).toString('hex')}`
const REJECTED_DATABASE = `brotar_db_drill_rejected_${randomBytes(6).toString('hex')}`

function adminConfig(): ReturnType<typeof readMigrationConfig> {
  const local = parseEnv(readFileSync(resolve(process.cwd(), '../infra/postgres-v2/.env'), 'utf8'))
  return readMigrationConfig({
    MIGRATION_DB_HOST: '127.0.0.1',
    MIGRATION_DB_PORT: local.POSTGRES_PORT,
    MIGRATION_DB_NAME: 'brotar_db',
    MIGRATION_DB_USER: 'postgres',
    MIGRATION_DB_PASSWORD: local.POSTGRES_PASSWORD
  })
}

// DataSource directo: el proyecto no incluye @types/pg y las demás integraciones usan TypeORM.
async function withAdmin<T>(database: string, run: (source: DataSource) => Promise<T>): Promise<T> {
  const config = adminConfig()
  const source = new DataSource({
    type: 'postgres', host: config.host, port: config.port, database,
    username: config.username, password: config.password, ssl: false,
    entities: [], synchronize: false, dropSchema: false, migrationsRun: false,
    logging: false, connectTimeoutMS: 5000, extra: { max: 1 }
  })
  await source.initialize()
  try { return await run(source) } finally { await source.destroy() }
}

test('migraciones: control fuera de public, línea base aplicada y sin pendientes', { timeout: 60000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(config.host), 'Solo base LOCAL de desarrollo.')

  await withAdmin('brotar_db', async (source) => {
    // La tabla de control vive aparte: dentro de public alteraría el inventario de la línea base.
    const placement: { schema: string }[] = await source.query(
      `SELECT n.nspname AS schema FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = $1 AND c.relkind = 'r'`, [MIGRATIONS_TABLE])
    assert.deepEqual(placement, [{ schema: MIGRATIONS_SCHEMA }])

    const official: { n: number }[] = await source.query(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'`)
    assert.equal(official[0]?.n, 59, 'Migrar no debe alterar el inventario oficial.')

    const applied: { name: string }[] = await source.query(
      `SELECT name FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY timestamp`)
    assert.deepEqual(applied.map((row) => row.name), MIGRATIONS.map((migration) => migration.name))
  })
})

test('migraciones: una base incompleta se rechaza en vez de marcarse migrada', { timeout: 90000 }, async (context) => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(config.host), 'Solo base LOCAL de desarrollo.')

  await withAdmin('postgres', (source) => source.query(`CREATE DATABASE ${GUARD_DATABASE}`))
  context.after(async () => {
    await withAdmin('postgres', (source) => source.query(`DROP DATABASE IF EXISTS ${GUARD_DATABASE}`))
  })

  await withAdmin(GUARD_DATABASE, (source) => source.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`))
  const source = createMigrationDataSource({ ...adminConfig(), database: GUARD_DATABASE })
  await source.initialize()
  try {
    await assert.rejects(
      () => source.runMigrations({ transaction: 'each' }),
      /línea base no está instalada/,
      'Sin el esquema oficial la migración debe fallar, no registrar un avance falso.'
    )
  } finally { await source.destroy() }

  // El rechazo no deja rastro: la base sigue sin migraciones registradas.
  const recorded = await withAdmin(GUARD_DATABASE, (source) => source
    .query(`SELECT count(*)::int AS n FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`)
    .then((rows: { n: number }[]) => rows[0]?.n ?? 0)
    .catch(() => 0))
  assert.equal(recorded, 0)
})

test('migraciones: REJECTED se añade sobre SQL oficial aislado, conserva datos y admite repetir up', { timeout: 90000 }, async (context) => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true', 'Solo ensayo explícito local.')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(config.host), 'Solo base LOCAL.')
  await withAdmin('postgres', (source) => source.query(`CREATE DATABASE ${REJECTED_DATABASE}`))
  context.after(async () => {
    await withAdmin('postgres', (source) => source.query(`DROP DATABASE IF EXISTS ${REJECTED_DATABASE}`))
  })
  const official = readFileSync(resolve(process.cwd(), '../infra/postgres-v2/official-schema.sql'), 'utf8')
  const enumValues = (source: DataSource) => source.query(
    `SELECT enumlabel FROM pg_enum WHERE enumtypid='public.campaign_status'::regtype ORDER BY enumsortorder`)
  const snapshot = (source: DataSource) => source.query(
    `SELECT code, name FROM public.role ORDER BY code`)
  let originalValues: { enumlabel: string }[] = []
  let originalRoles: unknown = []
  await withAdmin(REJECTED_DATABASE, async (source) => {
    await source.query(official)
    originalValues = await enumValues(source)
    originalRoles = await snapshot(source)
    assert.ok(!originalValues.some((row) => row.enumlabel === 'REJECTED'))
    await source.query(`CREATE SCHEMA ${MIGRATIONS_SCHEMA}`)
  })
  const source = createMigrationDataSource({ ...adminConfig(), database: REJECTED_DATABASE })
  await source.initialize()
  try {
    const applied = await source.runMigrations({ transaction: 'each' })
    assert.deepEqual(applied.map((row) => row.name), MIGRATIONS.map((migration) => migration.name))
    assert.deepEqual(await enumValues(source), [...originalValues, { enumlabel: 'REJECTED' }])
    assert.deepEqual(await snapshot(source), originalRoles, 'Los catálogos iniciales se conservan.')
    assert.deepEqual(await source.query(`SELECT 'REJECTED'::public.campaign_status::text AS status`), [{ status: 'REJECTED' }])
    assert.deepEqual(await source.runMigrations({ transaction: 'each' }), [])
    await assert.rejects(() => source.undoLastMigration({ transaction: 'each' }), /no elimina valores ENUM/)
    assert.equal(await source.showMigrations(), false)
    const tables: { n: number }[] = await source.query(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='r'`)
    assert.equal(tables[0]?.n, 59)
  } finally { await source.destroy() }
})
