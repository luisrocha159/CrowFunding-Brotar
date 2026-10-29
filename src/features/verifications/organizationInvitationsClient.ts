import {SessionError} from '../../shared/api/sessionError'
import {object,identifier} from '../campaign-lifecycle/cycleClient'
export interface Invitation {id:string;organizationId:string;organizationName:string;targetUserId:string;invitedBy:string;role:'MEMBER'|'ADMIN';version:number;reason:string;createdAt:string;expiresAt:string;resolvedAt:string|null;status:string;expired:boolean;allowedActions:string[];events:{version:number;action:string;actorId:string;reason:string;recordedAt:string}[]}
export interface InvitationList {items:Invitation[];total:number;page:number;pageSize:20}
const timestamp=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
export function invitationListFrom(v:unknown):InvitationList{
 if(!object(v)||!Array.isArray(v.items)||v.items.length>20||!v.items.every(i=>object(i)&&['id','organizationId','targetUserId','invitedBy'].every(k=>identifier(i[k]))&&['organizationName','reason'].every(k=>typeof i[k]==='string')&&['MEMBER','ADMIN'].includes(String(i.role))&&Number.isSafeInteger(i.version)&&Number(i.version)>0&&['PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED'].includes(String(i.status))&&typeof i.expired==='boolean'&&timestamp(i.createdAt)&&timestamp(i.expiresAt)&&(i.resolvedAt===null||timestamp(i.resolvedAt))&&Array.isArray(i.allowedActions)&&i.allowedActions.every(a=>['ACCEPT','DECLINE','CANCEL'].includes(String(a)))&&Array.isArray(i.events)&&i.events.every(e=>object(e)&&Number.isSafeInteger(e.version)&&typeof e.action==='string'&&identifier(e.actorId)&&typeof e.reason==='string'&&timestamp(e.recordedAt)))||!Number.isSafeInteger(v.total)||Number(v.total)<0||!Number.isSafeInteger(v.page)||Number(v.page)<1||v.pageSize!==20)throw new SessionError(0)
 return v as unknown as InvitationList
}
