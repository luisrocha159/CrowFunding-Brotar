import type { MigrationInterface, QueryRunner } from 'typeorm'
export class CampaignProgress1792627200001 implements MigrationInterface {
  name = 'CampaignProgress1792627200001'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE brotar_extension.update_progress(update_id uuid PRIMARY KEY REFERENCES public.campaign_update(id) ON DELETE CASCADE,data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'));
      GRANT SELECT,INSERT ON brotar_extension.update_progress TO brotar_app;
      GRANT SELECT,INSERT,UPDATE ON public.campaign_update TO brotar_app;
      GRANT UPDATE ON public.campaign_activity,public.milestone,public.campaign_impact_indicator TO brotar_app;
      GRANT SELECT ON public.v_campaign_funding,public.accountability_report,public.accountability_expense TO brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('El historial de avances no se revierte automáticamente; conservar publicaciones y evidencias.') }
}
