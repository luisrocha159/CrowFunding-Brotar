import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parseEnv } from 'node:util'
import { randomBytes } from 'node:crypto'
import pg from 'pg'

/**
 * Ensayo de respaldo y recuperación exigido por BG-59 / S1-10 (CA 2).
 *
 * Respalda brotar_db, la restaura en una copia aislada, comprueba que el inventario
 * de la línea base sobrevive (vistas, funciones, triggers, secuencias y claves foráneas)
 * y aplica ahí el mecanismo de migraciones. No toca la base de trabajo en ningún paso:
 * todo lo destructivo ocurre exclusivamente sobre DRILL_DATABASE.
 */

const infra = new URL('../../infra/postgres-v2/', import.meta.url)
const adminEnvFile = new URL('.env', infra)
const baseline = JSON.parse(readFileSync(new URL('baseline.json', infra), 'utf8'))
const verifySql = readFileSync(new URL('../../infra/postgres/verify.sql', import.meta.url), 'utf8')

// Nombre generado internamente: ningún argumento puede apuntar el ensayo a brotar_db.
const DRILL_DATABASE = `brotar_db_drill_${randomBytes(6).toString('hex')}`
const SOURCE_DATABASE = 'brotar_db'
const CONTAINER_DUMP = `/tmp/${DRILL_DATABASE}.dump`

const keepCopy = process.argv.includes('--keep')
// Los respaldos llevan datos: fuera del repositorio y con permisos restringidos.
const evidenceDir = process.env.BROTAR_DRILL_DIR ?? join(homedir(), 'Documents', 'brotar-privado', 'ensayos')

if (!existsSync(adminEnvFile)) {
  throw new Error('No existe infra/postgres-v2/.env. Instala la base V2 antes del ensayo.')
}
const admin = parseEnv(readFileSync(adminEnvFile, 'utf8'))
const port = Number(admin.POSTGRES_PORT ?? '15433')
const compose = [
  'compose', '--env-file', fileURLToPath(adminEnvFile),
  '-f', fileURLToPath(new URL('compose.yaml', infra))
]

function inContainer(args, label) {
  // Socket local del contenedor; no expone contraseñas en argumentos de procesos.
  return execFileSync('docker', [...compose, 'exec', '-T', 'postgres', ...args], {
    timeout: 180000, encoding: 'utf8'
  }).trim() || label
}

async function inventoryOf(database) {
  const client = new pg.Client({
    host: '127.0.0.1', port, database, user: 'postgres',
    password: admin.POSTGRES_PASSWORD, connectionTimeoutMillis: 5000
  })
  try {
    await client.connect()
    const result = await client.query(verifySql)
    return result.rows[0].json_build_object
  } finally { await client.end() }
}

const steps = []

// 1. Respaldo en formato personalizado: conserva vistas, funciones, triggers y secuencias.
inContainer(['pg_dump', '-U', 'postgres', '-Fc', '-f', CONTAINER_DUMP, SOURCE_DATABASE], 'dump')
steps.push('respaldo creado')

// 2. Copia aislada, siempre recreada desde cero.
inContainer(['psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
  `CREATE DATABASE ${DRILL_DATABASE}`], 'create')
steps.push('copia aislada creada')

// 3. Restauración. pg_restore avisa de objetos que ya existen en plantillas; se exige salida limpia.
inContainer(['pg_restore', '-U', 'postgres', '-d', DRILL_DATABASE, '--exit-on-error', CONTAINER_DUMP], 'restore')
steps.push('restauración aplicada')

// 4. El inventario restaurado debe coincidir con la línea base, no solo el número de tablas.
const restored = await inventoryOf(DRILL_DATABASE)
const differences = Object.entries(baseline.inventory)
  .filter(([name, expected]) => restored[name] !== expected)
  .map(([name, expected]) => `${name}: esperado ${expected}, obtenido ${restored[name]}`)
if (differences.length > 0) {
  throw new Error(`La copia recuperada no reproduce la línea base. ${differences.join('; ')}`)
}
steps.push('inventario verificado')

// 5. El respaldo arrastra el esquema de control con la migración ya aplicada; se retira de la
//    copia para que el ensayo ejercite el mecanismo de verdad y no informe "sin pendientes".
inContainer(['psql', '-U', 'postgres', '-d', DRILL_DATABASE, '-v', 'ON_ERROR_STOP=1', '-c',
  'DROP SCHEMA IF EXISTS brotar_migration CASCADE'], 'reset')
steps.push('control de migraciones reiniciado en la copia')

const migrateOutput = execFileSync('node', [
  fileURLToPath(new URL('migrate.mjs', import.meta.url)), 'up', `--database=${DRILL_DATABASE}`
], { timeout: 120000, encoding: 'utf8' }).trim()
steps.push('migraciones aplicadas sobre la copia')

// 6. Migrar no debe alterar el esquema oficial de la copia.
const afterMigration = await inventoryOf(DRILL_DATABASE)
const altered = Object.entries(baseline.inventory)
  .filter(([name, expected]) => afterMigration[name] !== expected)
  .map(([name]) => name)
if (altered.length > 0) {
  throw new Error(`Migrar alteró el esquema oficial de la copia: ${altered.join(', ')}.`)
}
steps.push('esquema oficial intacto tras migrar')

// 7. Conservar el respaldo fuera del repositorio como evidencia, sin publicar datos.
mkdirSync(evidenceDir, { recursive: true, mode: 0o700 })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const evidencePath = join(evidenceDir, `brotar-drill-${stamp}.dump`)
execFileSync('docker', [...compose, 'cp', `postgres:${CONTAINER_DUMP}`, evidencePath], { timeout: 120000 })
steps.push('evidencia conservada')

if (!keepCopy) {
  inContainer(['psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
    `DROP DATABASE IF EXISTS ${DRILL_DATABASE}`], 'cleanup')
  steps.push('copia aislada retirada')
}

console.log(JSON.stringify({
  source: SOURCE_DATABASE,
  copy: DRILL_DATABASE,
  migration: migrateOutput,
  inventory: restored,
  evidenceBytes: statSync(evidencePath).size,
  steps
}, null, 2))
console.log('\nEnsayo completado: respaldo, recuperación aislada, inventario y migración comprobados.')
console.log(`Respaldo conservado fuera del repositorio en ${evidenceDir} (contiene datos: no publicar).`)
