import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

// Solo la instancia local de Compose de Brotar, nunca una base remota.
const infraEnv = new URL('../../infra/postgres/.env', import.meta.url)
const compose = new URL('../../infra/postgres/compose.yaml', import.meta.url)
const admin = parseEnv(readFileSync(infraEnv, 'utf8'))
const app = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'))
if (app.NODE_ENV !== 'development' || app.DB_HOST !== '127.0.0.1' || app.DB_NAME !== 'brotar_db'
  || app.DB_USER !== 'brotar_app' || app.DB_PORT !== admin.POSTGRES_PORT
  || !/^[a-f0-9]{64}$/.test(app.DB_PASSWORD ?? '')) {
  throw new Error('La configuración no coincide con setup-local. No se modificó ningún rol.')
}
const container = execFileSync('docker', ['compose', '--env-file', fileURLToPath(infraEnv), '-f', fileURLToPath(compose), 'ps', '-q', 'postgres'], { encoding: 'utf8' }).trim()
if (!/^[a-f0-9]{12,64}$/.test(container)) throw new Error('Contenedor local no encontrado.')
const metadata = JSON.parse(execFileSync('docker', ['inspect', '--format', '{{json .NetworkSettings.Ports}}', container], { encoding: 'utf8' }))
const binding = metadata['5432/tcp']
if (binding?.length !== 1 || binding[0].HostIp !== '127.0.0.1' || binding[0].HostPort !== app.DB_PORT) {
  throw new Error('El puerto no corresponde al contenedor local esperado.')
}
const client = new pg.Client({ host: '127.0.0.1', port: Number(app.DB_PORT), database: 'brotar_db', user: 'postgres', password: admin.POSTGRES_PASSWORD, connectionTimeoutMillis: 5000 })
try {
  await client.connect()
  await client.query('BEGIN')
  // CREATE ROLE falla si ya existe; no se restablecen contraseñas existentes.
  await client.query('CREATE ROLE brotar_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS')
  // Solo hexadecimal generado localmente; nunca se imprime ni se pasa como argumento del proceso.
  await client.query(`ALTER ROLE brotar_app PASSWORD '${app.DB_PASSWORD}'`)
  await client.query('GRANT CONNECT ON DATABASE brotar_db TO brotar_app')
  await client.query('GRANT USAGE ON SCHEMA public TO brotar_app')
  await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user, public.user_profile TO brotar_app')
  await client.query('GRANT SELECT, INSERT, UPDATE ON public.user_token TO brotar_app')
  await client.query('COMMIT')
  console.log('brotar_app creado con contraseña local y permisos limitados a usuarios/perfiles y sesiones.')
} catch {
  await client.query('ROLLBACK').catch(() => {})
  console.error('No se pudo aprovisionar. Comprueba conexión, restauración y si brotar_app ya existe. No se muestran detalles SQL ni credenciales.')
  process.exitCode = 1
} finally {
  await client.end()
}
