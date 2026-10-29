import type {MigrationInterface,QueryRunner} from 'typeorm'
import {LEGAL_DEFINITION,LEGAL_HASH} from '../../../../legal/legal-v1-record'
import {LEGAL_VERSION,LEGAL_PUBLISHED_AT} from '../../../../legal/domain/legal-v1-20261028'
export class ProvisionalLegalAgreement1793145600003 implements MigrationInterface{
 name='ProvisionalLegalAgreement1793145600003'
 async up(r:QueryRunner){
  await r.query(`CREATE TABLE brotar_extension.legal_bundle(version varchar(100) PRIMARY KEY,definition jsonb NOT NULL,sha256 char(64) NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),published_at timestamptz NOT NULL,UNIQUE(version,sha256));
   CREATE TABLE brotar_extension.legal_acceptance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,bundle_version varchar(100) NOT NULL REFERENCES brotar_extension.legal_bundle(version),purpose text NOT NULL CHECK(purpose IN ('ACCOUNT','VERIFICATION')),reference_id uuid REFERENCES public.verification(id) ON DELETE CASCADE,policy_version varchar(100),source text NOT NULL CHECK(source IN ('REGISTRATION','ACCOUNT','VERIFICATION')),document_codes jsonb NOT NULL,bundle_hash char(64) NOT NULL,FOREIGN KEY(bundle_version,bundle_hash) REFERENCES brotar_extension.legal_bundle(version,sha256),accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
   CHECK((purpose='ACCOUNT' AND reference_id IS NULL AND policy_version IS NULL AND source IN ('REGISTRATION','ACCOUNT')) OR (purpose='VERIFICATION' AND reference_id IS NOT NULL AND policy_version IS NOT NULL AND source='VERIFICATION')),
   UNIQUE NULLS NOT DISTINCT(user_id,bundle_version,purpose,reference_id));
   CREATE INDEX legal_acceptance_user_idx ON brotar_extension.legal_acceptance(user_id,accepted_at DESC);
   GRANT SELECT ON brotar_extension.legal_bundle TO brotar_app;
   GRANT SELECT,INSERT ON brotar_extension.legal_acceptance TO brotar_app;
   REVOKE UPDATE,DELETE ON brotar_extension.legal_bundle,brotar_extension.legal_acceptance FROM brotar_app;`)
  await r.query(`INSERT INTO brotar_extension.legal_bundle(version,definition,sha256,published_at) VALUES($1,$2::jsonb,$3,$4)`,[LEGAL_VERSION,JSON.stringify(LEGAL_DEFINITION),LEGAL_HASH,LEGAL_PUBLISHED_AT])
 }
 async down():Promise<void>{throw new Error('El consentimiento no se revierte automáticamente; conservar textos y aceptaciones y preparar recuperación revisada.')}
}
