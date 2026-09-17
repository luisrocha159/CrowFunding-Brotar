export interface DatabaseConfig {
  readonly enabled: boolean
  readonly host: string
  readonly port: number
  readonly database: string
  readonly username: string
  readonly password: string
  readonly ssl: boolean
}

function readBoolean(value: string | undefined, name: string): boolean {
  if (value !== undefined && value !== 'true' && value !== 'false') {
    throw new Error(`${name} debe ser true o false.`)
  }
  return value === 'true'
}

export function readDatabaseConfig(env: NodeJS.ProcessEnv): DatabaseConfig {
  const enabled = readBoolean(env.DATABASE_ENABLED, 'DATABASE_ENABLED')
  const host = env.DB_HOST ?? '127.0.0.1'
  const port = env.DB_PORT ?? '5433'
  const database = env.DB_NAME ?? 'brotar_db'
  const username = env.DB_USER ?? 'brotar_app'
  const password = env.DB_PASSWORD ?? ''
  const ssl = readBoolean(env.DB_SSL, 'DB_SSL')
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('DB_PORT inválido.')
  if (database !== 'brotar_db') throw new Error('DB_NAME debe ser brotar_db para esta etapa.')
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(username) || username === 'postgres') {
    throw new Error('DB_USER debe ser un rol de aplicación, no postgres.')
  }
  if (enabled && password.length < 16) throw new Error('DB_PASSWORD requiere al menos 16 caracteres.')
  if (enabled && !ssl && (!['127.0.0.1', 'localhost', '::1'].includes(host) || env.NODE_ENV === 'production')) {
    throw new Error('Las conexiones no locales o de producción requieren DB_SSL=true.')
  }
  return { enabled, host, port: Number(port), database, username, password, ssl }
}
