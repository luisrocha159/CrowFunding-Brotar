import type { MigrationInterface, QueryRunner } from 'typeorm'

// Tablas que el resto del proyecto asume presentes; coincide con requiredTables de infra/postgres/verify.sql.
const REQUIRED_TABLES = [
  'app_user', 'user_profile', 'role', 'permission', 'role_permission',
  'user_role', 'user_token', 'organization', 'organization_member', 'organization_type'
] as const

const REQUIRED_EXTENSIONS = ['citext', 'pg_trgm'] as const

/**
 * Línea base del esquema oficial V2 (infra/postgres-v2/baseline.json,
 * SHA-256 5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88).
 *
 * No crea, altera ni elimina objetos. Solo deja constancia de que la instalación
 * restaurada es el punto de partida de las migraciones propias del proyecto, y
 * falla si se ejecuta sobre una base que no es esa línea base: sin esta comprobación
 * una base vacía quedaría marcada como migrada sin tener el esquema.
 */
export class BaselineProvisionalV21789948800000 implements MigrationInterface {
  name = 'BaselineProvisionalV21789948800000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const missingTables: { name: string }[] = await queryRunner.query(
      `SELECT t.name FROM unnest($1::text[]) AS t(name)
       WHERE to_regclass('public.' || quote_ident(t.name)) IS NULL`,
      [[...REQUIRED_TABLES]]
    )
    if (missingTables.length > 0) {
      throw new Error(
        `La línea base no está instalada: faltan ${missingTables.map((row) => row.name).join(', ')}. ` +
        'Restaura el SQL oficial antes de migrar; no se marca como migrada una base incompleta.'
      )
    }

    const missingExtensions: { name: string }[] = await queryRunner.query(
      `SELECT e.name FROM unnest($1::text[]) AS e(name)
       WHERE NOT EXISTS (SELECT 1 FROM pg_extension x WHERE x.extname = e.name)`,
      [[...REQUIRED_EXTENSIONS]]
    )
    if (missingExtensions.length > 0) {
      throw new Error(
        `Faltan extensiones de la línea base: ${missingExtensions.map((row) => row.name).join(', ')}.`
      )
    }
  }

  async down(): Promise<void> {
    throw new Error(
      'La línea base no se revierte: no la creó este mecanismo, sino la restauración del SQL oficial. ' +
      'Para volver atrás se recupera un respaldo, según infra/postgres-v2/MIGRACIONES.md.'
    )
  }
}
