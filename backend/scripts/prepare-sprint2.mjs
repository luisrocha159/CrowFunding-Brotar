import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import pg from 'pg'

// Solo permisos técnicos de lectura/descarte. No migra REJECTED ni asigna ADMIN/CREATOR.
const infra = new URL('../../infra/postgres-v2/', import.meta.url)
const env = parseEnv(readFileSync(new URL('.env', infra), 'utf8'))
const port = Number(env.POSTGRES_PORT)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('POSTGRES_PORT V2 inválido.')
const client = new pg.Client({ host: '127.0.0.1', port, database: 'brotar_db', user: 'postgres', password: env.POSTGRES_PASSWORD, connectionTimeoutMillis: 5000 })
try {
  await client.connect()
  await client.query(readFileSync(new URL('grant-s2-projects.sql', infra), 'utf8'))
  console.log('Permisos S2-15/S2-17 aplicados. Datos, roles y estados conservados.')
} catch {
  console.error('Preparación S2 no completada. Revisa Docker/V2 y su configuración; no se borraron datos.')
  process.exitCode = 1
} finally { await client.end() }
