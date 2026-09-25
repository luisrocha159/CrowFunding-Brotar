import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import pg from 'pg'

// Operación explícita e idempotente sobre la instancia V2 local. No restaura SQL,
// no elimina datos, no cambia contraseñas ni concede nuevos roles a usuarios.
const infra = new URL('../../infra/postgres-v2/', import.meta.url)
const env = parseEnv(readFileSync(new URL('.env', infra), 'utf8'))
const port = Number(env.POSTGRES_PORT)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('POSTGRES_PORT V2 inválido.')
const client = new pg.Client({ host: '127.0.0.1', port, database: 'brotar_db', user: 'postgres', password: env.POSTGRES_PASSWORD, connectionTimeoutMillis: 5000 })
try {
  await client.connect()
  for (const file of ['grant-e07.sql', 'grant-s1-13.sql', 'grant-s1-15.sql', 'grant-s1-16.sql', 'grant-s1-17.sql', 'grant-s1-18.sql', 'grant-s1-files.sql']) {
    await client.query(readFileSync(new URL(file, infra), 'utf8'))
  }
  console.log('Permisos técnicos del Sprint 1 aplicados a brotar_app; datos conservados.')
} catch {
  console.error('Preparación no completada. Comprueba Docker/V2 y la configuración local. No se restauró ni eliminó información.')
  process.exitCode = 1
} finally { await client.end() }
