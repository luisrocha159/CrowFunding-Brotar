import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AuditRead1792368000003 implements MigrationInterface {
  name='AuditRead1792368000003'
  async up(runner: QueryRunner) {
    await runner.query(`GRANT SELECT,INSERT ON public.audit_log TO brotar_app;
      GRANT SELECT ON public.status_history TO brotar_app;
      GRANT USAGE ON SEQUENCE public.audit_log_id_seq TO brotar_app;
      REVOKE UPDATE,DELETE ON public.audit_log FROM brotar_app;`)
  }
  async down(): Promise<void> {throw new Error('La auditoría no se revierte automáticamente; preparar recuperación revisada.')}
}
