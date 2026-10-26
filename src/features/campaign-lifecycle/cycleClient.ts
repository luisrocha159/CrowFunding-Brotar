import {readJson,requestApi} from '../../shared/api/request'
import {SessionError} from '../../shared/api/sessionError'
export const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)
export const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)
export const timestamp=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
export const amount=(v:unknown)=>typeof v==='string'&&/^\d{1,14}\.\d{2}$/.test(v)
export const cycleStatuses=['APPROVED','PUBLISHED','FUNDING_ENDED','IN_EXECUTION','CANCELLED','CLOSED']
export const outcomes:Record<string,string>={PENDING:'Resultado todavía no fijado',EXECUTION_ELIGIBLE:'Financiación habilita ejecución',REFUND_REQUIRED:'Corresponde devolver fondos',NO_FUNDS:'Sin fondos que liberar'}
export const cycleLabels:Record<string,string>={END_FUNDING:'Finalizar recaudación vencida',START_EXECUTION:'Iniciar ejecución',REQUEST_CANCEL:'Solicitar cancelación',REJECT_CANCEL:'Rechazar solicitud de cancelación',APPROVE_CANCEL:'Evaluar y autorizar cancelación',CLOSE:'Cerrar campaña'}
Object.assign(cycleLabels,{SUBMIT_FINAL:'Rendición final presentada',APPROVE_FINAL:'Rendición final aprobada',REQUEST_CHANGES:'Correcciones de rendición solicitadas',FULFILL_REWARD:'Cumplimiento de recompensa registrado',RESOLVE_CLOSURE_CASE:'Incidencia de cierre resuelta'})
export interface CycleSummary{id:string;title:string;status:string;endsAt:string|null;outcome:string;cancelRequested:boolean}
export interface CycleDetail extends CycleSummary{mode:'DEMO';version:number;currencyCode:string|null;goalAmount:string|null;fundingTotal:string|null;cancelReason:string|null;cancellationCaseId:string|null;executionStartedAt:string|null;funds:{confirmed:string;refunded:string;refunds_reserved:string;committed:string;disbursed:string;disputed:string}|null;obligations:{payments:number;disputes:number;cases:number;reconciliation:number;events:number};closeBlockers:string[];events:{id:string;actorId:string|null;action:string;previousStatus:string;status:string;reason:string;at:string}[];eventTotal:number;page:number;pageSize:20}
export interface CyclePage{mode:'DEMO';items:CycleSummary[];total:number;page:number;pageSize:20}
function summary(v:unknown):v is CycleSummary{return object(v)&&identifier(v.id)&&typeof v.title==='string'&&cycleStatuses.includes(String(v.status))&&(v.endsAt===null||timestamp(v.endsAt))&&Object.hasOwn(outcomes,String(v.outcome))&&typeof v.cancelRequested==='boolean'}
export function cycleFrom(v:unknown):CycleDetail{
 if(!summary(v)||!object(v)||v.mode!=='DEMO'||!Number.isSafeInteger(v.version)||Number(v.version)<1||!(v.currencyCode===null||typeof v.currencyCode==='string'&&/^[A-Z]{3}$/.test(v.currencyCode))||!['goalAmount','fundingTotal'].every(k=>v[k]===null||amount(v[k]))||!(v.cancelReason===null||typeof v.cancelReason==='string')||!(v.cancellationCaseId===null||identifier(v.cancellationCaseId))||!(v.executionStartedAt===null||timestamp(v.executionStartedAt))||!(v.funds===null||object(v.funds)&&['confirmed','refunded','refunds_reserved','committed','disbursed','disputed'].every(k=>amount((v.funds as Record<string,unknown>)[k])))||!object(v.obligations)||!['payments','disputes','cases','reconciliation','events'].every(k=>Number.isSafeInteger((v.obligations as Record<string,unknown>)[k])&&Number((v.obligations as Record<string,unknown>)[k])>=0)||!Array.isArray(v.closeBlockers)||!v.closeBlockers.every(s=>typeof s==='string')||!Array.isArray(v.events)||v.events.length>20||!v.events.every(e=>object(e)&&identifier(e.id)&&(e.actorId===null||identifier(e.actorId))&&typeof e.action==='string'&&typeof e.status==='string'&&typeof e.previousStatus==='string'&&typeof e.reason==='string'&&timestamp(e.at))||!Number.isSafeInteger(v.eventTotal)||Number(v.eventTotal)<0||!Number.isSafeInteger(v.page)||Number(v.page)<1||v.pageSize!==20)throw new SessionError(0)
 return v as unknown as CycleDetail
}
export function cyclePageFrom(v:unknown):CyclePage{if(!object(v)||v.mode!=='DEMO'||!Array.isArray(v.items)||v.items.length>20||!v.items.every(summary)||!Number.isSafeInteger(v.total)||Number(v.total)<0||!Number.isSafeInteger(v.page)||Number(v.page)<1||v.pageSize!==20)throw new SessionError(0);return v as unknown as CyclePage}
export class OperationError extends SessionError{constructor(status:number,readonly detail:string){super(status)}}
export async function operationalRequest(path:string,method:'GET'|'POST'|'PUT'='GET',body?:unknown,signal?:AbortSignal){
 return readJson(await requestApi(`/api/${path}`,{method,body,signal,errorFromResponse:async response=>{let v:unknown;try{v=await response.json()}catch{return new SessionError(response.status)}return new OperationError(response.status,object(v)&&typeof v.message==='string'&&v.message.length<=3000?v.message:'')}}))
}
export function operationFailure(e:unknown){if(e instanceof OperationError&&e.detail&&[400,403,409].includes(e.status))return e.detail;const s=e instanceof SessionError?e.status:0;return s===401?'Inicia sesión para continuar.':s===403?'No tienes permiso vigente para esta acción o es una operación propia.':s===404?'No disponible para tu cuenta o modo DEMO desactivado.':s===429?'Espera un minuto; consulta el historial antes de repetir.':'No se pudo confirmar el resultado. Actualiza el estado antes de reintentar; no se simula éxito.'}
export function cycleOptions(d:CycleDetail,admin:boolean){
 if(!admin)return !d.cancelRequested&&['APPROVED','PUBLISHED','FUNDING_ENDED','IN_EXECUTION'].includes(d.status)?['REQUEST_CANCEL']:[]
 const options:string[]=[]
 if(d.cancelRequested)options.push('REJECT_CANCEL','APPROVE_CANCEL')
 if(d.status==='PUBLISHED')options.push('END_FUNDING')
 if(d.status==='FUNDING_ENDED'&&d.outcome==='EXECUTION_ELIGIBLE'&&!d.cancelRequested)options.push('START_EXECUTION')
 if(['FUNDING_ENDED','IN_EXECUTION','CANCELLED'].includes(d.status)&&!d.cancelRequested&&!d.closeBlockers.length)options.push('CLOSE')
 return options
}
export function operationReasonError(s:string){return s.trim().length<20||s.length>500||/[\p{Cc}\p{Cf}]/u.test(s)?'Escribe un motivo de 20–500 caracteres sin controles invisibles.':null}
