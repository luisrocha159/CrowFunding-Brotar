export interface MigrationConfig {
  readonly host: string
  readonly port: number
  readonly database: string
  readonly username: string
  readonly password: string
}

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1']

// brotar_db es la base de trabajo; brotar_db_drill* son copias aisladas del ensayo de recuperación.
const ALLOWED_DATABASE = /^brotar_db(_drill[a-z0-9_]*)?$/

/**
 * Configuración del rol administrativo que aplica migraciones. Es deliberadamente
 * distinta de readDatabaseConfig: la API usa brotar_app, que no tiene DDL, y las
 * migraciones son una operación administrativa aparte (MIGRACIONES.md, paso 3).
 */
export function readMigrationConfig(env: NodeJS.ProcessEnv): MigrationConfig {
  const host = env.MIGRATION_DB_HOST ?? '127.0.0.1'
  const port = env.MIGRATION_DB_PORT ?? '15433'
  const database = env.MIGRATION_DB_NAME ?? 'brotar_db'
  const username = env.MIGRATION_DB_USER ?? 'postgres'
  const password = env.MIGRATION_DB_PASSWORD ?? ''

  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error('MIGRATION_DB_HOST debe ser local: el ensayo todavía no autoriza aplicar migraciones en remoto.')
  }
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('MIGRATION_DB_PORT inválido.')
  }
  if (!ALLOWED_DATABASE.test(database)) {
    throw new Error('MIGRATION_DB_NAME debe ser brotar_db o una copia brotar_db_drill*.')
  }
  if (username === 'brotar_app') {
    throw new Error('brotar_app no tiene privilegios DDL por diseño; usa el rol administrativo.')
  }
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(username)) {
    throw new Error('MIGRATION_DB_USER inválido.')
  }
  if (password.length < 16) {
    throw new Error('MIGRATION_DB_PASSWORD requiere al menos 16 caracteres.')
  }

  return { host, port: Number(port), database, username, password }
}
