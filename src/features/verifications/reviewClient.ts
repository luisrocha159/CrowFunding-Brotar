import {readJson,requestApi} from '../../shared/api/request'
import {SessionError} from '../../shared/api/sessionError'
import {verificationDetailFrom,type VerificationDetail,type VerificationSummary} from './verificationsClient'
export interface ReviewDetail extends VerificationDetail {subjectUserId:string|null;reviewedBy:string|null;reviewedAt:string|null}
export interface ReviewPage {items:VerificationSummary[];total:number;page:number;pageSize:20}
const object=(v:unknown):v is Record<string,unknown>=>v!==null && typeof v==='object' && !Array.isArray(v)
const uuid=(v:unknown)=>typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)
const date=(v:unknown)=>typeof v==='string' && Number.isFinite(Date.parse(v))
export function reviewDetailFrom(v:unknown):ReviewDetail {
 const detail=verificationDetailFrom(v)
 if(!object(v) || !uuid(v.id) || !(v.subjectUserId===null || uuid(v.subjectUserId)) || !(v.reviewedBy===null || uuid(v.reviewedBy)) || !(v.reviewedAt===null || date(v.reviewedAt)) || !detail.documents.every(d=>uuid(d.fileId)))throw new SessionError(0)
 return v as unknown as ReviewDetail
}
export function reviewPageFrom(v:unknown):ReviewPage {
 if(!object(v) || !Array.isArray(v.items) || v.items.length>20 || !Number.isSafeInteger(v.total) || Number(v.total)<0 || !Number.isSafeInteger(v.page) || Number(v.page)<1 || v.pageSize!==20 ||
 !v.items.every(r=>object(r) && uuid(r.id) && typeof r.typeName==='string' && typeof r.typeCode==='string' && typeof r.status==='string' && date(r.updatedAt) && (r.organizationId===null || uuid(r.organizationId)) && (r.organizationName===null || typeof r.organizationName==='string')))throw new SessionError(0)
 return v as unknown as ReviewPage
}
export async function listReviews(kind:string,status:string,page:number,signal?:AbortSignal){return reviewPageFrom(await readJson(await requestApi(`/api/admin/verifications?${new URLSearchParams({kind,status,page:String(page)})}`,{signal})))}
export async function readReview(id:string,signal?:AbortSignal){return reviewDetailFrom(await readJson(await requestApi(`/api/admin/verifications/${encodeURIComponent(id)}`,{signal})))}
export async function decideReview(id:string,input:{expectedVersion:string;decision:string;reason:string;documents:{fileId:string;isValid:boolean;notes:string}[]},signal?:AbortSignal){
 const value=reviewDetailFrom(await readJson(await requestApi(`/api/admin/verifications/${encodeURIComponent(id)}/review`,{method:'POST',body:input,signal})))
 if(value.id!==id || value.status!==input.decision)throw new SessionError(0);return value
}
export function reviewDocumentUrl(id:string,fileId:string){return `/api/admin/verifications/${encodeURIComponent(id)}/documents/${encodeURIComponent(fileId)}`}
export function reviewFailure(e:unknown){const status=e instanceof SessionError?e.status:0;return status===403?'Acceso denegado: comprueba tu responsabilidad vigente y que no sea un caso propio.':status===409?'El expediente o la política cambió. Actualiza y revisa de nuevo antes de decidir.':status===400?'Revisa motivo, estado y validación de todos los documentos actuales.':status===404?'Expediente o documento no disponible.':'No se confirmó la consulta u operación. Actualiza antes de repetir.'}
