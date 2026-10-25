import assert from 'node:assert/strict'
import type {VerificationDetail,VerificationType} from '../src/verifications/application/verifications'
type Call=(path:string,cookie:string,body?:unknown,method?:string)=>Promise<Response>
/** Real HTTP capture/review of synthetic documents, never INSERT an approved flag as a substitute. */
export async function approveDemoIdentity(call:Call,ownerCookie:string,reviewerCookie:string,code='KYC_IDENTITY',organizationId?:string){
 const types=await(await call('me/verifications/types',ownerCookie)).json() as VerificationType[],t=types.find(t=>t.code===code)!
 assert.ok(t?.policy);const start=await call('me/verifications',ownerCookie,{verificationTypeId:t.id,...(organizationId?{organizationId}:{})});assert.equal(start.status,201);let detail=await start.json() as VerificationDetail
 const docs=[]
 for(const d of t.policy.documents){const file=await call('files',ownerCookie,{purpose:'VERIFICATION_DOCUMENT',visibility:'PRIVATE',originalName:'DEMO-cycle.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nDEMO synthetic identity').toString('base64')});assert.equal(file.status,201);const{id}=await file.json() as{id:string};docs.push({documentTypeId:d.documentTypeId,fileId:id})}
 const submitted=await call(`me/verifications/${detail.id}`,ownerCookie,{expectedVersion:detail.version,policyVersion:t.policy.version,fields:Object.fromEntries(t.policy.fields.map(f=>[f.key,'DEMO Persona de ensayo'])),documents:docs,accepted:true,submit:true},'PUT');assert.equal(submitted.status,200);detail=await submitted.json() as VerificationDetail
 const review=async(decision:string)=>{const r=await call(`admin/verifications/${detail.id}/review`,reviewerCookie,{expectedVersion:detail.version,decision,reason:'Revisión explícita de documentos sintéticos del ensayo.',documents:decision==='APPROVED'?detail.documents.map(d=>({fileId:d.fileId,isValid:true,notes:'Documento sintético legible'})):[]});assert.equal(r.status,201);detail=await r.json() as VerificationDetail}
 await review('IN_REVIEW');await review('APPROVED');return{id:detail.id,files:docs.map(d=>d.fileId)}
}
export function removeDemoIdentityFixtures(sql:(query:string)=>string,userIds:readonly string[]){
 for(const id of userIds)sql(`UPDATE file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE id IN(SELECT d.file_id FROM verification_document d JOIN verification v ON v.id=d.verification_id WHERE v.user_id='${id}');DELETE FROM brotar_extension.verification_revision WHERE verification_id IN(SELECT id FROM verification WHERE user_id='${id}');DELETE FROM verification_document WHERE verification_id IN(SELECT id FROM verification WHERE user_id='${id}');DELETE FROM verification WHERE user_id='${id}';`)
}
