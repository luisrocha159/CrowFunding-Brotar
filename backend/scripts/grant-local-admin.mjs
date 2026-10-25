import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { isEmail } from 'class-validator'
import pg from 'pg'

// Operación explícita del responsable local. No es un endpoint ni un seed automático.
export function readArguments(args) {
  if (args.length !== 2 || !args.includes('--confirm-local-admin')) {
    throw new Error('Uso: node scripts/grant-local-admin.mjs --email=correo --confirm-local-admin')
  }
  const email = args.find(value => value.startsWith('--email='))?.slice(8).trim().toLowerCase()
  if (!email || email.length > 254 || !isEmail(email)) throw new Error('Correo no válido.')
  return email
}

export function localConfiguration(admin, app) {
  const port = Number(admin.POSTGRES_PORT)
  const project = admin.BROTAR_COMPOSE_PROJECT ?? 'brotar-provisional-v2'
  if (app.NODE_ENV !== 'development' || app.DATABASE_ENABLED !== 'true'
    || app.DB_HOST !== '127.0.0.1' || app.DB_NAME !== 'brotar_db' || app.DB_USER !== 'brotar_app'
    || app.DB_SSL !== 'false' || app.DB_PORT !== String(port)
    || !/^[a-f0-9]{64}$/.test(app.DB_PASSWORD ?? '')
    || !Number.isInteger(port) || port < 1024 || port > 65535
    || !/^[a-z0-9][a-z0-9_-]*$/.test(project)
    || !admin.POSTGRES_PASSWORD || admin.POSTGRES_PASSWORD.length < 16) {
    throw new Error('Solo se admite la configuración V2 local de desarrollo activada; no se modificaron roles.')
  }
  return { port, project }
}

export function verifyContainer(metadata, config) {
  const ports = metadata.NetworkSettings?.Ports?.['5432/tcp']
  if (!metadata.State?.Running || metadata.Config?.Labels?.['com.docker.compose.project'] !== config.project
    || ports?.length !== 1 || ports[0].HostIp !== '127.0.0.1' || ports[0].HostPort !== String(config.port)) {
    throw new Error('El contenedor no coincide con esta copia local. No se modificaron roles.')
  }
}

export async function grantExistingAdmin(client, email) {
  await client.query('BEGIN')
  try {
    const users = await client.query(`SELECT id, status, deleted_at,
      (locked_until IS NOT NULL AND locked_until>now()) AS locked
      FROM public.app_user WHERE email=$1 FOR UPDATE`, [email])
    const user = users.rows[0]
    if (users.rowCount !== 1 || !user || user.deleted_at || user.locked
      || !['ACTIVE', 'PENDING_VERIFICATION'].includes(user.status)) {
      throw new Error('La cuenta no existe o no admite acceso. Regístrala primero; no se activan ni desbloquean cuentas.')
    }
    const roles = await client.query(`SELECT id FROM public.role
      WHERE code='ADMIN' AND is_internal=true AND is_system=true`)
    if (roles.rowCount !== 1) throw new Error('Falta el rol ADMIN oficial; no se crea un catálogo alternativo.')
    const roleId = roles.rows[0].id
    const existing = await client.query(`SELECT id,
      (granted_at<=now() AND (expires_at IS NULL OR expires_at>now())) AS active
      FROM public.user_role WHERE user_id=$1 AND role_id=$2 AND revoked_at IS NULL FOR UPDATE`, [user.id, roleId])
    if (existing.rowCount && !existing.rows[0].active) {
      throw new Error('Existe una concesión vencida o futura. Revisarla manualmente; no se reactiva automáticamente.')
    }
    if (!existing.rowCount) {
      await client.query('INSERT INTO public.user_role(user_id,role_id) VALUES($1,$2)', [user.id, roleId])
    }
    await client.query('COMMIT')
    return existing.rowCount ? 'existing' : 'granted'
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function main() {
  const email = readArguments(process.argv.slice(2))
  const infra = new URL('../../infra/postgres-v2/', import.meta.url)
  const adminFile = new URL('.env', infra)
  const admin = parseEnv(readFileSync(adminFile, 'utf8'))
  const app = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'))
  const config = localConfiguration(admin, app)
  const container = execFileSync('docker', ['compose', '--env-file', fileURLToPath(adminFile),
    '-f', fileURLToPath(new URL('compose.yaml', infra)), 'ps', '-q', 'postgres'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }).trim()
  if (!/^[a-f0-9]{12,64}$/.test(container)) throw new Error('Contenedor V2 de esta copia no encontrado.')
  const metadata = JSON.parse(execFileSync('docker', ['inspect', '--format', '{{json .}}', container],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }))
  verifyContainer(metadata, config)
  const client = new pg.Client({ host: '127.0.0.1', port: config.port, database: 'brotar_db',
    user: 'postgres', password: admin.POSTGRES_PASSWORD, connectionTimeoutMillis: 5000 })
  try {
    await client.connect()
    const result = await grantExistingAdmin(client, email)
    console.log(result === 'existing' ? 'La cuenta ya tiene ADMIN vigente; no se cambió nada.'
      : 'ADMIN concedido en la base local de esta copia. Contraseña, estado y otros roles conservados.')
    console.log('Cierra sesión y vuelve a entrar; abre /administracion/campanas. No se publicaron credenciales.')
  } finally {
    await client.end()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('No se pudo conceder ADMIN. Revisa cuenta existente, configuración V2, contenedor y credenciales del operador. No se muestran datos SQL ni contraseñas.')
    process.exitCode = 1
  })
}
