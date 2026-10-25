import type { MigrationInterface, QueryRunner } from 'typeorm'
export class ContributionRead1792627200002 implements MigrationInterface {
  name = 'ContributionRead1792627200002'
  async up(runner: QueryRunner) {
    await runner.query(`GRANT SELECT ON public.contribution,public.payment,public.payment_provider,public.payment_method,public.refund,public.dispute,public.support_case TO brotar_app;
      GRANT SELECT ON public.v_reward_availability TO brotar_app;
      CREATE SCHEMA IF NOT EXISTS brotar_extension;
      CREATE TABLE brotar_extension.support_simulation (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE RESTRICT,
        request_id uuid NOT NULL, campaign_id uuid NOT NULL REFERENCES public.campaign(id) ON DELETE RESTRICT,
        campaign_title varchar(200) NOT NULL, reward_id uuid REFERENCES public.reward(id) ON DELETE RESTRICT, reward_title varchar(200),
        amount numeric(14,2) NOT NULL CHECK(amount>0), currency_code char(3) NOT NULL,
        method varchar(20) NOT NULL CHECK(method IN ('TEST_QR','TEST_CARD')),
        state varchar(20) NOT NULL DEFAULT 'INITIATED' CHECK(state IN ('INITIATED','PENDING','CONFIRMED','FAILED','EXPIRED')),
        version integer NOT NULL DEFAULT 1 CHECK(version>0), attempts integer NOT NULL DEFAULT 1 CHECK(attempts>0),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_id)
      );
      COMMENT ON TABLE brotar_extension.support_simulation IS 'SIMULATION ONLY: no contribution, payment, reservation, charge or financial confirmation';
      GRANT USAGE ON SCHEMA brotar_extension TO brotar_app;
      GRANT SELECT,INSERT,UPDATE ON brotar_extension.support_simulation TO brotar_app;
      CREATE INDEX support_simulation_user_created_idx ON brotar_extension.support_simulation(user_id,created_at DESC,id DESC);
      CREATE INDEX contribution_user_created_idx ON public.contribution(user_id,created_at DESC,id DESC);`)
  }
  async down(): Promise<void> { throw new Error('El historial financiero no se revierte automáticamente; preparar una migración revisada para conservar datos y revertir permisos o índices.') }
}
