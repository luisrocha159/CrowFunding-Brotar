import 'reflect-metadata'
import { DataSource, type DataSourceOptions } from 'typeorm'
import type { MigrationConfig } from './migration.config'
import { BaselineProvisionalV21789948800000 } from './migrations/1789948800000-BaselineProvisionalV2'

// Orden explícito: no se descubren por glob para que el contenido aplicado sea revisable en el repositorio.
export const MIGRATIONS = [BaselineProvisionalV21789948800000]

// Nombre propio: el esquema oficial trae sus propias tablas y no se invade con el genérico "migrations".
export const MIGRATIONS_TABLE = 'schema_migration_brotar'

// Esquema aparte: dentro de public la tabla de control alteraría el inventario de la línea base
// (59 tablas) y haría fallar verify-provisional-v2. El manifiesto no se ajusta para silenciarlo.
export const MIGRATIONS_SCHEMA = 'brotar_migration'

export function migrationDataSourceOptions(config: MigrationConfig): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: false,
    // Esquema por defecto de la conexión de migración; las migraciones nombran public explícitamente.
    schema: MIGRATIONS_SCHEMA,
    // Sin entidades: una migración no depende del mapeo actual de la API.
    entities: [],
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    installExtensions: false,
    migrations: MIGRATIONS,
    migrationsTableName: MIGRATIONS_TABLE,
    migrationsTransactionMode: 'each',
    logging: false,
    connectTimeoutMS: 5000,
    extra: { max: 1 }
  }
}

export function createMigrationDataSource(config: MigrationConfig): DataSource {
  return new DataSource(migrationDataSourceOptions(config))
}
