import type {MigrationInterface,QueryRunner} from 'typeorm'
export class SantiagoParties1792972800002 implements MigrationInterface {
 name='SantiagoParties1792972800002'
 async up(r:QueryRunner){await r.query(`
 CREATE TABLE brotar_extension.party_state(kind text NOT NULL CHECK(kind IN ('USER','ORGANIZATION')),subject_id uuid NOT NULL,version integer NOT NULL DEFAULT 0 CHECK(version>=0),restore_status public.user_status,PRIMARY KEY(kind,subject_id));
 CREATE TABLE brotar_extension.party_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL CHECK(kind IN ('USER','ORGANIZATION')),subject_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),actor_id uuid NOT NULL REFERENCES public.app_user(id),action text NOT NULL,reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 1000),snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(kind,subject_id,version));
 CREATE INDEX party_history_subject_idx ON brotar_extension.party_history(kind,subject_id,version DESC);
 GRANT SELECT,INSERT ON brotar_extension.party_state,brotar_extension.party_history TO brotar_app;
 GRANT UPDATE(version,restore_status) ON brotar_extension.party_state TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.party_history FROM brotar_app;
 GRANT UPDATE(left_at) ON public.organization_member TO brotar_app;
 GRANT UPDATE(first_name,last_name,display_name,city,website_url) ON public.user_profile TO brotar_app;
 GRANT UPDATE(status) ON public.app_user TO brotar_app;
 ALTER TABLE brotar_extension.verification_revision ALTER COLUMN operation TYPE varchar(40);
 ALTER TABLE brotar_extension.verification_revision DROP CONSTRAINT verification_revision_operation_check;
 ALTER TABLE brotar_extension.verification_revision ADD CONSTRAINT verification_revision_operation_check CHECK(operation IN ('BEFORE_CHANGE','SAVE','SUBMIT','REVIEW','REPRESENTATION_CHANGE'));
 `)}
 async down():Promise<void>{throw new Error('La gestión de terceros no se revierte automáticamente; conservar membresías, restricciones e historial. La reversión destructiva requiere revisión explícita.')}
}
