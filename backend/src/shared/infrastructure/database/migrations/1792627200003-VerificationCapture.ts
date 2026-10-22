import type { MigrationInterface, QueryRunner } from 'typeorm'
/** Capacidad técnica sin sembrar políticas de negocio, documentos ni textos legales. */
export class VerificationCapture1792627200003 implements MigrationInterface {
  name = 'VerificationCapture1792627200003'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE brotar_extension.verification_policy (
      verification_type_id uuid NOT NULL REFERENCES public.verification_type(id), version varchar(100) NOT NULL,
      definition jsonb NOT NULL CHECK (jsonb_typeof(definition)='object'), is_active boolean NOT NULL DEFAULT false,
      PRIMARY KEY(verification_type_id,version));
      CREATE UNIQUE INDEX verification_policy_active_uq ON brotar_extension.verification_policy(verification_type_id) WHERE is_active;
      CREATE TABLE brotar_extension.verification_revision (
        id uuid PRIMARY KEY, verification_id uuid NOT NULL REFERENCES public.verification(id), actor_user_id uuid NOT NULL REFERENCES public.app_user(id),
        operation varchar(20) NOT NULL CHECK(operation IN ('BEFORE_CHANGE','SAVE','SUBMIT')),
        snapshot jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
      CREATE INDEX verification_revision_case_idx ON brotar_extension.verification_revision(verification_id,recorded_at,id);
      GRANT SELECT ON brotar_extension.verification_policy TO brotar_app;
      GRANT SELECT, INSERT ON brotar_extension.verification_revision TO brotar_app;
      GRANT SELECT, INSERT, UPDATE ON public.verification TO brotar_app;
      GRANT SELECT, INSERT ON public.verification_document TO brotar_app;
      GRANT SELECT ON public.verification_type, public.document_type, public.payout_account, public.status_history TO brotar_app;
      GRANT UPDATE ON public.organization TO brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('La captura de verificación no se revierte automáticamente: conservar políticas, documentos y versiones; preparar una reversión revisada sin borrar datos.') }
}
