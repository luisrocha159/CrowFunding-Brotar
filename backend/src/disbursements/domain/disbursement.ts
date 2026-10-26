import {LedgerConflict,LedgerInvalid,decimal,money} from '../../contributions/domain/payment'
export const disbursementActions=['AUTHORIZE','REJECT','PROCESS_DEMO','COMPLETE_DEMO','FAIL_DEMO'] as const
export function disbursementTarget(status:string,action:string){
 if(!disbursementActions.includes(action as typeof disbursementActions[number]))throw new LedgerInvalid('Acción de desembolso no disponible.')
 const next:Record<string,Record<string,string>>={PENDING:{AUTHORIZE:'APPROVED',REJECT:'FAILED'},APPROVED:{PROCESS_DEMO:'PROCESSING',FAIL_DEMO:'FAILED'},PROCESSING:{COMPLETE_DEMO:'COMPLETED',FAIL_DEMO:'FAILED'}}
 const target=next[status]?.[action];if(!target)throw new LedgerConflict('El desembolso no admite esta transición.');return target
}
export function syntheticDestination(reference:string,holder:string){
 if(typeof reference!=='string'||!/^DEMO-[A-Z][A-Z_-]{2,39}$/.test(reference) || typeof holder!=='string'||!/^DEMO\s[\p{L}\p{M} -]{3,90}$/u.test(holder))throw new LedgerInvalid('Usa referencia DEMO- con letras (sin números de cuenta) y titular ficticio DEMO de 8–95 caracteres.')
 return{reference,holder:holder.trim()}
}
export function disbursementAmounts(gross:string,platform='0.00',provider='0.00',other='0.00'){
 const amount=money(gross);if([platform,provider,other].some(v=>money(v,true)!==0n))throw new LedgerInvalid('Las comisiones del MVP DEMO son cero; no se aceptan costos bancarios inventados.')
 return{gross:decimal(amount),platform:'0.00',provider:'0.00',other:'0.00',net:decimal(amount)}
}
export function schedule(value:string|null,today=new Date(Date.now()-4*3600000).toISOString().slice(0,10)){
 if(value===null)return null
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(`${value}T00:00:00Z`))||new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)!==value||value<today)throw new LedgerInvalid('La fecha programada debe ser válida y no anterior a hoy en Bolivia.')
 return value
}
