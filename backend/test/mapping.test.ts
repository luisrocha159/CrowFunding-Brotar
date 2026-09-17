import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { DataSource } from 'typeorm'
import { databaseOptions } from '../src/shared/infrastructure/database/data-source'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { UserProfileSchema, UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { SessionTokenSchema } from '../src/auth/infrastructure/session-token.schema'

class MetadataOnlySource extends DataSource {
  async inspectMapping(): Promise<void> { await this.buildMetadatas() }
}

test('TypeORM valida usuarios, perfiles y tokens sin conectarse ni ejecutar DDL', async () => {
  const source = new MetadataOnlySource(databaseOptions(readDatabaseConfig({})))
  await source.inspectMapping()
  assert.equal(source.isInitialized, false)
  assert.equal(source.getMetadata(UserSchema).columns.length, 15)
  assert.equal(source.getMetadata(UserProfileSchema).columns.length, 15)
  assert.equal(source.getMetadata(SessionTokenSchema).columns.length, 10)
  assert.equal(source.getMetadata(SessionTokenSchema).findColumnWithPropertyName('tokenHash')?.isSelect, false)
  assert.equal(source.getMetadata(UserSchema).findColumnWithPropertyName('passwordHash')?.isSelect, false)
})
