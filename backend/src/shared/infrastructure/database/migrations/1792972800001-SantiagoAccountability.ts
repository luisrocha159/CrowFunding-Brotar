import type {MigrationInterface,QueryRunner} from 'typeorm'
export class SantiagoAccountability1792972800001 implements MigrationInterface {
 name='SantiagoAccountability1792972800001'
 async up(r:QueryRunner){await r.query(`
 CREATE TABLE brotar_extension.accountability_state(campaign_id uuid PRIMARY KEY REFERENCES public.campaign(id),version integer NOT NULL DEFAULT 1 CHECK(version>0));
 CREATE TABLE brotar_extension.accountability_document(id uuid PRIMARY KEY,campaign_id uuid NOT NULL REFERENCES public.campaign(id),current_report_id uuid NOT NULL REFERENCES public.accountability_report(id),created_by uuid NOT NULL REFERENCES public.app_user(id),UNIQUE(id,campaign_id));
 CREATE INDEX accountability_document_campaign_idx ON brotar_extension.accountability_document(campaign_id);
 CREATE TABLE brotar_extension.accountability_revision(report_id uuid PRIMARY KEY REFERENCES public.accountability_report(id),document_id uuid NOT NULL REFERENCES brotar_extension.accountability_document(id),version integer NOT NULL CHECK(version>0),UNIQUE(document_id,version));
 CREATE INDEX accountability_revision_document_idx ON brotar_extension.accountability_revision(document_id);
 CREATE TABLE brotar_extension.beneficiary_return(id uuid PRIMARY KEY,campaign_id uuid NOT NULL REFERENCES public.campaign(id),amount numeric(14,2) NOT NULL CHECK(amount>0),currency_code char(3) NOT NULL REFERENCES public.currency(code),status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','APPROVED','COMPLETED','REJECTED')),requested_by uuid NOT NULL REFERENCES public.app_user(id),request_file_id uuid NOT NULL REFERENCES public.file_asset(id),requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),authorized_by uuid REFERENCES public.app_user(id),authorized_at timestamptz,completed_by uuid REFERENCES public.app_user(id),completed_at timestamptz,completion_file_id uuid REFERENCES public.file_asset(id),CHECK(authorized_by IS NULL OR authorized_by<>requested_by),CHECK(completed_by IS NULL OR completed_by<>requested_by),FOREIGN KEY(campaign_id,currency_code) REFERENCES public.campaign(id,currency_code),CHECK(status<>'COMPLETED' OR (authorized_by IS NOT NULL AND completed_by IS NOT NULL AND completed_at IS NOT NULL AND completion_file_id IS NOT NULL)));
 CREATE INDEX beneficiary_return_campaign_idx ON brotar_extension.beneficiary_return(campaign_id,status);
 CREATE TABLE brotar_extension.accountability_event(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES public.campaign(id),version integer NOT NULL,actor_id uuid NOT NULL REFERENCES public.app_user(id),action text NOT NULL,reason text NOT NULL,request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,snapshot jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(campaign_id,version));
 CREATE INDEX accountability_event_campaign_idx ON brotar_extension.accountability_event(campaign_id,version DESC);
 GRANT SELECT,INSERT ON brotar_extension.accountability_state,brotar_extension.accountability_document,brotar_extension.accountability_revision,brotar_extension.beneficiary_return,brotar_extension.accountability_event TO brotar_app;
 GRANT UPDATE(version) ON brotar_extension.accountability_state TO brotar_app;
 GRANT UPDATE(current_report_id) ON brotar_extension.accountability_document TO brotar_app;
 GRANT UPDATE(status,authorized_by,authorized_at,completed_by,completed_at,completion_file_id) ON brotar_extension.beneficiary_return TO brotar_app;
 GRANT UPDATE(submitted_by,submitted_at) ON public.accountability_report TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.accountability_revision,brotar_extension.accountability_event FROM brotar_app;
 REVOKE DELETE ON brotar_extension.accountability_state,brotar_extension.accountability_document,brotar_extension.beneficiary_return FROM brotar_app;
 `)}
 async down():Promise<void>{throw new Error('Las rendiciones y devoluciones conservan su historia; reversión destructiva no autorizada.')}
}
