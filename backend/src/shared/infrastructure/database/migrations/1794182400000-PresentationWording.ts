import type {MigrationInterface,QueryRunner} from 'typeorm'
import {LEGAL_DEFINITION,LEGAL_HASH} from '../../../../legal/legal-v2-record'
import {LEGAL_VERSION,LEGAL_PUBLISHED_AT} from '../../../../legal/domain/legal-v2-20261109'

/** Presentación y captura: no reescribe expedientes ni aceptaciones anteriores. */
export class PresentationWording1794182400000 implements MigrationInterface {
  name='PresentationWording1794182400000'
  async up(r:QueryRunner) {
    await r.query(`INSERT INTO brotar_extension.legal_bundle(version,definition,sha256,published_at) VALUES($1,$2::jsonb,$3,$4)`,[LEGAL_VERSION,JSON.stringify(LEGAL_DEFINITION),LEGAL_HASH,LEGAL_PUBLISHED_AT])
    const policies:{verificationTypeId:string;definition:Record<string,unknown>}[]=await r.query(`SELECT verification_type_id AS "verificationTypeId",definition FROM brotar_extension.verification_policy WHERE is_active AND version LIKE 'mvp-demo-%' FOR UPDATE`)
    for(const row of policies){
      const definition={...row.definition,version:'mvp-demo-1.1-20261109',compatibleVersions:[row.definition.version],
        treatmentNotice:'Entorno académico de pruebas: usa solo información y documentos ficticios. No verifica identidad real ni habilita operaciones comerciales.',
        evidenceReference:'docs/ajustes-presentacion-y-verificacion-2026-11-09.md',approvedBy:'Ricardo · criterio funcional del equipo para pruebas',approvedAt:LEGAL_PUBLISHED_AT,
        fields:(row.definition.fields as {key:string;label:string;required:boolean;maxLength:number}[]).map(field=>({...field,label:field.label.replace(/\s*\(DEMO[^)]*\)/g,'').replace(/\bDEMO\b/g,'de prueba')}))}
      await r.query(`UPDATE brotar_extension.verification_policy SET is_active=false WHERE verification_type_id=$1 AND is_active`,[row.verificationTypeId])
      await r.query(`INSERT INTO brotar_extension.verification_policy(verification_type_id,version,definition,is_active) VALUES($1,$2,$3::jsonb,true)`,[row.verificationTypeId,definition.version,JSON.stringify(definition)])
    }
    await r.query(`ALTER TABLE brotar_extension.demo_destination DROP CONSTRAINT demo_destination_reference_check;
      ALTER TABLE brotar_extension.demo_destination ADD CONSTRAINT demo_destination_reference_check CHECK(reference ~ '^(PRUEBA|DEMO)-[A-Z][A-Z_-]{2,39}$');`)
  }
  async down():Promise<void>{throw new Error('La actualización de presentación no se revierte automáticamente; conservar publicaciones, expedientes y recibos y preparar recuperación revisada.')}
}
