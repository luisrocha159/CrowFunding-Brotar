import type {EntityManager} from 'typeorm'
import {LEGAL_VERSION} from './domain/legal-v1-20261028'
import {InvalidLegalAgreement,LegalAgreementRequired} from './domain/legal-agreement'
import {recordAudit,setAuditActor} from '../shared/infrastructure/database/audit'

import {LEGAL_DEFINITION,LEGAL_HASH,legalDigest} from './legal-v1-record'
export {LEGAL_DEFINITION,LEGAL_HASH,legalDigest} from './legal-v1-record'
export async function publishedLegal(manager:EntityManager,version=LEGAL_VERSION){
 const [row]:{definition:typeof LEGAL_DEFINITION;hash:string}[]=await manager.query(`SELECT definition,sha256 AS hash FROM brotar_extension.legal_bundle WHERE version=$1`,[version])
 if(!row || row.hash!==legalDigest(row.definition) || row.definition.version!==version || version===LEGAL_VERSION && row.hash!==LEGAL_HASH)throw new LegalAgreementRequired('Las condiciones publicadas no están disponibles; revisa la instalación.')
 return {...row.definition,hash:row.hash}
}
export async function requireLegalAgreement(manager:EntityManager,userId:string){
 const [row]=await manager.query(`SELECT 1 FROM brotar_extension.legal_acceptance WHERE user_id=$1 AND bundle_version=$2 AND purpose='ACCOUNT'`,[userId,LEGAL_VERSION])
 if(!row)throw new LegalAgreementRequired('Lee y acepta las condiciones vigentes desde Mi cuenta antes de enviar el expediente.')
 await publishedLegal(manager)
}
export async function recordLegalAcceptance(manager:EntityManager,userId:string,version:string,source:'REGISTRATION'|'ACCOUNT'|'VERIFICATION',referenceId:string|null=null,policyVersion:string|null=null,caseFromVersion:string|null=null){
 if(version!==LEGAL_VERSION)throw new InvalidLegalAgreement('Las condiciones cambiaron. Recarga y lee la versión vigente.')
 const bundle=await publishedLegal(manager,version)
 const purpose=source==='VERIFICATION'?'VERIFICATION':'ACCOUNT'
 const codes=purpose==='ACCOUNT'?['TERMS','PRIVACY']:['IDENTITY']
 if(purpose==='VERIFICATION'){if(!referenceId||!policyVersion||!caseFromVersion)throw new InvalidLegalAgreement();await requireLegalAgreement(manager,userId)}
 const rows:{id:string}[]=await manager.query(`INSERT INTO brotar_extension.legal_acceptance(user_id,bundle_version,purpose,reference_id,policy_version,source,document_codes,bundle_hash,case_from_version)
  VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) ON CONFLICT DO NOTHING RETURNING id`,[userId,version,purpose,referenceId,policyVersion,source,JSON.stringify(codes),bundle.hash,caseFromVersion])
 if(rows.length){await setAuditActor(manager,userId);await recordAudit(manager,userId,'CREATE','legal_acceptance',rows[0]!.id);return rows[0]!.id}
 const [existing]:{id:string}[]=await manager.query(`SELECT id FROM brotar_extension.legal_acceptance WHERE user_id=$1 AND bundle_version=$2 AND purpose=$3 AND reference_id IS NOT DISTINCT FROM $4::uuid AND case_from_version IS NOT DISTINCT FROM $5::text`,[userId,version,purpose,referenceId,caseFromVersion])
 if(!existing)throw new LegalAgreementRequired('No se confirmó el recibo del consentimiento.')
 return existing.id
}
