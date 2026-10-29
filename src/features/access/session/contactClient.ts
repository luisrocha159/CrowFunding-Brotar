import {requestApi} from '../../../shared/api/request'
import {SessionError} from '../../../shared/api/sessionError'
import {stateLabels} from '../../contributions/labels'
/** Translate known technical state prefixes without rewriting the stored notice. */
export function noticeBody(body:string){return body.replace(/^Estado registrado: ([A-Z_]+)\./, (prefix,code:string)=>Object.hasOwn(stateLabels,code)?`Estado registrado: ${stateLabels[code]}.`:prefix)}
export interface ContactStatus {email:string;verifiedAt:string|null;phoneVerifiedAt:string|null;emailNotifications:boolean;channelAvailable:boolean;phoneChannelAvailable:false}
export interface ContactNotice {id:string;title:string;body:string;createdAt:string;readAt:string|null;delivery:'IN_APP'|'QUEUED'|'RETRY'|'SMTP_ACCEPTED'|'FAILED'|'CANCELLED';attempts:number}
export const deliveryLabel:Record<ContactNotice['delivery'],string>={IN_APP:'Disponible en Brotar',QUEUED:'Correo en cola',RETRY:'Reintentando correo',SMTP_ACCEPTED:'Aceptado por el servidor de correo',FAILED:'No se pudo enviar el correo',CANCELLED:'Aviso por correo cancelado'}
export async function contactStatus(signal?:AbortSignal):Promise<ContactStatus>{
 const b=await (await requestApi('/api/contacts',{signal})).json() as ContactStatus
 if(typeof b.email!=='string'||typeof b.channelAvailable!=='boolean'||typeof b.emailNotifications!=='boolean'||!(b.verifiedAt===null||typeof b.verifiedAt==='string'))throw new SessionError(0)
 return b
}
export async function contactNotices(signal?:AbortSignal):Promise<ContactNotice[]>{
 const b=await (await requestApi('/api/contacts/notifications',{signal})).json() as ContactNotice[]
 if(!Array.isArray(b)||b.some(n=>typeof n.id!=='string'||typeof n.title!=='string'||typeof n.body!=='string'||!Object.hasOwn(deliveryLabel,n.delivery)))throw new SessionError(0)
 return b
}
export async function requestEmail(){const b=await (await requestApi('/api/contacts/email/request',{method:'POST'})).json() as {status:string};if(!['smtp_accepted','already_verified'].includes(b.status))throw new SessionError(0);return b.status}
export async function confirmEmail(token:string){const b=await (await requestApi('/api/contacts/email/confirm',{method:'POST',body:{token}})).json() as {verified:boolean};if(b.verified!==true)throw new SessionError(0)}
export async function mailPreference(enabled:boolean){const b=await (await requestApi('/api/contacts/email/preferences',{method:'PUT',body:{enabled}})).json() as{enabled:boolean};if(b.enabled!==enabled)throw new SessionError(0)}
export async function readNotice(id:string){await requestApi(`/api/contacts/notifications/${encodeURIComponent(id)}/read`,{method:'POST'})}
export function contactError(error:unknown){const status=error instanceof SessionError?error.status:0;return status===429?'Demasiadas solicitudes. Espera un minuto; se permiten hasta cinco enlaces por hora.':status===403?'Tu cuenta conserva acceso de lectura o no tiene permiso para esta acción.':status===401?'Inicia sesión con la cuenta a la que pertenece el correo y reintenta.':status===400?'El enlace venció, ya se usó o corresponde a otro correo. Solicita uno nuevo desde Mi cuenta.':status===503?'El canal de correo no está disponible. Revisa la configuración o inténtalo más tarde.':'No se pudo confirmar la operación. Revisa el estado antes de repetir.'}
