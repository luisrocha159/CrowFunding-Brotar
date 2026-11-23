import {readJson,requestApi} from '../../shared/api/request'
import {SessionError} from '../../shared/api/sessionError'
export interface DemoTicket {paymentId:string;contributionId:string;reference:string;amount:string;currencyCode:string;status:string;attempt:number;expiresAt:string|null;expired:boolean;mode:'DEMO';payable:false;qrPayload:string;method?:'TEST_QR'|'TEST_CARD'|null}
const uuid=(v:unknown):v is string=>typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)
const object=(v:unknown):v is Record<string,unknown>=>v!==null && typeof v==='object' && !Array.isArray(v)
export function demoTicketFrom(v:unknown):DemoTicket {
  if(!object(v) || v.mode!=='DEMO' || v.payable!==false || !uuid(v.paymentId) || !uuid(v.contributionId) || typeof v.reference!=='string' || v.reference.length>24 ||
    typeof v.amount!=='string' || !/^\d{1,12}\.\d{2}$/.test(v.amount) || typeof v.currencyCode!=='string' || !/^[A-Z]{3}$/.test(v.currencyCode) ||
    !['INITIATED','PENDING','CONFIRMED','FAILED','EXPIRED','REFUNDED','DISPUTED'].includes(String(v.status)) || !Number.isInteger(v.attempt) || Number(v.attempt)<1 ||
    !(v.expiresAt===null || typeof v.expiresAt==='string' && Number.isFinite(Date.parse(v.expiresAt))) || typeof v.expired!=='boolean' || v.qrPayload!==`BROTAR-DEMO:${v.paymentId}` || !(v.method===undefined||v.method===null||v.method==='TEST_QR'||v.method==='TEST_CARD'))throw new SessionError(0)
  return v as unknown as DemoTicket
}
export async function demoCheckout(input:{campaignId:string;rewardId:string|null;amount:string;currencyCode:string;requestKey:string;demoConsent:true;method?:'TEST_QR'|'TEST_CARD'},signal?:AbortSignal) {
 const v=await readJson(await requestApi('/api/demo-payments/checkout',{method:'POST',body:input,signal}))
 if(!object(v) || v.mode!=='DEMO')throw new SessionError(0)
 return demoTicketFrom(v.ticket)
}
export async function demoTicket(id:string,signal?:AbortSignal) {if(!uuid(id))throw new SessionError(404);return demoTicketFrom(await readJson(await requestApi(`/api/demo-payments/${id}`,{signal})))}
export async function demoRetry(contributionId:string,requestKey:string,signal?:AbortSignal) {
 const v=await readJson(await requestApi(`/api/demo-payments/contributions/${contributionId}/retry`,{method:'POST',body:{requestKey,demoConsent:true},signal}))
 if(!object(v) || v.mode!=='DEMO')throw new SessionError(0)
 const ticket=demoTicketFrom(v.ticket);if(ticket.contributionId!==contributionId)throw new SessionError(0);return ticket
}
export function demoFailure(e:unknown):string {
 const status=e instanceof SessionError?e.status:0
 return status===404?'Este pago no está disponible para tu cuenta. Vuelve a Mis aportes para consultarlo.':status===409?'La disponibilidad de la campaña o de tu reserva cambió. Actualiza el estado antes de continuar.':status===400?'Revisa moneda, importe y recompensa. La selección se comprueba nuevamente en el servidor.':status===403?'Tu cuenta no está autorizada ahora para esta operación.':status===429?'Demasiados intentos. Espera un minuto y consulta el estado.':'No se pudo confirmar la operación. Consulta el estado antes de repetir con la misma selección.'
}
