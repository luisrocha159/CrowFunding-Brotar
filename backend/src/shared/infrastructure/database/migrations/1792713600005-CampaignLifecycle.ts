import type {MigrationInterface,QueryRunner} from 'typeorm'
export class CampaignLifecycle1792713600005 implements MigrationInterface {
 name='CampaignLifecycle1792713600005'
 async up(r:QueryRunner){
  for(const [code,roles] of [['campaign.lifecycle.read',['ADMIN','FINANCE','REVIEWER','AUDITOR']],['campaign.lifecycle.manage',['ADMIN']],['campaign.manage.own',['CREATOR']]] as const){
   await r.query(`INSERT INTO public.permission(code,resource,action,description) VALUES($1,$1,'access','Ciclo DEMO explícito del equipo') ON CONFLICT(code) DO NOTHING`,[code])
   await r.query(`INSERT INTO public.role_permission(role_id,permission_id) SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p WHERE r.code=ANY($1::text[]) AND p.code=$2 ON CONFLICT DO NOTHING`,[[...roles],code])
  }
  await r.query(`CREATE TABLE brotar_extension.campaign_cycle (
   campaign_id uuid PRIMARY KEY REFERENCES public.campaign(id),version integer NOT NULL DEFAULT 1 CHECK(version>0),
   outcome varchar(30) NOT NULL DEFAULT 'PENDING' CHECK(outcome IN ('PENDING','EXECUTION_ELIGIBLE','REFUND_REQUIRED','NO_FUNDS')),
   funding_total numeric(16,2),cancel_requested_by uuid REFERENCES public.app_user(id),cancel_reason varchar(500),
   cancellation_case_id uuid REFERENCES public.support_case(id),execution_started_at timestamptz,
   CHECK((cancel_requested_by IS NULL)=(cancel_reason IS NULL)));
  CREATE TABLE brotar_extension.campaign_cycle_event (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES public.campaign(id),actor_id uuid REFERENCES public.app_user(id),
   action varchar(30) NOT NULL,previous_status public.campaign_status NOT NULL,status public.campaign_status NOT NULL,
   request_key char(64) NOT NULL UNIQUE,request_hash char(64) NOT NULL,reason varchar(500) NOT NULL CHECK(char_length(trim(reason)) BETWEEN 20 AND 500),
   recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
  CREATE INDEX campaign_cycle_history_idx ON brotar_extension.campaign_cycle_event(campaign_id,recorded_at,id);
  GRANT SELECT,INSERT ON brotar_extension.campaign_cycle,brotar_extension.campaign_cycle_event TO brotar_app;
  GRANT UPDATE ON brotar_extension.campaign_cycle TO brotar_app;
  GRANT SELECT ON public.accountability_report,public.accountability_expense,public.reward_fulfillment TO brotar_app;
  GRANT UPDATE(status,funding_ended_at,closed_at,cancelled_at,cancellation_reason,updated_at) ON public.campaign TO brotar_app;
  REVOKE UPDATE,DELETE ON brotar_extension.campaign_cycle_event FROM brotar_app;`)
 }
 async down():Promise<void>{throw new Error('El ciclo no se revierte automáticamente; preservar estados, obligaciones e historial.')}
}
