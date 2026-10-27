import {readJson,requestApi} from '../../shared/api/request'
import {SessionError} from '../../shared/api/sessionError'
export const representationKinds={REPRESENTATIVE:'Nombrar representante',OWNERSHIP:'Transferir propiedad'} as const
export const representationLabels={REQUESTED:'Pendiente de aceptación',ACCEPTED:'Pendiente de aprobación administrativa',APPROVED:'Aprobada y aplicada',REJECTED:'Rechazada por administración',DECLINED:'Declinada por el destinatario',CANCELLED:'Cancelada por el solicitante'} as const
export const representationActionLabels={ACCEPT:'Aceptar propuesta',DECLINE:'Declinar propuesta',CANCEL:'Cancelar solicitud',APPROVE:'Aprobar y aplicar',REJECT:'Rechazar solicitud'} as const
export type RepresentationAction=keyof typeof representationActionLabels
export interface RepresentationSummary {
 id:string;organizationId:string;organizationName:string;kind:keyof typeof representationKinds;targetUserId:string;targetName:string;requestedBy:string;requesterName:string
 status:keyof typeof representationLabels;version:number;requestedAt:string;acceptedAt:string|null;acceptedBy:string|null;decidedAt:string|null;decidedBy:string|null;reason:string;decisionReason:string|null;allowedActions:RepresentationAction[]
}
export interface RepresentationDetail extends RepresentationSummary {events:{version:number;action:string;actorId:string;reason:string;recordedAt:string}[]}
export interface RepresentationPage {items:RepresentationSummary[];total:number;page:number;pageSize:20}
export interface RepresentationInput {kind:string;targetUserId:string;reason:string;confirmed:boolean}
export interface RepresentationActionInput {action:string;reason:string;confirmed:boolean}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v)
const date=(v:unknown):v is string=>typeof v==='string'&&v.length>10&&Number.isFinite(Date.parse(v))
const text=(v:unknown):v is string=>typeof v==='string'
const integer=(v:unknown,min=1)=>Number.isSafeInteger(v)&&Number(v)>=min
function summary(v:unknown):v is RepresentationSummary {
 if(!object(v)||!['id','organizationId','targetUserId','requestedBy'].every(k=>uuid(v[k]))||!['organizationName','targetName','requesterName','reason'].every(k=>text(v[k]))||!Object.hasOwn(representationKinds,String(v.kind))||!Object.hasOwn(representationLabels,String(v.status))||!integer(v.version)||!date(v.requestedAt)||!(v.acceptedAt===null||date(v.acceptedAt))||!(v.decidedAt===null||date(v.decidedAt))||!(v.acceptedBy===null||uuid(v.acceptedBy))||!(v.decidedBy===null||uuid(v.decidedBy))||!(v.decisionReason===null||text(v.decisionReason))||!Array.isArray(v.allowedActions)||new Set(v.allowedActions).size!==v.allowedActions.length||!v.allowedActions.every(a=>typeof a==='string'&&Object.hasOwn(representationActionLabels,a)))return false
 if(v.allowedActions.includes('ACCEPT')&&v.status!=='REQUESTED'||v.allowedActions.includes('APPROVE')&&v.status!=='ACCEPTED')return false
 if(!['REQUESTED','ACCEPTED'].includes(String(v.status))&&v.allowedActions.length)return false
 return true
}
export function parseRepresentation(v:unknown):RepresentationDetail {
 if(!summary(v)||!object(v)||!Array.isArray(v.events)||!v.events.every(e=>object(e)&&integer(e.version)&&text(e.action)&&uuid(e.actorId)&&text(e.reason)&&date(e.recordedAt)))throw new SessionError(0)
 return v as unknown as RepresentationDetail
}
export function parseRepresentationPage(v:unknown):RepresentationPage {
 if(!object(v)||!Array.isArray(v.items)||v.items.length>20||!v.items.every(summary)||!integer(v.total,0)||!integer(v.page)||v.pageSize!==20)throw new SessionError(0)
 return v as unknown as RepresentationPage
}
function reasonErrors(input:RepresentationActionInput|RepresentationInput){
 const errors:Record<string,string>={}
 if(typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.trim().length>1000||input.reason.includes(String.fromCharCode(0))||/[\uD800-\uDFFF]/u.test(input.reason))errors.reason='Explica el motivo con 10 a 1000 caracteres.'
 if(input.confirmed!==true)errors.confirmed='Confirma expresamente esta operación.'
 return errors
}
export function validateRepresentationRequest(input:RepresentationInput){const errors=reasonErrors(input);if(!Object.hasOwn(representationKinds,input.kind))errors.kind='Selecciona la operación.';if(!uuid(input.targetUserId))errors.targetUserId='Introduce el UUID que te compartió el destinatario.';return errors}
export function validateRepresentationAction(input:RepresentationActionInput){const errors=reasonErrors(input);if(!Object.hasOwn(representationActionLabels,input.action))errors.action='Selecciona una acción disponible.';return errors}
export function representationActions(detail:RepresentationSummary,administrative:boolean){return detail.allowedActions.filter(a=>administrative?['APPROVE','REJECT'].includes(a):['ACCEPT','DECLINE','CANCEL'].includes(a))}
const prefix=(admin:boolean)=>`/api/${admin?'administration':'me'}/representation-requests`
export const listRepresentations=(administrative:boolean,page:number,signal?:AbortSignal)=>requestApi(`${prefix(administrative)}?page=${page}`,{signal}).then(readJson).then(parseRepresentationPage)
export const getRepresentation=(administrative:boolean,id:string,signal?:AbortSignal)=>requestApi(`${prefix(administrative)}/${id}`,{signal}).then(readJson).then(parseRepresentation)
export const createRepresentation=(organizationId:string,expectedVersion:string,input:RepresentationInput)=>requestApi(`/api/me/organizations/${organizationId}/representation-requests`,{method:'POST',body:{...input,expectedVersion}}).then(readJson).then(parseRepresentation)
export const actRepresentation=(administrative:boolean,id:string,version:number,input:RepresentationActionInput)=>requestApi(`${prefix(administrative)}/${id}/actions`,{method:'POST',body:{...input,expectedVersion:version}}).then(readJson).then(parseRepresentation)
