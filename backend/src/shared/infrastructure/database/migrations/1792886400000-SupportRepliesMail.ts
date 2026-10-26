import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Respuestas reintentables y avisos transaccionales; no se reenvía historial anterior. */
export class SupportRepliesMail1792886400000 implements MigrationInterface {
  name = 'SupportRepliesMail1792886400000'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE brotar_extension.support_reply_request (
      user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
      request_id uuid NOT NULL, request_hash char(64) NOT NULL,
      case_id uuid NOT NULL REFERENCES public.support_case(id) ON DELETE CASCADE,
      message_id uuid NOT NULL UNIQUE REFERENCES public.support_case_message(id) ON DELETE CASCADE,
      PRIMARY KEY(user_id,request_id)
    );
    CREATE TABLE brotar_extension.support_mail_event (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id uuid NOT NULL REFERENCES public.support_case(id) ON DELETE CASCADE,
      recipient_user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
      kind varchar(10) NOT NULL CHECK(kind IN ('MESSAGE','STATUS')),
      status public.support_case_status NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(), processed_at timestamptz,
      notification_id uuid UNIQUE REFERENCES public.notification(id) ON DELETE SET NULL,
      CHECK(notification_id IS NULL OR processed_at IS NOT NULL)
    );
    CREATE INDEX support_mail_pending_idx ON brotar_extension.support_mail_event(created_at,id) WHERE processed_at IS NULL;
    GRANT SELECT,INSERT ON brotar_extension.support_reply_request,brotar_extension.support_mail_event TO brotar_app;
    GRANT UPDATE(notification_id,processed_at) ON brotar_extension.support_mail_event TO brotar_app;
    REVOKE DELETE ON brotar_extension.support_reply_request,brotar_extension.support_mail_event FROM brotar_app;`)
  }
  async down(): Promise<void> {
    throw new Error('El soporte no se revierte automáticamente; conservar mensajes, claves y entregas de correo.')
  }
}
