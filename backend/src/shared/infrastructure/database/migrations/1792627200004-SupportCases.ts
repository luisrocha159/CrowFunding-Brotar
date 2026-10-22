import type { MigrationInterface, QueryRunner } from 'typeorm'
export class SupportCases1792627200004 implements MigrationInterface {
  name = 'SupportCases1792627200004'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE brotar_extension.support_case_context (
      case_id uuid PRIMARY KEY REFERENCES public.support_case(id) ON DELETE RESTRICT,
      user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE RESTRICT,
      contribution_id uuid REFERENCES public.contribution(id) ON DELETE RESTRICT,
      request_id uuid NOT NULL, request_hash char(64) NOT NULL,
      UNIQUE(user_id,request_id));
      CREATE TABLE brotar_extension.support_case_evidence (
        case_id uuid NOT NULL REFERENCES public.support_case(id) ON DELETE RESTRICT,
        file_id uuid NOT NULL REFERENCES public.file_asset(id) ON DELETE RESTRICT,
        display_order smallint NOT NULL CHECK(display_order BETWEEN 0 AND 9),
        PRIMARY KEY(case_id,file_id), UNIQUE(case_id,display_order));
      CREATE INDEX support_case_user_created_idx ON public.support_case(user_id,created_at DESC,id DESC);
      GRANT SELECT,INSERT ON public.support_case, brotar_extension.support_case_context, brotar_extension.support_case_evidence TO brotar_app;
      GRANT SELECT ON public.support_case_message,public.contribution TO brotar_app;
      GRANT USAGE ON SEQUENCE public.support_case_number_seq TO brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('El soporte no se revierte automáticamente: conservar casos, contexto y evidencias; preparar reversión revisada sin borrar historial.') }
}
