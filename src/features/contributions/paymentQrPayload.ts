import type {DemoTicket} from './demoClient'
export const paymentQrOptions={errorCorrectionLevel:'M' as const,margin:4,width:288,color:{dark:'#14251AFF',light:'#FFFFFFFF'}}
export function walletPath(paymentId:string):string {
  return `/apoyo-demo?pago=${encodeURIComponent(paymentId)}#billetera`
}
export function paymentQrPayload(ticket:DemoTicket,origin:string):string {
  return new URL(walletPath(ticket.paymentId),origin).href
}
