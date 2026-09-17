import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { randomBytes, randomUUID, scryptSync } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { parseEnv } from 'node:util'
import { test } from 'node:test'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { UserProfileSchema, UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { SessionTokenSchema } from '../src/auth/infrastructure/session-token.schema'

test('PostgreSQL: mapeo, permisos, commit, reconexión y rollback', { timeout: 90000 }, async (context) => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.ok(process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost', '::1'].includes(config.host),
    'Esta prueba solo admite una base LOCAL de desarrollo.')

  let restartContainer: string | undefined
  if (process.env.DB_TEST_RESTART === 'true') {
    const envPath = resolve(process.cwd(), '../infra/postgres-v2/.env')
    const composePath = resolve(process.cwd(), '../infra/postgres-v2/compose.yaml')
    const local = parseEnv(readFileSync(envPath, 'utf8'))
    assert.equal(String(config.port), local.POSTGRES_PORT)
    restartContainer = execFileSync('docker', ['compose', '--env-file', envPath, '-f', composePath, 'ps', '-q', 'postgres'], { encoding: 'utf8', timeout: 10000 }).trim()
    assert.match(restartContainer, /^[a-f0-9]{12,64}$/)
    const project = execFileSync('docker', ['inspect', '--format', '{{index .Config.Labels "com.docker.compose.project"}}', restartContainer], { encoding: 'utf8', timeout: 10000 }).trim()
    assert.equal(project, 'brotar-provisional-v2')
    const ports = JSON.parse(execFileSync('docker', ['inspect', '--format', '{{json .NetworkSettings.Ports}}', restartContainer], { encoding: 'utf8', timeout: 10000 })) as Record<string, { HostIp: string; HostPort: string }[]>
    assert.deepEqual(ports['5432/tcp'], [{ HostIp: '127.0.0.1', HostPort: String(config.port) }])
  }

  const id = randomUUID()
  const rollbackId = randomUUID()
  const email = `integration-${id}@example.invalid`
  // Contraseña aleatoria no conservada, cuenta pendiente, nunca credenciales reutilizables.
  const salt = randomBytes(16).toString('hex')
  const hash = `scrypt:${salt}:${scryptSync(randomBytes(32), salt, 64).toString('hex')}`
  const source = createDataSource(config)
  let committed = false
  try {
    await source.initialize()
    const privileges: { rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean }[] =
      await source.query('SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user')
    assert.deepEqual(privileges[0], { rolsuper: false, rolcreatedb: false, rolcreaterole: false })
    const access: { create_schema_objects: boolean; insert_organization: boolean }[] = await source.query(`
      SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS create_schema_objects,
             has_table_privilege(current_user, 'public.organization', 'INSERT') AS insert_organization
    `)
    assert.deepEqual(access[0], { create_schema_objects: false, insert_organization: true })

    // Comprueba todos los nombres de columnas mapeados contra la base real.
    for (const schema of [UserSchema, UserProfileSchema, SessionTokenSchema]) {
      const metadata = source.getMetadata(schema)
      const actual: { column_name: string }[] = await source.query(
        'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
        ['public', metadata.tableName])
      assert.deepEqual(actual.map((row) => row.column_name).sort(), metadata.columns.map((column) => column.databaseName).sort())
    }

    await source.transaction(async (manager) => {
      await manager.getRepository(UserSchema).insert({ id, email, passwordHash: hash })
      await manager.getRepository(UserProfileSchema).insert({ userId: id, firstName: 'Prueba', lastName: 'Integración' })
    })
    committed = true
    await source.destroy()
    if (restartContainer) {
      execFileSync('docker', ['restart', restartContainer], { timeout: 45000, stdio: 'pipe' })
      let ready = false
      for (let attempt = 0; attempt < 15; attempt++) {
        try {
          execFileSync('docker', ['exec', restartContainer, 'pg_isready', '-U', 'postgres', '-d', 'brotar_db'], { timeout: 3000, stdio: 'pipe' })
          ready = true
          break
        } catch { await setTimeout(1000) }
      }
      assert.ok(ready, 'PostgreSQL debe volver a estar disponible después del reinicio.')
    }
    await source.initialize()
    const user = await source.getRepository(UserSchema).findOneByOrFail({ id })
    assert.equal(user.email, email)
    assert.equal(user.passwordHash, undefined)
    assert.equal(user.status, 'PENDING_VERIFICATION')
    const profile = await source.getRepository(UserProfileSchema).findOneByOrFail({ userId: id })
    assert.equal(profile.firstName, 'Prueba')
    context.diagnostic(restartContainer ? 'Datos conservados después de reiniciar el contenedor PostgreSQL de Brotar.' : 'Datos conservados después de cerrar y reabrir la conexión.')

    // citext: mayúsculas y minúsculas siguen identificando la misma cuenta.
    assert.equal((await source.getRepository(UserSchema).findOneByOrFail({ email: email.toUpperCase() })).id, id)
    await source.getRepository(UserProfileSchema).update({ userId: id }, { displayName: 'Verificación E02' })
    assert.equal((await source.getRepository(UserProfileSchema).findOneByOrFail({ userId: id })).displayName, 'Verificación E02')

    await assert.rejects(source.transaction(async (manager) => {
      await manager.getRepository(UserSchema).insert({ id: rollbackId, email: `rollback-${rollbackId}@example.invalid`, passwordHash: hash })
      throw new Error('rollback-intencional-E02')
    }), /rollback-intencional-E02/)
    assert.equal(await source.getRepository(UserSchema).countBy({ id: rollbackId }), 0)
  } finally {
    try {
      if (committed) {
        if (!source.isInitialized) await source.initialize()
        // Solo elimina las dos filas creadas por ESTA ejecución, nunca datos iniciales.
        await source.transaction(async (manager) => {
          await manager.getRepository(UserProfileSchema).delete({ userId: id })
          await manager.getRepository(UserSchema).delete({ id, email })
        })
      }
    } finally { if (source.isInitialized) await source.destroy() }
  }
})
