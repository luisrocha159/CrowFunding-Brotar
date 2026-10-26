import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ContributionIntegrity1792368000001 implements MigrationInterface {
  name = 'ContributionIntegrity1792368000001'
  async up(runner: QueryRunner) {
    // Si existen referencias repetidas, la migración falla: nunca eliminar pagos para crear el índice.
    await runner.query(`CREATE UNIQUE INDEX brotar_payment_provider_reference_uq
      ON public.payment(provider_id,external_reference) WHERE external_reference IS NOT NULL`)
    await runner.query(`GRANT SELECT,INSERT,UPDATE ON public.contribution,public.payment TO brotar_app;
      GRANT SELECT,INSERT ON public.payment_event TO brotar_app;
      REVOKE UPDATE,DELETE ON public.payment_event FROM brotar_app;
      GRANT SELECT ON public.payment_provider,public.payment_method,public.v_reward_availability TO brotar_app;
      GRANT USAGE,SELECT ON SEQUENCE public.contribution_reference_seq,public.payment_event_id_seq TO brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('La integridad de pagos no se revierte automáticamente; preparar recuperación revisada.') }
}
