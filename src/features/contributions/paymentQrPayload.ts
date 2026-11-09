import type {DemoTicket} from './demoClient'
export const paymentQrOptions={errorCorrectionLevel:'M' as const,margin:4,width:288,color:{dark:'#14251AFF',light:'#FFFFFFFF'}}
export function paymentQrPayload(ticket:DemoTicket):string{
  return JSON.stringify({application:'Brotar',type:'CONTRIBUTION',paymentId:ticket.paymentId,reference:ticket.reference,amount:ticket.amount,currency:ticket.currencyCode,mode:'SIMULATION',payable:false})
}
