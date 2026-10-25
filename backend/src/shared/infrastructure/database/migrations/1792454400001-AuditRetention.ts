import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AuditRetention1792454400001 implements MigrationInterface {
  name = 'AuditRetention1792454400001'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE brotar_extension.audit_monthly (
      month_utc date NOT NULL CHECK (extract(day FROM month_utc)=1),
      action public.audit_action NOT NULL,
      event_count bigint NOT NULL CHECK(event_count>0),
      PRIMARY KEY(month_utc,action)
    );
    REVOKE ALL ON brotar_extension.audit_monthly FROM PUBLIC,brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('La retención no se revierte automáticamente: recuperar respaldo o preparar corrección revisada.') }
}
