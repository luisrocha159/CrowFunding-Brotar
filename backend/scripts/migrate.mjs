import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import pg from 'pg'

const require = createRequire(import.meta.url)
const adminEnvFile = new URL('../../infra/postgres-v2/.env', import.meta.url)
const distDir = new URL('../dist/shared/infrastructure/database/', import.meta.url)

const [command, ...rest] = process.argv.slice(2)
if (!['status', 'up', 'down'].includes(command)) {
  throw new Error('Uso: node scripts/migrate.mjs status | up | down [--database=<brotar_db|brotar_db_drill*>]')
}

const databaseFlag = rest.find((arg) => arg.startsWith('--database='))?.slice('--database='.length)

if (!existsSync(new URL('migration-data-source.js', distDir))) {
  throw new Error('Falta la compilación. Ejecuta pnpm run build antes de migrar.')
}
if (!existsSync(adminEnvFile)) {
  throw new Error('No existe infra/postgres-v2/.env. Instala la base V2 antes de migrar.')
}

const admin = parseEnv(readFileSync(adminEnvFile, 'utf8'))
const { readMigrationConfig } = require(fileURLToPath(new URL('migration.config.js', distDir)))
const { createMigrationDataSource, MIGRATIONS_TABLE, MIGRATIONS_SCHEMA } =
  require(fileURLToPath(new URL('migration-data-source.js', distDir)))

const config = readMigrationConfig({
  MIGRATION_DB_HOST: '127.0.0.1',
  MIGRATION_DB_PORT: admin.POSTGRES_PORT ?? '15433',
  MIGRATION_DB_NAME: databaseFlag ?? 'brotar_db',
  MIGRATION_DB_USER: 'postgres',
  MIGRATION_DB_PASSWORD: admin.POSTGRES_PASSWORD
})

// El esquema de control debe existir antes de que TypeORM cree su tabla dentro.
const bootstrap = new pg.Client({
  host: config.host, port: config.port, database: config.database,
  user: config.username, password: config.password, connectionTimeoutMillis: 5000
})
await bootstrap.connect()
try {
  await bootstrap.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`)
} finally {
  await bootstrap.end()
}

const source = createMigrationDataSource(config)
await source.initialize()
try {
  if (command === 'status') {
    const pending = await source.showMigrations()
    const applied = await source
      .query(`SELECT name, timestamp FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY timestamp`)
      .catch(() => [])
    console.log(JSON.stringify({
      database: config.database,
      table: `${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
      applied: applied.map((row) => row.name),
      pending
    }))
  } else if (command === 'up') {
    const executed = await source.runMigrations({ transaction: 'each' })
    console.log(executed.length === 0
      ? `Sin migraciones pendientes en ${config.database}.`
      : `Aplicadas en ${config.database}: ${executed.map((migration) => migration.name).join(', ')}.`)
  } else {
    // La línea base rechaza su propio down: revertirla no recupera datos, se recupera un respaldo.
    await source.undoLastMigration({ transaction: 'each' })
    console.log(`Revertida la última migración de ${config.database}.`)
  }
} finally {
  await source.destroy()
}
