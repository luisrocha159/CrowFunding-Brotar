import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, copyFileSync, constants } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'
import { parseEnv } from 'node:util'
import pg from 'pg'

const infra = new URL('../../infra/postgres-v2/', import.meta.url)
const envFile = new URL('.env', infra)
const candidateFile = new URL('.env.backend', infra)
const backendFile = new URL('../.env', import.meta.url)
const previousFile = new URL('.env.before-v2', infra)
const expectedHash = '5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88'
const grants = ['grant-e07.sql', 'grant-s1-13.sql', 'grant-s1-15.sql', 'grant-s1-16.sql', 'grant-s1-17.sql', 'grant-s1-18.sql', 'grant-s1-files.sql']
const [mode, inputPath] = process.argv.slice(2)

if (!['install', 'activate'].includes(mode)) throw new Error('Uso: node scripts/adopt-provisional-v2.mjs install <SQL oficial> | activate')

function readConfiguration() {
  const hasAdmin = existsSync(envFile)
  const hasCandidate = existsSync(candidateFile)
  if (hasAdmin !== hasCandidate) {
    throw new Error('Configuración V2 incompleta: deben existir ambos archivos infra/postgres-v2/.env y .env.backend. Se conservan para diagnóstico; no borres el volumen.')
  }
  if (!hasAdmin) return null
  const admin = parseEnv(readFileSync(envFile, 'utf8'))
  const candidate = parseEnv(readFileSync(candidateFile, 'utf8'))
  const port = Number(admin.POSTGRES_PORT)
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || candidate.DB_PORT !== String(port) ||
      candidate.DB_HOST !== '127.0.0.1' || candidate.DB_NAME !== 'brotar_db' || candidate.DB_USER !== 'brotar_app' ||
      !admin.POSTGRES_PASSWORD || !/^[a-f0-9]{64}$/.test(candidate.DB_PASSWORD)) {
    throw new Error('La configuración V2 no es coherente. Comprueba puerto y credenciales en los dos archivos privados; no se sobrescribieron.')
  }
  return { admin, candidate, port }
}

async function connectWhenReady(options) {
  const transient = new Set(['3D000', '57P03', 'ECONNREFUSED', 'ECONNRESET'])
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const client = new pg.Client({ ...options, connectionTimeoutMillis: 5000 })
    try {
      await client.connect()
      return client
    } catch (error) {
      await client.end().catch(() => {})
      if (!transient.has(error.code) || attempt === 29) throw error
      await setTimeout(1000)
    }
  }
}

if (mode === 'install') {
  if (!inputPath) throw new Error('Indica el SQL oficial incluido en infra/postgres-v2/official-schema.sql.')
  const sqlBytes = readFileSync(inputPath)
  if (createHash('sha256').update(sqlBytes).digest('hex') !== expectedHash) throw new Error('Versión SQL no revisada: no se ejecutó.')

  let config = readConfiguration()
  if (!config) {
    const port = Number(process.env.BROTAR_DB_PORT ?? 15433)
    const project = process.env.BROTAR_COMPOSE_PROJECT ?? 'brotar-provisional-v2'
    if (!Number.isInteger(port) || port < 1024 || port > 65535 || !/^[a-z0-9][a-z0-9_-]*$/.test(project)) {
      throw new Error('BROTAR_DB_PORT o BROTAR_COMPOSE_PROJECT inválido.')
    }
    const adminPassword = randomBytes(32).toString('hex')
    const appPassword = randomBytes(32).toString('hex')
    const base = existsSync(backendFile) ? parseEnv(readFileSync(backendFile, 'utf8')) : {}
    writeFileSync(envFile, `BROTAR_COMPOSE_PROJECT=${project}\nPOSTGRES_PORT=${port}\nPOSTGRES_PASSWORD=${adminPassword}\n`, { flag: 'wx', mode: 0o600 })
    writeFileSync(candidateFile, `NODE_ENV=development\nHOST=127.0.0.1\nPORT=${base.PORT ?? '3000'}\nCORS_ORIGINS=${base.CORS_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173'}\nDATABASE_ENABLED=true\nDB_HOST=127.0.0.1\nDB_PORT=${port}\nDB_NAME=brotar_db\nDB_USER=brotar_app\nDB_PASSWORD=${appPassword}\nDB_SSL=false\n`, { flag: 'wx', mode: 0o600 })
    config = readConfiguration()
  }

  const compose = ['compose', '--env-file', fileURLToPath(envFile), '-f', fileURLToPath(new URL('compose.yaml', infra))]
  try {
    execFileSync('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '90'], { stdio: 'inherit', timeout: 120000 })
  } catch {
    throw new Error('Docker no levantó PostgreSQL V2. Revisa Docker Desktop, el puerto y los registros de Compose. Conservamos configuración y volumen; reintenta install cuando el motor funcione.')
  }

  const client = await connectWhenReady({ host: '127.0.0.1', port: config.port, database: 'brotar_db', user: 'postgres', password: config.admin.POSTGRES_PASSWORD })
  try {
    const occupied = await client.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`)
    if (occupied.rows[0].n === 0) {
      // El SQL oficial trae BEGIN/COMMIT. Un reintento solo lo aplica si public sigue vacío.
      await client.query(sqlBytes.toString('utf8'))
    } else {
      const baseline = JSON.parse(readFileSync(new URL('baseline.json', infra), 'utf8'))
      const inventory = (await client.query(readFileSync(new URL('../postgres/verify.sql', infra), 'utf8'))).rows[0].json_build_object
      const mismatches = Object.entries(baseline.inventory).filter(([key, expected]) => inventory[key] !== expected)
      if (mismatches.length) {
        throw new Error(`La base existente no coincide con el esquema oficial (${mismatches.map(([key]) => key).join(', ')}). No se restaura encima ni se eliminan datos.`)
      }
    }

    await client.query('BEGIN')
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname='brotar_app'")
    if (role.rowCount === 0) await client.query('CREATE ROLE brotar_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS')
    // La contraseña generada es hexadecimal. El reintento alinea el rol con .env.backend.
    await client.query(`ALTER ROLE brotar_app PASSWORD '${config.candidate.DB_PASSWORD}'`)
    await client.query('GRANT CONNECT ON DATABASE brotar_db TO brotar_app')
    await client.query('GRANT USAGE ON SCHEMA public TO brotar_app')
    await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user, public.user_profile TO brotar_app')
    await client.query('GRANT SELECT, INSERT, UPDATE ON public.user_token TO brotar_app')
    await client.query('COMMIT')
    for (const file of grants) await client.query(readFileSync(new URL(file, infra), 'utf8'))
    console.log(`V2 preparada en 127.0.0.1:${config.port}. Instala dependencias, compila, ejecuta migraciones y pruebas; luego activa backend/.env.`)
  } catch (error) {
    console.error(`Instalación no completada: ${error.message} Se conservaron configuración y datos; corrige la causa y reintenta install.`)
    process.exitCode = 1
  } finally { await client.end().catch(() => {}) }
} else {
  const config = readConfiguration()
  if (!config) throw new Error('Falta la instalación V2. Ejecuta install primero.')
  const client = await connectWhenReady({ host: '127.0.0.1', port: config.port, database: 'brotar_db', user: 'brotar_app', password: config.candidate.DB_PASSWORD })
  try {
    await client.query('SELECT administrative_area_id FROM public.user_profile LIMIT 0')
    if (existsSync(backendFile) && readFileSync(backendFile, 'utf8') === readFileSync(candidateFile, 'utf8')) {
      console.log('backend/.env ya apunta a V2; no se cambió la configuración.')
    } else {
      if (existsSync(previousFile)) throw new Error('Ya existe .env.before-v2 pero backend/.env es distinto del candidato. Revisa los archivos manualmente; no se sobrescribió ninguno.')
      if (existsSync(backendFile)) copyFileSync(backendFile, previousFile, constants.COPYFILE_EXCL)
      copyFileSync(candidateFile, backendFile)
      console.log('API configurada para V2. Configuración anterior conservada en infra/postgres-v2/.env.before-v2 (privada). Reinicia la API.')
    }
  } finally { await client.end() }
}
