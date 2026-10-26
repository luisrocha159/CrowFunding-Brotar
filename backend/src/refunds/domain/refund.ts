import {decimal,LedgerConflict,LedgerInvalid,money} from '../../contributions/domain/payment'
export const refundActions=['AUTHORIZE','REJECT','COMPLETE_DEMO','FAIL_DEMO'] as const
export const refundReasons=['SPONSOR_REQUEST','PROJECT_CANCELLED','GOAL_NOT_REACHED','REWARD_ISSUE','OTHER','DISPUTE_RESOLUTION'] as const
export function availableRefund(paid:string,returned:string,reserved:string){const balance=money(paid)-money(returned,true)-money(reserved,true);if(balance<0n)throw new LedgerConflict('Los compromisos exceden el pago. Requiere revisión.');return decimal(balance)}
export function refundTransition(state:string,action:string){
 if(!refundActions.includes(action as typeof refundActions[number]))throw new LedgerInvalid('Acción de devolución no admitida.')
 if(state==='REQUESTED' && action==='AUTHORIZE')return 'PROCESSING'
 if(state==='REQUESTED' && action==='REJECT' || state==='PROCESSING' && action==='FAIL_DEMO')return 'FAILED'
 if(state==='PROCESSING' && action==='COMPLETE_DEMO')return 'REFUNDED'
 throw new LedgerConflict('La devolución no admite esa acción en su estado actual.')
}
