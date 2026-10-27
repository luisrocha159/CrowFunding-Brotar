import type { MigrationInterface, QueryRunner } from 'typeorm'
export class SantiagoProgress1792972800000 implements MigrationInterface {
  name = 'SantiagoProgress1792972800000'
  async up(r: QueryRunner) {
    await r.query(`CREATE TABLE brotar_extension.update_version (
      update_id uuid PRIMARY KEY REFERENCES public.campaign_update(id) ON DELETE CASCADE,
      version integer NOT NULL DEFAULT 1 CHECK(version>0), withdrawn_at timestamptz);
    CREATE TABLE brotar_extension.update_history (
      update_id uuid NOT NULL REFERENCES public.campaign_update(id) ON DELETE CASCADE,
      version integer NOT NULL CHECK(version>0), action text NOT NULL CHECK(action IN ('PUBLISHED','CORRECTED','WITHDRAWN')),
      actor_id uuid NOT NULL REFERENCES public.app_user(id), reason text NOT NULL,
      snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      PRIMARY KEY(update_id,version));
    CREATE TABLE brotar_extension.reward_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contribution_id uuid NOT NULL REFERENCES public.contribution(id) ON DELETE CASCADE,
      actor_id uuid NOT NULL REFERENCES public.app_user(id), reason text NOT NULL,
      snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
    CREATE INDEX reward_history_contribution_idx ON brotar_extension.reward_history(contribution_id,recorded_at,id);
    GRANT SELECT,INSERT,UPDATE ON brotar_extension.update_version TO brotar_app;
    GRANT SELECT,INSERT ON brotar_extension.update_history,brotar_extension.reward_history TO brotar_app;
    REVOKE UPDATE,DELETE ON brotar_extension.update_history,brotar_extension.reward_history FROM brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('Conservar versiones, retiros e historial de recompensas; no hay reversión destructiva automática.') }
}
