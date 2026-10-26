import type {MigrationInterface, QueryRunner} from 'typeorm'

/** Cola separada: no altera tablas, funciones ni disparadores de la línea base. */
export class ContactMail1792800000002 implements MigrationInterface {
 name='ContactMail1792800000002'
 async up(r:QueryRunner) {
  await r.query(`
   CREATE TABLE brotar_extension.email_challenge (
    token_id uuid PRIMARY KEY REFERENCES public.user_token(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
    email public.citext NOT NULL, requested_at timestamptz NOT NULL DEFAULT clock_timestamp()
   );
   CREATE INDEX email_challenge_user_idx ON brotar_extension.email_challenge(user_id,requested_at);
   CREATE TABLE brotar_extension.mail_preference (
    user_id uuid PRIMARY KEY REFERENCES public.app_user(id) ON DELETE CASCADE,
    enabled boolean NOT NULL DEFAULT false, verified_email public.citext, updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
   );
   INSERT INTO brotar_extension.mail_preference(user_id,verified_email) SELECT id,email FROM public.app_user WHERE email_verified_at IS NOT NULL;
   CREATE TABLE brotar_extension.notification_source (history_id bigint PRIMARY KEY);
   -- No reenviar cambios históricos al instalar; los eventos posteriores se recogen una sola vez.
   INSERT INTO brotar_extension.notification_source SELECT id FROM public.status_history;
   CREATE TABLE brotar_extension.mail_delivery (
    notification_id uuid PRIMARY KEY REFERENCES public.notification(id) ON DELETE CASCADE,
    attempts smallint NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
    next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    lease_id uuid, leased_until timestamptz,
    result varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK(result IN ('QUEUED','RETRY','SMTP_ACCEPTED','FAILED','CANCELLED'))
   );
   GRANT SELECT,INSERT ON brotar_extension.email_challenge, brotar_extension.notification_source TO brotar_app;
   GRANT SELECT,INSERT,UPDATE ON brotar_extension.mail_preference,brotar_extension.mail_delivery TO brotar_app;
   GRANT SELECT,INSERT ON public.notification TO brotar_app;
   GRANT UPDATE(status,read_at,sent_at) ON public.notification TO brotar_app;
   GRANT UPDATE(email_verified_at) ON public.app_user TO brotar_app;
  `)
 }
 async down():Promise<void>{throw new Error('El correo no se revierte automáticamente: conservar tokens, preferencias y evidencias de entrega; preparar reversión explícita.')}
}
