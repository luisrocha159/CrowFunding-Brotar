import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { databaseOptions } from '../src/shared/infrastructure/database/data-source'
import { DatabaseService } from '../src/shared/infrastructure/database/database.service'
import { UserProfileSchema, UserSchema } from '../src/users/infrastructure/persistence/user.schemas'

test('la base está desactivada por defecto, sin inventar una conexión exitosa', async () => {
  const service = new DatabaseService(readDatabaseConfig({}))
  await service.onModuleInit()
  assert.equal(await service.isReady(), false)
  await service.onModuleDestroy()
})

test('rechaza bandera ambigua, puerto inválido, postgres y clave ausente', () => {
  for (const env of [
    { DATABASE_ENABLED: 'yes' }, { DB_SSL: '1' }, { DB_PORT: '0' },
    { DB_PORT: '5432oops' }, { DB_PORT: '65536' }, { DB_USER: 'postgres' },
    { DB_USER: 'invalid role' }, { DB_NAME: 'otra_base' }, { DATABASE_ENABLED: 'true' }
  ]) assert.throws(() => readDatabaseConfig(env))
})

test('exige TLS verificado para conexiones remotas o producción', () => {
  const env = { DATABASE_ENABLED: 'true', DB_PASSWORD: 'test-only-password-long' }
  assert.throws(() => readDatabaseConfig({ ...env, DB_HOST: 'db.example.com' }), /DB_SSL/)
  assert.throws(() => readDatabaseConfig({ ...env, NODE_ENV: 'production' }), /DB_SSL/)
  const options = databaseOptions(readDatabaseConfig({ ...env, DB_HOST: 'db.example.com', DB_SSL: 'true' }))
  assert.equal(options.type, 'postgres')
  if (options.type !== 'postgres') throw new Error('Motor inesperado')
  assert.deepEqual(options.ssl, { rejectUnauthorized: true })
})

test('TypeORM no crea, borra, sincroniza ni migra objetos automáticamente', () => {
  const options = databaseOptions(readDatabaseConfig({}))
  assert.equal(options.synchronize, false)
  assert.equal(options.dropSchema, false)
  assert.equal(options.migrationsRun, false)
  assert.equal(options.logging, false)
  if (options.type !== 'postgres') throw new Error('Motor inesperado')
  assert.equal(options.installExtensions, false)
  assert.deepEqual(options.invalidWhereValuesBehavior, { null: 'throw', undefined: 'throw' })
})

test('mapea nombres del backup y no selecciona password_hash por defecto', () => {
  assert.equal(UserSchema.options.tableName, 'app_user')
  assert.equal(UserSchema.options.columns.email?.type, 'citext')
  assert.equal(UserSchema.options.columns.passwordHash?.name, 'password_hash')
  assert.equal(UserSchema.options.columns.passwordHash?.select, false)
  assert.equal(UserProfileSchema.options.tableName, 'user_profile')
  assert.equal(UserProfileSchema.options.columns.userId?.name, 'user_id')
  assert.equal(UserProfileSchema.options.columns.userId?.primary, true)
})
