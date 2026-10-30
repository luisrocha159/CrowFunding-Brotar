import {readJson,requestApi} from '../../../shared/api/request'
import {SessionError} from '../../../shared/api/sessionError'
import {stateLabels} from '../../contributions/labels'
/** Translate known technical state prefixes without rewriting the stored notice. */
export function noticeBody(body:string){return body.replace(/^Estado registrado: ([A-Z_]+)\./, (prefix,code:string)=>Object.hasOwn(stateLabels,code)?`Estado registrado: ${stateLabels[code]}.`:prefix)}
export interface ContactStatus {email:string;verifiedAt:string|null;phoneVerifiedAt:string|null;emailNotifications:boolean;channelAvailable:boolean;phoneChannelAvailable:false}
export interface ContactNotice {id:string;title:string;body:string;createdAt:string;readAt:string|null;delivery:'IN_APP'|'QUEUED'|'RETRY'|'SMTP_ACCEPTED'|'FAILED'|'CANCELLED';attempts:number}
export const deliveryLabel:Record<ContactNotice['delivery'],string>={IN_APP:'Disponible en Brotar',QUEUED:'Correo en cola',RETRY:'Reintentando correo',SMTP_ACCEPTED:'Aceptado por el servidor de correo',FAILED:'No se pudo enviar el correo',CANCELLED:'Aviso por correo cancelado'}
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v))
const nullableDate=(v:unknown)=>v===null||date(v)
export function contactStatusFrom(v:unknown):ContactStatus{
 if(!object(v)||typeof v.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)||typeof v.channelAvailable!=='boolean'||typeof v.emailNotifications!=='boolean'||!nullableDate(v.verifiedAt)||!nullableDate(v.phoneVerifiedAt)||v.phoneChannelAvailable!==false)throw new SessionError(0)
 return {email:v.email,verifiedAt:v.verifiedAt as string|null,phoneVerifiedAt:v.phoneVerifiedAt as string|null,emailNotifications:v.emailNotifications,channelAvailable:v.channelAvailable,phoneChannelAvailable:false}
}
export function contactNoticesFrom(v:unknown):ContactNotice[]{
 if(!Array.isArray(v))throw new SessionError(0)
 return v.map(n=>{
  if(!object(n)||typeof n.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(n.id)||typeof n.title!=='string'||typeof n.body!=='string'||!date(n.createdAt)||!nullableDate(n.readAt)||typeof n.delivery!=='string'||!Object.hasOwn(deliveryLabel,n.delivery)||!Number.isInteger(n.attempts)||Number(n.attempts)<0||Number(n.attempts)>3)throw new SessionError(0)
  return {id:n.id,title:n.title,body:n.body,createdAt:n.createdAt,readAt:n.readAt as string|null,delivery:n.delivery as ContactNotice['delivery'],attempts:Number(n.attempts)}
 })
}
export async function contactStatus(signal?:AbortSignal):Promise<ContactStatus>{
 return contactStatusFrom(await readJson(await requestApi('/api/contacts',{signal})))
}
export async function contactNotices(signal?:AbortSignal):Promise<ContactNotice[]>{
 return contactNoticesFrom(await readJson(await requestApi('/api/contacts/notifications',{signal})))
}
export async function requestEmail(){const b=await (await requestApi('/api/contacts/email/request',{method:'POST'})).json() as {status:string};if(!['smtp_accepted','already_verified'].includes(b.status))throw new SessionError(0);return b.status}
export async function confirmEmail(token:string){const b=await (await requestApi('/api/contacts/email/confirm',{method:'POST',body:{token}})).json() as {verified:boolean};if(b.verified!==true)throw new SessionError(0)}
export async function mailPreference(enabled:boolean){const b=await (await requestApi('/api/contacts/email/preferences',{method:'PUT',body:{enabled}})).json() as{enabled:boolean};if(b.enabled!==enabled)throw new SessionError(0)}
export async function readNotice(id:string,send:typeof fetch=fetch){const b=await readJson(await requestApi(`/api/contacts/notifications/${encodeURIComponent(id)}/read`,{method:'POST'},send));if(!object(b)||b.updated!==true)throw new SessionError(0)}
export function contactError(error:unknown){const status=error instanceof SessionError?error.status:0;return status===429?'Demasiadas solicitudes. Espera un minuto; se permiten hasta cinco enlaces por hora.':status===403?'Tu cuenta conserva acceso de lectura o no tiene permiso para esta acción.':status===401?'Inicia sesión con la cuenta a la que pertenece el correo y reintenta.':status===400?'El enlace venció, ya se usó o corresponde a otro correo. Solicita uno nuevo desde Mi cuenta.':status===503?'El canal de correo no está disponible. Revisa la configuración o inténtalo más tarde.':'No se pudo confirmar la operación. Revisa el estado antes de repetir.'}
