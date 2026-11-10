import {randomUUID} from 'node:crypto'
import type {EntityManager} from 'typeorm'
import {decimal,LedgerConflict,money} from '../../contributions/domain/payment'
import {syncObligationState} from '../../contributions/infrastructure/payment-obligations'
import {demoProvider} from '../../demo-payments/infrastructure/demo-payments'
import {digest} from '../../demo-payments/domain/demo'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {automaticRefundReason} from '../domain/refund'
import {refundCapacity} from './demo-refunds'

/** Llamador: bloqueo global del simulador y campaña; todo se confirma o revierte con la decisión del ciclo. */
export async function automaticCampaignRefunds(m:EntityManager,campaignId:string){
 const[campaign]=await m.query(`SELECT c.status,c.funding_model,x.outcome FROM public.campaign c LEFT JOIN brotar_extension.campaign_cycle x ON x.campaign_id=c.id WHERE c.id=$1 FOR UPDATE OF c`,[campaignId])
 const cause=campaign&&automaticRefundReason(campaign.status,campaign.funding_model,campaign.outcome)
 if(!cause)throw new LedgerConflict('La campaña aún no tiene cancelación confirmada ni obligación de devolución por meta fallida.')
 const provider=await demoProvider(m),why=cause==='PROJECT_CANCELLED'?'Devolución automática del saldo pendiente por cancelación confirmada de la campaña.':'Devolución automática del saldo pendiente por meta no alcanzada en financiación todo o nada.'
 const payments:{id:string;contribution_id:string;amount:string;currency:string}[]=await m.query(`SELECT p.id,p.contribution_id,p.amount::text,trim(p.currency_code) AS currency FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE c.campaign_id=$1 AND p.provider_id=$2 AND p.confirmed_at IS NOT NULL ORDER BY p.id FOR UPDATE OF p,c`,[campaignId,provider])
 let completed=0
 for(const payment of payments){
  const[totals]=await m.query(`SELECT COALESCE(sum(amount) FILTER(WHERE status='REFUNDED'),0)::numeric(14,2)::text AS returned FROM public.refund WHERE payment_id=$1`,[payment.id])
  if(money(totals.returned,true)>money(payment.amount))throw new LedgerConflict('El registro de devoluciones excede el aporte; requiere revisión.')
  if(money(totals.returned,true)===money(payment.amount))continue
  const[hold]=await m.query(`SELECT EXISTS(SELECT 1 FROM public.dispute d LEFT JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id WHERE d.payment_id=$1 AND (d.status NOT IN ('RESOLVED','CLOSED') OR x.financial_hold)) AS blocked`,[payment.id])
  if(hold.blocked)throw new LedgerConflict('Resuelve las disputas o retenciones financieras antes de confirmar la devolución automática.')
  const open=await m.query(`SELECT r.id,r.status,r.amount::text,x.refund_id FROM public.refund r LEFT JOIN brotar_extension.demo_refund x ON x.refund_id=r.id WHERE r.payment_id=$1 AND r.status IN ('REQUESTED','PROCESSING') ORDER BY r.id FOR UPDATE OF r`,[payment.id])
  if(open.some((r:{refund_id:string|null})=>!r.refund_id))throw new LedgerConflict('Existe una devolución ajena al flujo interno que requiere revisión antes de continuar.')
  async function finish(id:string,state:string,amount:string){
   await refundCapacity(m,campaignId,payment.currency,amount,id)
   await setAuditActor(m,null)
   for(const[action,next]of(state==='REQUESTED'?[['AUTHORIZE','PROCESSING'],['COMPLETE_DEMO','REFUNDED']]:[['COMPLETE_DEMO','REFUNDED']])){
    const key=digest(`automatic-refund:${id}:${action}`),hash=digest(JSON.stringify([campaignId,payment.id,cause,amount,action]))
    await m.query(`UPDATE public.refund SET status=$2::refund_status,processed_at=CASE WHEN $2='PROCESSING' THEN clock_timestamp() ELSE processed_at END,completed_at=CASE WHEN $2='REFUNDED' THEN clock_timestamp() ELSE completed_at END,external_reference=CASE WHEN $2='REFUNDED' THEN $3 ELSE external_reference END,provider_payload=COALESCE(provider_payload,'{}'::jsonb)||jsonb_build_object('mode','DEMO','automaticSource',$4::text),failure_message=NULL WHERE id=$1`,[id,next,`DEMO-REFUND:${id}`,cause])
    await m.query('UPDATE brotar_extension.demo_refund SET version=version+1 WHERE refund_id=$1',[id])
    await m.query(`INSERT INTO brotar_extension.demo_refund_event(refund_id,actor_id,action,previous_status,status,request_key,request_hash,reason) VALUES($1,NULL,$2,$3::refund_status,$4::refund_status,$5,$6,$7)`,[id,action,state,next,key,hash,why])
    await recordAudit(m,null,'STATUS_CHANGE','refund',id);state=next!
   }
   completed++
  }
  for(const refund of open)await finish(refund.id,refund.status,refund.amount)
  const[updated]=await m.query(`SELECT COALESCE(sum(amount) FILTER(WHERE status='REFUNDED'),0)::numeric(14,2)::text AS returned FROM public.refund WHERE payment_id=$1`,[payment.id])
  const remaining=money(payment.amount)-money(updated.returned,true)
  if(remaining<0n)throw new LedgerConflict('Las devoluciones existentes exceden el aporte.')
  if(remaining>0n){
   const amount=decimal(remaining);await refundCapacity(m,campaignId,payment.currency,amount)
   const id=randomUUID(),key=digest(`automatic-refund:${campaignId}:${payment.id}:${updated.returned}`),hash=digest(JSON.stringify([payment.id,amount,cause]))
   await setAuditActor(m,null)
   await m.query(`INSERT INTO public.refund(id,payment_id,contribution_id,amount,currency_code,reason_code,reason_detail,requested_by,provider_payload) VALUES($1,$2,$3,$4,$5,$6::text,$7,NULL,jsonb_build_object('mode','DEMO','automaticSource',$6::text))`,[id,payment.id,payment.contribution_id,amount,payment.currency,cause,why])
   await m.query('INSERT INTO brotar_extension.demo_refund(refund_id,request_key,request_hash) VALUES($1,$2,$3)',[id,key,hash])
   await m.query(`INSERT INTO brotar_extension.demo_refund_event(refund_id,actor_id,action,previous_status,status,request_key,request_hash,reason) VALUES($1,NULL,'REQUEST',NULL,'REQUESTED',$2,$3,$4)`,[id,key,hash,why])
   await recordAudit(m,null,'CREATE','refund',id);await finish(id,'REQUESTED',amount)
  }
  await syncObligationState(m,payment.id,null)
 }
 return{completed,payments:payments.length}
}
