import type {MigrationInterface,QueryRunner} from 'typeorm'
export class DemoDisputes1792713600004 implements MigrationInterface{
 name='DemoDisputes1792713600004'
 async up(r:QueryRunner){await r.query(`CREATE TABLE brotar_extension.demo_dispute(
  dispute_id uuid PRIMARY KEY REFERENCES public.dispute(id) ON DELETE RESTRICT,
  support_case_id uuid NOT NULL UNIQUE REFERENCES public.support_case(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payment(id) ON DELETE RESTRICT,
  request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,version integer NOT NULL DEFAULT 1 CHECK(version>0),
  financial_hold boolean NOT NULL DEFAULT true,hold_amount numeric(14,2) NOT NULL CHECK(hold_amount>0),
  resolution_code varchar(30) CHECK(resolution_code IN ('NO_REFUND','REFUND_RECOMMENDED')),
  recommended_amount numeric(14,2) CHECK(recommended_amount>0),
  linked_refund_id uuid REFERENCES public.refund(id) ON DELETE RESTRICT);
 CREATE UNIQUE INDEX demo_dispute_one_hold_idx ON brotar_extension.demo_dispute(payment_id) WHERE financial_hold;
 CREATE TABLE brotar_extension.demo_dispute_event(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dispute_id uuid NOT NULL REFERENCES public.dispute(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.app_user(id) ON DELETE SET NULL,action varchar(40) NOT NULL,
  previous_status public.dispute_status,status public.dispute_status NOT NULL,
  request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,
  reason varchar(500) NOT NULL CHECK(char_length(trim(reason)) BETWEEN 20 AND 500),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
 CREATE INDEX demo_dispute_event_history_idx ON brotar_extension.demo_dispute_event(dispute_id,recorded_at,id);
 CREATE TABLE brotar_extension.demo_dispute_message(
  message_id uuid PRIMARY KEY REFERENCES public.support_case_message(id) ON DELETE RESTRICT,
  dispute_id uuid NOT NULL REFERENCES public.dispute(id) ON DELETE RESTRICT,request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL);
 GRANT SELECT,INSERT ON public.dispute,public.support_case_message,brotar_extension.demo_dispute,brotar_extension.demo_dispute_event,brotar_extension.demo_dispute_message TO brotar_app;
 GRANT USAGE ON SEQUENCE public.dispute_number_seq TO brotar_app;
 GRANT UPDATE(status,assigned_to,resolution,resolved_at,closed_at,updated_at) ON public.dispute TO brotar_app;
 GRANT UPDATE(status,priority,assigned_to,resolved_at,closed_at,updated_at) ON public.support_case TO brotar_app;
 GRANT UPDATE(version,financial_hold,hold_amount,resolution_code,recommended_amount,linked_refund_id) ON brotar_extension.demo_dispute TO brotar_app;
 GRANT UPDATE(dispute_id) ON brotar_extension.demo_refund TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.demo_dispute_event,brotar_extension.demo_dispute_message,public.support_case_message FROM brotar_app;`)}
 async down():Promise<void>{throw new Error('La disputa no se revierte automáticamente; conservar expedientes, reservas, mensajes y decisiones, y preparar una reversión revisada.')}
}
