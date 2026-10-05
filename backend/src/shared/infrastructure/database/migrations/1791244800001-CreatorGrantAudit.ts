import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Habilitación provisional explícita por ADMIN; no cambia esquema oficial ni personas. */
export class CreatorGrantAudit1791244800001 implements MigrationInterface {
  name = 'CreatorGrantAudit1791244800001'
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('GRANT INSERT ON public.audit_log TO brotar_app')
    await queryRunner.query('GRANT USAGE ON SEQUENCE public.audit_log_id_seq TO brotar_app')
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('REVOKE INSERT ON public.audit_log FROM brotar_app')
    await queryRunner.query('REVOKE USAGE ON SEQUENCE public.audit_log_id_seq FROM brotar_app')
  }
}
