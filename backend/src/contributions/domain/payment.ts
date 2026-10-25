export type PaymentState = 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'DISPUTED'
export type IncomingState = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED'
export class LedgerInvalid extends Error {}
export class LedgerConflict extends Error {}

/** numeric(14,2): céntimos exactos, nunca parseFloat ni redondeo silencioso. */
export function money(value: unknown, allowZero = false): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value)) throw new LedgerInvalid('Importe decimal inválido.')
  const [whole, fraction = ''] = value.split('.')
  const cents = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'))
  if (!allowZero && cents === 0n) throw new LedgerInvalid('El importe debe ser positivo.')
  return cents
}
export function decimal(cents: bigint): string {
  if (cents<0n || cents>99999999999999n) throw new LedgerInvalid('Importe fuera de numeric(14,2).')
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}
/** Aggregates numeric(16,2); individual requests retain the stricter money() limit. */
export function totalMoney(value:string):bigint{
 if(typeof value!=='string'||!/^(0|[1-9]\d{0,13})(\.\d{1,2})?$/.test(value))throw new LedgerInvalid('Total decimal fuera de numeric(16,2).')
 const [whole,fraction='']=value.split('.');return BigInt(whole!)*100n+BigInt(fraction.padEnd(2,'0'))
}
export function totalDecimal(cents:bigint):string{
 if(cents<0n||cents>9999999999999999n)throw new LedgerConflict('Saldo agregado incoherente o fuera de límite.')
 return `${cents/100n}.${String(cents%100n).padStart(2,'0')}`
}
export function nextPaymentState(current: PaymentState, incoming: IncomingState): PaymentState {
  if (!['PENDING','CONFIRMED','FAILED','EXPIRED'].includes(incoming)) throw new LedgerInvalid('Estado externo no admitido.')
  if (current === incoming) return current
  // Un aviso antiguo no desconfirma dinero. Reembolsos/disputas usan sus propios registros.
  if (['CONFIRMED','REFUNDED','DISPUTED'].includes(current)) return current
  if (current === 'FAILED' || current === 'EXPIRED') throw new LedgerConflict('Intento terminal: requiere revisión, no reactivación silenciosa.')
  return incoming
}
export function uuid(value: string): void {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new LedgerInvalid('Identificador inválido.')
}

/** Solo pagos confirmados históricamente: reserva no equivale a salida de dinero. */
export function obligationState(paid:string,refunded:string,disputed:boolean):{payment:PaymentState;contribution:'CONFIRMED'|'REFUNDED'}{
 const amount=money(paid),returned=money(refunded,true)
 if(returned>amount)throw new LedgerConflict('Las devoluciones exceden el pago confirmado.')
 const full=returned===amount
 return{payment:full?'REFUNDED':disputed?'DISPUTED':'CONFIRMED',contribution:full?'REFUNDED':'CONFIRMED'}
}
