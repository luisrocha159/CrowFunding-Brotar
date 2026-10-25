import {LedgerConflict,LedgerInvalid} from '../../contributions/domain/payment'
export const disputeStates=['OPEN','UNDER_REVIEW','AWAITING_RESPONSE','RESOLVED','ESCALATED','CLOSED'] as const
export const disputeActions=['CLAIM','REQUEST_INFO','RESUME','ESCALATE','RESOLVE_NO_REFUND','RECOMMEND_REFUND','CLOSE','REOPEN'] as const
export function disputeTransition(status:string,action:string):string{
 if(!disputeActions.includes(action as typeof disputeActions[number]))throw new LedgerInvalid('Acción de disputa inválida.')
 if(action==='CLAIM' && ['OPEN','ESCALATED','UNDER_REVIEW','AWAITING_RESPONSE'].includes(status))return 'UNDER_REVIEW'
 if(status==='UNDER_REVIEW'){
  if(action==='REQUEST_INFO')return 'AWAITING_RESPONSE'
  if(action==='ESCALATE')return 'ESCALATED'
  if(['RESOLVE_NO_REFUND','RECOMMEND_REFUND'].includes(action))return 'RESOLVED'
 }
 if(status==='AWAITING_RESPONSE' && action==='RESUME' || status==='RESOLVED' && action==='REOPEN')return 'UNDER_REVIEW'
 if(status==='RESOLVED' && action==='CLOSE')return 'CLOSED'
 throw new LedgerConflict('La acción no corresponde al estado actual de la disputa.')
}
export function caseText(value:unknown,min:number,max:number):string{
 if(typeof value!=='string' || value.trim().length<min || value.length>max || /[\p{Cc}\p{Cf}\p{Cs}<>]/u.test(value))throw new LedgerInvalid(`Usa texto de ${min}–${max} caracteres, sin etiquetas ni controles invisibles.`)
 return value.trim()
}
