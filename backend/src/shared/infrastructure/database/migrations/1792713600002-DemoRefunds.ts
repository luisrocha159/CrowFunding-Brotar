import type {MigrationInterface,QueryRunner} from 'typeorm'
export class DemoRefunds1792713600002 implements MigrationInterface {
 name='DemoRefunds1792713600002'
 async up(r:QueryRunner){await r.query(`CREATE TABLE brotar_extension.demo_refund (
  refund_id uuid PRIMARY KEY REFERENCES public.refund(id) ON DELETE RESTRICT,
  request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,version integer NOT NULL DEFAULT 1 CHECK(version>0),
  dispute_id uuid REFERENCES public.dispute(id) ON DELETE RESTRICT);
  CREATE TABLE brotar_extension.demo_refund_event (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),refund_id uuid NOT NULL REFERENCES public.refund(id) ON DELETE RESTRICT,
   actor_id uuid REFERENCES public.app_user(id) ON DELETE SET NULL,action varchar(30) NOT NULL CHECK(action IN ('REQUEST','AUTHORIZE','REJECT','COMPLETE_DEMO','FAIL_DEMO')),
   previous_status public.refund_status,status public.refund_status NOT NULL,
   request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,
   reason varchar(500) NOT NULL CHECK(char_length(trim(reason)) BETWEEN 20 AND 500),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
  CREATE INDEX demo_refund_event_case_idx ON brotar_extension.demo_refund_event(refund_id,recorded_at,id);
  CREATE UNIQUE INDEX brotar_refund_external_reference_uq ON public.refund(external_reference) WHERE external_reference IS NOT NULL AND provider_payload->>'mode'='DEMO';
  CREATE UNIQUE INDEX brotar_refund_one_open_demo_uq ON public.refund(payment_id) WHERE status IN ('REQUESTED','PROCESSING') AND provider_payload->>'mode'='DEMO';
  GRANT SELECT,INSERT ON public.refund,brotar_extension.demo_refund,brotar_extension.demo_refund_event TO brotar_app;
  GRANT UPDATE(status,approved_by,processed_at,completed_at,failure_message,external_reference,provider_payload) ON public.refund TO brotar_app;
  GRANT UPDATE(version) ON brotar_extension.demo_refund TO brotar_app;
  REVOKE UPDATE,DELETE ON brotar_extension.demo_refund_event FROM brotar_app;`)}
 async down():Promise<void>{throw new Error('La devolución no se revierte automáticamente; conservar estados, referencias y eventos.')}
}
