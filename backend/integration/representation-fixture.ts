import assert from 'node:assert/strict'
type Call=(path:string,cookie:string,body?:unknown,method?:string)=>Promise<Response>
/** Exercises real consent/approval. Call approveDemoIdentity for the target first. */
export async function approveRepresentation(call:Call,organizationId:string,requesterCookie:string,target:{id:string;cookie:string},adminCookie:string,kind='OWNERSHIP'){
 const members=await call(`me/organizations/${organizationId}/members`,requesterCookie);assert.equal(members.status,200)
 const {version}=await members.json() as{version:string},reason='Cambio formal explícito de representación para ensayo DEMO.'
 const requested=await call(`me/organizations/${organizationId}/representation-requests`,requesterCookie,{kind,targetUserId:target.id,expectedVersion:version,reason,confirmed:true});assert.equal(requested.status,201)
 let detail=await requested.json() as{id:string;version:number}
 const accepted=await call(`me/representation-requests/${detail.id}/actions`,target.cookie,{action:'ACCEPT',expectedVersion:detail.version,reason,confirmed:true});assert.equal(accepted.status,201);detail=await accepted.json() as typeof detail
 const approved=await call(`administration/representation-requests/${detail.id}/actions`,adminCookie,{action:'APPROVE',expectedVersion:detail.version,reason,confirmed:true});assert.equal(approved.status,201)
 return approved.json() as Promise<{id:string;version:number;status:string}>
}
/** Only run in an isolated DB after its owning integration test validates readTestDatabaseTarget. */
export function removeRepresentationFixtures(sql:(query:string)=>string,organizationId:string){
 sql(`DELETE FROM brotar_extension.representation_event WHERE request_id IN(SELECT id FROM brotar_extension.representation_request WHERE organization_id='${organizationId}');DELETE FROM brotar_extension.representation_request WHERE organization_id='${organizationId}';`)
}
