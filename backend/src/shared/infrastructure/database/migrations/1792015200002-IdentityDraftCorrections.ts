import type { MigrationInterface, QueryRunner } from 'typeorm'
export class IdentityDraftCorrections1792015200002 implements MigrationInterface {
  name = 'IdentityDraftCorrections1792015200002'
  async up(runner: QueryRunner) {
    await runner.query(`GRANT UPDATE ON brotar_extension.initiative,brotar_extension.initiative_stage TO brotar_app;
      GRANT DELETE ON brotar_extension.rate_bucket TO brotar_app;
      CREATE UNIQUE INDEX initiative_stage_name_normalized_idx ON brotar_extension.initiative_stage(initiative_id,lower(btrim(name)));
      CREATE INDEX campaign_location_exact_idx ON public.campaign_location(country_code,lower(btrim(locality)));`)
  }
  async down(): Promise<void> { throw new Error('La corrección de identidad no se revierte automáticamente: conserva la restricción y los datos; prepara una migración revisada.') }
}
