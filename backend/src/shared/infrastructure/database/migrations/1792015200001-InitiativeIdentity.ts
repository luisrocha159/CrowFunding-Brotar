import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Identidad canónica separada del contenido promocional, sin modificar tablas oficiales. */
export class InitiativeIdentity1792015200001 implements MigrationInterface {
  name = 'InitiativeIdentity1792015200001'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE SCHEMA IF NOT EXISTS brotar_extension;
      CREATE TABLE brotar_extension.initiative (
        id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(),
        owner_user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
        organization_id uuid REFERENCES public.organization(id),
        name varchar(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 5 AND 200),
        purpose text NOT NULL CHECK(length(btrim(purpose)) BETWEEN 20 AND 5000),
        country_code char(2) NOT NULL REFERENCES public.country(code),
        locality varchar(160) NOT NULL CHECK(length(btrim(locality)) BETWEEN 2 AND 160),
        site_reference varchar(500) NOT NULL CHECK(length(btrim(site_reference)) BETWEEN 5 AND 500),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE brotar_extension.initiative_stage (
        id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(),
        initiative_id uuid NOT NULL REFERENCES brotar_extension.initiative(id) ON DELETE CASCADE,
        name varchar(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 5 AND 200),
        objective text NOT NULL CHECK(length(btrim(objective)) BETWEEN 20 AND 5000),
        starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on),
        UNIQUE(initiative_id,name)
      );
      CREATE TABLE brotar_extension.campaign_identity (
        campaign_id uuid PRIMARY KEY REFERENCES public.campaign(id) ON DELETE CASCADE,
        stage_id uuid NOT NULL REFERENCES brotar_extension.initiative_stage(id),
        UNIQUE(campaign_id,stage_id)
      );
      CREATE INDEX campaign_identity_stage_idx ON brotar_extension.campaign_identity(stage_id);
      CREATE TABLE brotar_extension.stage_claim (
        stage_id uuid PRIMARY KEY,
        campaign_id uuid NOT NULL UNIQUE,
        claimed_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY(campaign_id,stage_id) REFERENCES brotar_extension.campaign_identity(campaign_id,stage_id) ON DELETE CASCADE
      );
      CREATE TABLE brotar_extension.request_idempotency (
        actor_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
        request_key uuid NOT NULL,
        request_hash char(64) NOT NULL,
        campaign_id uuid NOT NULL REFERENCES public.campaign(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(actor_id,request_key)
      );
      CREATE TABLE brotar_extension.rate_bucket (
        key_hash char(64) PRIMARY KEY, requests integer NOT NULL CHECK(requests>0),
        expires_at timestamptz NOT NULL
      );
      CREATE INDEX rate_bucket_expiry_idx ON brotar_extension.rate_bucket(expires_at);
      CREATE INDEX campaign_location_locality_trgm_idx ON public.campaign_location USING gin(locality public.gin_trgm_ops);
      CREATE INDEX campaign_story_solution_trgm_idx ON public.campaign_story USING gin(solution public.gin_trgm_ops);
      GRANT USAGE ON SCHEMA brotar_extension TO brotar_app;
      GRANT SELECT,INSERT ON brotar_extension.initiative,brotar_extension.initiative_stage TO brotar_app;
      GRANT SELECT,INSERT,UPDATE ON brotar_extension.campaign_identity,brotar_extension.rate_bucket TO brotar_app;
      GRANT SELECT,INSERT ON brotar_extension.request_idempotency TO brotar_app;
      GRANT SELECT,INSERT,DELETE ON brotar_extension.stage_claim TO brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('La identidad de iniciativas no se elimina automáticamente: perdería vínculos y evidencia. Recupera un respaldo o prepara una migración de conservación.') }
}
