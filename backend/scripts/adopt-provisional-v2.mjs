import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, copyFileSync, constants } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { parseEnv } from 'node:util'
import pg from 'pg'

const infra = new URL('../../infra/postgres-v2/', import.meta.url)
const envFile = new URL('.env', infra)
const candidateFile = new URL('.env.backend', infra)
const backendFile = new URL('../.env', import.meta.url)
const compose = ['compose', '--env-file', fileURLToPath(envFile), '-f', fileURLToPath(new URL('compose.yaml', infra))]
const expectedHash = '5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88'
const [mode, inputPath] = process.argv.slice(2)

if (!['install', 'activate'].includes(mode)) throw new Error('Uso: node scripts/adopt-provisional-v2.mjs install <SQL oficial> | activate')

if (mode === 'install') {
  const sqlBytes = readFileSync(inputPath)
  if (createHash('sha256').update(sqlBytes).digest('hex') !== expectedHash) throw new Error('Versión SQL no revisada: no se ejecutó.')
  if (existsSync(envFile) || existsSync(candidateFile)) throw new Error('Ya existe configuración v2; no se sobrescribe ni reinstala automáticamente.')
  const adminPassword = randomBytes(32).toString('hex')
  const appPassword = randomBytes(32).toString('hex')
  writeFileSync(envFile, `POSTGRES_PORT=15433\nPOSTGRES_PASSWORD=${adminPassword}\n`, { flag: 'wx', mode: 0o600 })
  const base = existsSync(backendFile) ? parseEnv(readFileSync(backendFile, 'utf8')) : {}
  // Solo conserva opciones públicas; genera credenciales diferentes para esta instancia.
  writeFileSync(candidateFile, `NODE_ENV=development\nPORT=${base.PORT ?? '3000'}\nCORS_ORIGINS=${base.CORS_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173'}\nDATABASE_ENABLED=true\nDB_HOST=127.0.0.1\nDB_PORT=15433\nDB_NAME=brotar_db\nDB_USER=brotar_app\nDB_PASSWORD=${appPassword}\nDB_SSL=false\n`, { flag: 'wx', mode: 0o600 })
  execFileSync('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '90'], { stdio: 'inherit', timeout: 120000 })
  const client = new pg.Client({ host: '127.0.0.1', port: 15433, database: 'brotar_db', user: 'postgres', password: adminPassword, connectionTimeoutMillis: 5000 })
  try {
    await client.connect()
    const occupied = await client.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`)
    if (occupied.rows[0].n !== 0) throw new Error('La base no está vacía.')
    // El SQL oficial trae BEGIN/COMMIT; no se modifica ni se aplica al volumen anterior.
    await client.query(sqlBytes.toString('utf8'))
    await client.query('BEGIN')
    await client.query('CREATE ROLE brotar_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS')
    await client.query(`ALTER ROLE brotar_app PASSWORD '${appPassword}'`)
    await client.query('GRANT CONNECT ON DATABASE brotar_db TO brotar_app')
    await client.query('GRANT USAGE ON SCHEMA public TO brotar_app')
    await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user, public.user_profile TO brotar_app')
    await client.query('GRANT SELECT, INSERT, UPDATE ON public.user_token TO brotar_app')
    await client.query('COMMIT')
    await client.query(readFileSync(new URL('grant-e07.sql', infra), 'utf8'))
    console.log('V2 instalada en 127.0.0.1:15433. La API todavía conserva su configuración anterior. Ejecuta las pruebas con infra/postgres-v2/.env.backend antes de activate.')
  } catch {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Instalación no completada. Se conservaron ambos volúmenes y la configuración para diagnosticar; no se muestran SQL ni credenciales. No repitas sobre una base poblada.')
    process.exitCode = 1
  } finally { await client.end() }
} else {
  const candidate = parseEnv(readFileSync(candidateFile, 'utf8'))
  if (candidate.DB_HOST !== '127.0.0.1' || candidate.DB_PORT !== '15433' || candidate.DB_NAME !== 'brotar_db' || candidate.DB_USER !== 'brotar_app') throw new Error('Destino inesperado.')
  const client = new pg.Client({ host: candidate.DB_HOST, port: 15433, database: candidate.DB_NAME, user: candidate.DB_USER, password: candidate.DB_PASSWORD })
  try {
    await client.connect()
    await client.query('SELECT administrative_area_id FROM public.user_profile LIMIT 0')
    if (existsSync(backendFile)) copyFileSync(backendFile, new URL('.env.before-v2', infra), constants.COPYFILE_EXCL)
    copyFileSync(candidateFile, backendFile)
    console.log('API configurada para V2. Configuración anterior conservada en infra/postgres-v2/.env.before-v2 (privada). Reinicia la API.')
  } finally { await client.end() }
}
