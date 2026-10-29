import type {MigrationInterface,QueryRunner} from 'typeorm'
export class PublicationSuccession1793145600000 implements MigrationInterface {
 name='PublicationSuccession1793145600000'
 async up(r:QueryRunner){await r.query(`CREATE TABLE brotar_extension.publication_successor(
  update_id uuid PRIMARY KEY REFERENCES public.campaign_update(id) ON DELETE CASCADE,
  supersedes_id uuid NOT NULL UNIQUE REFERENCES public.campaign_update(id) ON DELETE CASCADE,
  request_hash char(64) NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(update_id<>supersedes_id));
  GRANT SELECT,INSERT ON brotar_extension.publication_successor TO brotar_app;
  REVOKE UPDATE,DELETE ON brotar_extension.publication_successor FROM brotar_app;`)}
 async down():Promise<void>{throw new Error('La sucesión de publicaciones no se revierte automáticamente; conservar originales, referencias e historial.')}
}
