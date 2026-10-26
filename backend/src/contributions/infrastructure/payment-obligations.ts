import {randomUUID} from 'node:crypto'
import type {EntityManager} from 'typeorm'
import {recordAudit} from '../../shared/infrastructure/database/audit'
import {LedgerConflict,obligationState} from '../domain/payment'
/** Llamador: campaña y pago bloqueados, decisión y cambio financiero en la misma transacción. */
export async function syncObligationState(m:EntityManager,paymentId:string,actor:string){
 const[p]=await m.query(`SELECT p.status,p.confirmed_at,p.amount::text,p.contribution_id,
  COALESCE((SELECT sum(r.amount) FROM public.refund r WHERE r.payment_id=p.id AND r.status='REFUNDED'),0)::numeric(14,2)::text AS refunded,
  EXISTS(SELECT 1 FROM public.dispute d LEFT JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id LEFT JOIN public.refund r ON r.id=x.linked_refund_id WHERE d.payment_id=p.id AND (d.status NOT IN ('RESOLVED','CLOSED') OR x.financial_hold OR r.status IN ('REQUESTED','PROCESSING'))) AS disputed FROM public.payment p WHERE p.id=$1`,[paymentId])
 if(!p?.confirmed_at)throw new LedgerConflict('Solo se derivan obligaciones de pagos históricamente confirmados.')
 const state=obligationState(p.amount,p.refunded,p.disputed)
 await m.query('UPDATE public.payment SET status=$2::payment_status WHERE id=$1',[paymentId,state.payment])
 await m.query('UPDATE public.contribution SET status=$2::contribution_status WHERE id=$1',[p.contribution_id,state.contribution])
 // No altera confirmed_at, referencia, comisión, importe ni cupos históricos de recompensas.
 if(p.status!==state.payment){
  await m.query(`INSERT INTO public.payment_event(payment_id,provider_event_id,event_type,previous_status,new_status,payload) VALUES($1,$2,'demo.obligation_state',$3,$4,'{"mode":"DEMO","source":"OBLIGATION"}')`,[paymentId,`obligation:${randomUUID()}`,p.status,state.payment])
  await recordAudit(m,actor,'STATUS_CHANGE','payment',paymentId)
 }
}
