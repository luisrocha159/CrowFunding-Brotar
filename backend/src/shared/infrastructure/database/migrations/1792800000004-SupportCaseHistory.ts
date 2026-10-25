import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Preserva los motivos de cambio de estado de soporte sin alterar casos existentes. */
export class SupportCaseHistory1792800000004 implements MigrationInterface {
  name = 'SupportCaseHistory1792800000004'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE brotar_extension.support_case_event (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id uuid NOT NULL REFERENCES public.support_case(id) ON DELETE RESTRICT,
      actor_user_id uuid REFERENCES public.app_user(id) ON DELETE SET NULL,
      previous_status public.support_case_status NOT NULL,
      status public.support_case_status NOT NULL,
      reason varchar(500) NOT NULL CHECK(char_length(trim(reason)) BETWEEN 10 AND 500),
      recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      CHECK(previous_status <> status)
    );
    CREATE INDEX support_case_event_history_idx ON brotar_extension.support_case_event(case_id,recorded_at,id);
    GRANT SELECT,INSERT ON brotar_extension.support_case_event TO brotar_app;
    REVOKE UPDATE,DELETE ON brotar_extension.support_case_event FROM brotar_app;`)
  }
  async down(): Promise<void> {
    throw new Error('El historial de soporte no se elimina automáticamente; conservar motivos y cambios registrados.')
  }
}
