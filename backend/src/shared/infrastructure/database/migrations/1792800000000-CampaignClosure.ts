import type {MigrationInterface,QueryRunner} from 'typeorm'
export class CampaignClosure1792800000000 implements MigrationInterface {
 name='CampaignClosure1792800000000'
 async up(r:QueryRunner){
  for(const [code,roles] of [['campaign.closure.read',['ADMIN','REVIEWER','SUPPORT','FINANCE','AUDITOR']],['campaign.closure.review',['REVIEWER','ADMIN']]] as const){
   await r.query(`INSERT INTO public.permission(code,resource,action,description) VALUES($1,$1,'access','Cierre mínimo DEMO con evidencias, sin logística ni legal real') ON CONFLICT(code) DO NOTHING`,[code])
   await r.query(`INSERT INTO public.role_permission(role_id,permission_id) SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p WHERE r.code=ANY($1::text[]) AND p.code=$2 ON CONFLICT DO NOTHING`,[[...roles],code])
  }
  await r.query(`CREATE TABLE brotar_extension.campaign_final_report(
   report_id uuid PRIMARY KEY REFERENCES public.accountability_report(id) ON DELETE CASCADE,
   campaign_id uuid NOT NULL REFERENCES public.campaign(id),progress_hash char(32) NOT NULL);
  CREATE INDEX campaign_final_report_campaign_idx ON brotar_extension.campaign_final_report(campaign_id);
  CREATE TABLE brotar_extension.campaign_reward_evidence(
   contribution_id uuid PRIMARY KEY REFERENCES public.contribution(id) ON DELETE CASCADE,
   file_id uuid NOT NULL REFERENCES public.file_asset(id),recorded_by uuid NOT NULL REFERENCES public.app_user(id),
   recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
  GRANT SELECT,INSERT ON brotar_extension.campaign_final_report,brotar_extension.campaign_reward_evidence,public.accountability_report,public.accountability_expense,public.reward_fulfillment TO brotar_app;
  GRANT UPDATE(status,reviewed_by,reviewed_at,updated_at) ON public.accountability_report TO brotar_app;
  GRANT UPDATE(status,fulfilled_by,fulfilled_at,notes,updated_at) ON public.reward_fulfillment TO brotar_app;
  REVOKE UPDATE,DELETE ON brotar_extension.campaign_final_report,brotar_extension.campaign_reward_evidence FROM brotar_app;`)
 }
 async down():Promise<void>{throw new Error('El cierre no se revierte automáticamente; conservar rendiciones y evidencias, sin reversión destructiva.')}
}
