import { SessionError } from '../access/session/sessionClient'
export interface Party {id:string;kind:string;name:string;contact:string;status:string;detail:string}
export interface PartyPage {items:Party[];page:number;hasMore:boolean}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)
export function parsePartyPage(value:unknown):PartyPage{
  if(!object(value)||!Number.isInteger(value.page)||typeof value.hasMore!=='boolean'||!Array.isArray(value.items)||!value.items.every(item=>object(item)&&['id','kind','name','contact','status','detail'].every(key=>typeof item[key]==='string')))throw new SessionError(0)
  return value as unknown as PartyPage
}
export interface PartyHistory {action:string;reason:string;version:number;recordedAt:string;actorId:string;changes:string[]}
export interface Member {id:string;userId:string;name:string;role:string;joinedAt:string;leftAt:string|null;current:boolean}
export interface MembershipDetail {id:string;name:string;status:string;version:string;actorRole:string;members:Member[];currentMembers:Member[];totalMembers:number;totalCurrentMembers:number;currentPage:number;memberPage:number;pageSize:20;history:PartyHistory[]}
export interface UserPartyDetail {id:string;email:string;status:string;firstName:string;lastName:string;displayName:string;city:string;websiteUrl:string;version:string;canManage:boolean;canRestore:boolean;history:PartyHistory[]}
const history=(value:unknown)=>Array.isArray(value)&&value.every(row=>object(row)&&['action','reason','recordedAt','actorId'].every(key=>typeof row[key]==='string')&&Number.isInteger(row.version)&&Array.isArray(row.changes)&&row.changes.every(change=>typeof change==='string'))
const memberRows=(value:unknown)=>Array.isArray(value)&&value.length<=20&&value.every(row=>object(row)&&['id','userId','name','role','joinedAt'].every(key=>typeof row[key]==='string')&&(row.leftAt===null||typeof row.leftAt==='string')&&typeof row.current==='boolean')
export function parseMembershipDetail(value:unknown):MembershipDetail{
 if(!object(value)||!['id','name','status','version','actorRole'].every(key=>typeof value[key]==='string')||!memberRows(value.members)||!memberRows(value.currentMembers)||!['totalMembers','totalCurrentMembers'].every(key=>Number.isSafeInteger(value[key])&&Number(value[key])>=0)||!['currentPage','memberPage'].every(key=>Number.isSafeInteger(value[key])&&Number(value[key])>=1)||value.pageSize!==20||!history(value.history))throw new SessionError(0)
 return value as unknown as MembershipDetail
}
export function parseUserPartyDetail(value:unknown):UserPartyDetail{
 if(!object(value)||!['id','email','status','firstName','lastName','displayName','city','websiteUrl','version'].every(key=>typeof value[key]==='string')||typeof value.canManage!=='boolean'||typeof value.canRestore!=='boolean'||!history(value.history))throw new SessionError(0)
 return value as unknown as UserPartyDetail
}
export interface MembershipChange {action:'ADD'|'CHANGE'|'REMOVE'|'TRANSFER';userId:string;role:string;reason:string;confirmed:boolean}
export function validateMembershipChange(input:MembershipChange){
 const errors:Partial<Record<keyof MembershipChange,string>>={}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.userId))errors.userId='Introduce el identificador UUID de una cuenta registrada.'
 if(!['ADMIN','MEMBER'].includes(input.role))errors.role='La representación y propiedad requieren una solicitud formal.'
 if(input.action==='TRANSFER')errors.action='Utiliza la solicitud formal con aceptación y aprobación.'
 if(input.reason.trim().length<10||input.reason.trim().length>1000)errors.reason='Explica el motivo con 10 a 1000 caracteres.'
 if(!input.confirmed)errors.confirmed='Debes confirmar el cambio elegido.'
 return errors
}
export interface UserPartyChange {firstName:string;lastName:string;displayName:string;city:string;websiteUrl:string;reason:string;confirmed:boolean}
export function validateUserPartyChange(input:UserPartyChange){
 const errors:Partial<Record<keyof UserPartyChange,string>>={}
 for(const key of ['firstName','lastName'] as const)if(!input[key].trim()||input[key].trim().length>120)errors[key]='Introduce entre 1 y 120 caracteres.'
 if(input.displayName.length>160)errors.displayName='Máximo 160 caracteres.'
 if(input.city.length>120)errors.city='Máximo 120 caracteres.'
 if(input.websiteUrl){try{const url=new URL(input.websiteUrl);if(url.protocol!=='https:'||url.username||url.password||input.websiteUrl.length>500)errors.websiteUrl='Introduce una dirección HTTPS válida (máximo 500 caracteres).'}catch{errors.websiteUrl='Introduce una dirección HTTPS válida.'}}
 if(input.reason.trim().length<10||input.reason.trim().length>1000)errors.reason='Explica el motivo con 10 a 1000 caracteres.'
 if(!input.confirmed)errors.confirmed='Debes confirmar el cambio elegido.'
 return errors
}
