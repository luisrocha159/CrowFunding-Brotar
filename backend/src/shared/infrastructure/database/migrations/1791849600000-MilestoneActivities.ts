import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Extensión del equipo: varios vínculos por hito, sin reescribir el SQL oficial. */
export class MilestoneActivities1791849600000 implements MigrationInterface {
  name = 'MilestoneActivities1791849600000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS brotar_extension;
      CREATE TABLE IF NOT EXISTS brotar_extension.milestone_activity (
        milestone_id uuid NOT NULL REFERENCES public.milestone(id) ON DELETE CASCADE,
        activity_id uuid NOT NULL REFERENCES public.campaign_activity(id) ON DELETE CASCADE,
        PRIMARY KEY (milestone_id,activity_id)
      );
      CREATE INDEX IF NOT EXISTS milestone_activity_activity_idx ON brotar_extension.milestone_activity(activity_id);
      CREATE OR REPLACE FUNCTION brotar_extension.check_milestone_activity_campaign() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.milestone m JOIN public.campaign_activity a ON a.campaign_id=m.campaign_id
          WHERE m.id=NEW.milestone_id AND a.id=NEW.activity_id) THEN
          RAISE EXCEPTION 'El hito y las actividades deben pertenecer a la misma campaña' USING ERRCODE='23514';
        END IF;
        RETURN NEW;
      END; $$;
      DROP TRIGGER IF EXISTS milestone_activity_same_campaign ON brotar_extension.milestone_activity;
      CREATE TRIGGER milestone_activity_same_campaign BEFORE INSERT OR UPDATE
        ON brotar_extension.milestone_activity FOR EACH ROW EXECUTE FUNCTION brotar_extension.check_milestone_activity_campaign();
      INSERT INTO brotar_extension.milestone_activity(milestone_id,activity_id)
        SELECT id,activity_id FROM public.milestone WHERE activity_id IS NOT NULL ON CONFLICT DO NOTHING;
      GRANT USAGE ON SCHEMA brotar_extension TO brotar_app;
      GRANT SELECT,INSERT,UPDATE,DELETE ON brotar_extension.milestone_activity TO brotar_app;`)
  }

  async down(): Promise<void> {
    throw new Error('La relación múltiple de hitos no se elimina automáticamente: perdería vínculos. Recupera un respaldo o prepara una migración de conservación.')
  }
}
