import 'reflect-metadata'
import { DataSource, type DataSourceOptions } from 'typeorm'
import { UserProfileSchema, UserSchema } from '../../../users/infrastructure/persistence/user.schemas'
import type { DatabaseConfig } from './database.config'
import { SessionTokenSchema } from '../../../auth/infrastructure/session-token.schema'

export function databaseOptions(config: DatabaseConfig): DataSourceOptions {
  return {
    type: 'postgres', host: config.host, port: config.port,
    database: config.database, username: config.username, password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: true } : false,
    schema: 'public',
    entities: [UserSchema, UserProfileSchema, SessionTokenSchema],
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    installExtensions: false,
    migrations: [],
    logging: false,
    connectTimeoutMS: 3000,
    extra: { max: 5, idleTimeoutMillis: 30000, statement_timeout: 5000 },
    invalidWhereValuesBehavior: { null: 'throw', undefined: 'throw' }
  }
}

export function createDataSource(config: DatabaseConfig): DataSource {
  return new DataSource(databaseOptions(config))
}
