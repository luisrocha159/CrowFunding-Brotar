import type {MigrationInterface,QueryRunner} from 'typeorm'
export class MonthlyPublicAccountability1793145600001 implements MigrationInterface {
 name='MonthlyPublicAccountability1793145600001'
 async up(r:QueryRunner){await r.query(`
 ALTER TABLE brotar_extension.accountability_document ADD COLUMN reporting_month char(7) CHECK(reporting_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$');
 CREATE UNIQUE INDEX accountability_document_month ON brotar_extension.accountability_document(campaign_id,reporting_month) WHERE reporting_month IS NOT NULL;
 CREATE TABLE brotar_extension.accountability_publication(
  report_id uuid PRIMARY KEY REFERENCES public.accountability_report(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaign(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),published_by uuid NOT NULL REFERENCES public.app_user(id),published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  withdrawn_by uuid REFERENCES public.app_user(id),withdrawn_at timestamptz,version int NOT NULL DEFAULT 1 CHECK(version IN (1,2)),
  CHECK((withdrawn_at IS NULL AND withdrawn_by IS NULL AND version=1) OR (withdrawn_at IS NOT NULL AND withdrawn_by IS NOT NULL AND version=2)));
 CREATE TABLE brotar_extension.accountability_publication_event(
  id uuid PRIMARY KEY,report_id uuid NOT NULL REFERENCES public.accountability_report(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.app_user(id),action text NOT NULL CHECK(action IN ('PUBLISH','WITHDRAW')),reason text NOT NULL,
  request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
 CREATE INDEX accountability_publication_campaign ON brotar_extension.accountability_publication(campaign_id,published_at DESC,report_id);
 GRANT SELECT,INSERT ON brotar_extension.accountability_publication,brotar_extension.accountability_publication_event TO brotar_app;
 GRANT UPDATE(withdrawn_by,withdrawn_at,version) ON brotar_extension.accountability_publication TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.accountability_publication_event FROM brotar_app;`)}
 async down():Promise<void>{throw new Error('El historial de rendición pública no se revierte automáticamente; conservar consentimientos e historial.')}
}
