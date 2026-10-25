import {LedgerConflict,LedgerInvalid,money,totalMoney} from '../../contributions/domain/payment'

export const cycleActions=['END_FUNDING','START_EXECUTION','REQUEST_CANCEL','REJECT_CANCEL','APPROVE_CANCEL','CLOSE'] as const
export type FundingOutcome='PENDING'|'EXECUTION_ELIGIBLE'|'REFUND_REQUIRED'|'NO_FUNDS'
export function fundingOutcome(model:string,raised:string,goal:string):FundingOutcome {
 if(!['FLEXIBLE','ALL_OR_NOTHING'].includes(model))throw new LedgerConflict('La campaña necesita un modelo de financiación definido.')
 const amount=totalMoney(raised),target=money(goal)
 return amount===0n?'NO_FUNDS':model==='FLEXIBLE'||amount>=target?'EXECUTION_ELIGIBLE':'REFUND_REQUIRED'
}
export function cycleTarget(status:string,action:string,cancelRequested:boolean,outcome:string):string {
 if(!cycleActions.includes(action as typeof cycleActions[number]))throw new LedgerInvalid('Acción del ciclo no disponible.')
 if(action==='REQUEST_CANCEL' && ['APPROVED','PUBLISHED','FUNDING_ENDED','IN_EXECUTION'].includes(status) && !cancelRequested)return status
 if(action==='REJECT_CANCEL' && cancelRequested)return status
 if(action==='APPROVE_CANCEL' && cancelRequested && ['APPROVED','PUBLISHED','FUNDING_ENDED','IN_EXECUTION'].includes(status))return 'CANCELLED'
 if(action==='END_FUNDING' && status==='PUBLISHED')return 'FUNDING_ENDED'
 if(action==='START_EXECUTION' && status==='FUNDING_ENDED' && outcome==='EXECUTION_ELIGIBLE' && !cancelRequested)return 'IN_EXECUTION'
 if(action==='CLOSE' && ['IN_EXECUTION','FUNDING_ENDED','CANCELLED'].includes(status) && !cancelRequested)return 'CLOSED'
 throw new LedgerConflict('La acción no corresponde al estado o a la solicitud de cancelación vigente.')
}
