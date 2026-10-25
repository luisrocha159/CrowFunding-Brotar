import type {MigrationInterface,QueryRunner} from 'typeorm'
export class DemoDisbursements1792713600006 implements MigrationInterface {
 name='DemoDisbursements1792713600006'
 async up(r:QueryRunner){await r.query(`CREATE TABLE brotar_extension.demo_destination (
  payout_account_id uuid PRIMARY KEY REFERENCES public.payout_account(id),campaign_id uuid NOT NULL UNIQUE REFERENCES public.campaign(id),
  reference varchar(45) NOT NULL CHECK(reference ~ '^DEMO-[A-Z][A-Z_-]{2,39}$'),version integer NOT NULL DEFAULT 1 CHECK(version>0),
  submitted_by uuid NOT NULL REFERENCES public.app_user(id),review_reason varchar(500),request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL);
 CREATE TABLE brotar_extension.demo_destination_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payout_account_id uuid NOT NULL REFERENCES public.payout_account(id),actor_id uuid REFERENCES public.app_user(id),
  action varchar(20) NOT NULL,version integer NOT NULL,reason varchar(500) NOT NULL,reference varchar(45) NOT NULL,holder varchar(200) NOT NULL,
  request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
 CREATE TABLE brotar_extension.demo_disbursement (
  disbursement_id uuid PRIMARY KEY REFERENCES public.disbursement(id),requested_by uuid NOT NULL REFERENCES public.app_user(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),destination_version integer NOT NULL,destination_reference varchar(45) NOT NULL,destination_holder varchar(200) NOT NULL,
  executed_by uuid REFERENCES public.app_user(id),request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL);
 CREATE TABLE brotar_extension.demo_disbursement_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),disbursement_id uuid NOT NULL REFERENCES public.disbursement(id),actor_id uuid REFERENCES public.app_user(id),
  action varchar(30) NOT NULL,previous_status public.disbursement_status,status public.disbursement_status NOT NULL,
  request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,reason varchar(500) NOT NULL CHECK(char_length(trim(reason)) BETWEEN 20 AND 500),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
 CREATE INDEX demo_disbursement_history_idx ON brotar_extension.demo_disbursement_event(disbursement_id,recorded_at,id);
 CREATE UNIQUE INDEX brotar_demo_disbursement_reference_uq ON public.disbursement(external_reference) WHERE external_reference LIKE 'DEMO-DISBURSEMENT:%';
 GRANT SELECT,INSERT ON public.payout_account,public.disbursement,brotar_extension.demo_destination,brotar_extension.demo_destination_event,brotar_extension.demo_disbursement,brotar_extension.demo_disbursement_event TO brotar_app;
 GRANT USAGE ON SEQUENCE public.disbursement_number_seq TO brotar_app;
 GRANT UPDATE(account_holder_name,status,verified_by,verified_at,updated_at) ON public.payout_account TO brotar_app;
 GRANT UPDATE(reference,version,submitted_by,review_reason) ON brotar_extension.demo_destination TO brotar_app;
 GRANT UPDATE(status,authorized_by,authorized_at,external_reference,processed_at,completed_at,failure_message,updated_at) ON public.disbursement TO brotar_app;
 GRANT UPDATE(version,executed_by) ON brotar_extension.demo_disbursement TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.demo_destination_event,brotar_extension.demo_disbursement_event FROM brotar_app;`)}
 async down():Promise<void>{throw new Error('El desembolso no se revierte automáticamente; preservar destinos, movimientos y decisiones.')}
}
