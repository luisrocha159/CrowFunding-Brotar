import {NotFoundException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {money} from '../../contributions/domain/payment'
import {demoProvider} from '../../demo-payments/infrastructure/demo-payments'
import {availableRefund,automaticRefundReason} from '../domain/refund'
import {refundCapacity} from './demo-refunds'
import {LedgerConflict} from '../../contributions/domain/payment'

/** Lectura privada: no crea reservas ni ejecuta devoluciones. La escritura vuelve a comprobarlo bajo bloqueo. */
export async function refundEligibility(m:EntityManager,actor:string,paymentId:string){
 const provider=await demoProvider(m)
 const[p]=await m.query(`SELECT p.id AS "paymentId",p.amount::text AS original,trim(p.currency_code) AS "currencyCode",p.status,p.confirmed_at,c.id AS "contributionId",c.reference_code AS reference,ca.title AS "campaignTitle",ca.status AS "campaignStatus",ca.funding_model,x.outcome,ca.id AS campaign_id,
 (c.reward_id IS NOT NULL) AS "hasReward"
 FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.campaign ca ON ca.id=c.campaign_id LEFT JOIN brotar_extension.campaign_cycle x ON x.campaign_id=ca.id
 WHERE p.id=$1 AND c.user_id=$2 AND p.provider_id=$3`,[paymentId,actor,provider])
 if(!p)throw new NotFoundException('Pago no disponible para tu cuenta.')
 const[t]=await m.query(`SELECT COALESCE(sum(amount) FILTER(WHERE status='REFUNDED'),0)::numeric(14,2)::text AS returned,COALESCE(sum(amount) FILTER(WHERE status IN ('REQUESTED','PROCESSING')),0)::numeric(14,2)::text AS reserved FROM public.refund WHERE payment_id=$1`,[paymentId])
 const[open]=await m.query(`SELECT r.id FROM public.refund r JOIN brotar_extension.demo_refund x ON x.refund_id=r.id WHERE r.payment_id=$1 AND r.status IN ('REQUESTED','PROCESSING') ORDER BY r.requested_at LIMIT 1`,[paymentId])
 const[held]=await m.query(`SELECT EXISTS(SELECT 1 FROM public.dispute d LEFT JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id WHERE d.payment_id=$1 AND (d.status NOT IN ('RESOLVED','CLOSED') OR x.financial_hold)) AS blocked`,[paymentId])
 const remaining=availableRefund(p.original,t.returned,t.reserved),automaticReason=automaticRefundReason(p.campaignStatus,p.funding_model,p.outcome),blocks:string[]=[]
 if(!p.confirmed_at)blocks.push('Solo puedes solicitar una devolución de un pago confirmado.')
 else if(p.status!=='CONFIRMED'&&money(remaining,true)>0n)blocks.push('El estado actual del pago no permite una nueva solicitud; consulta sus movimientos y disputas.')
 if(open||money(t.reserved,true)>0n)blocks.push('Ya existe una devolución en curso. Consulta su estado antes de repetir.')
 if(money(remaining,true)===0n)blocks.push('No queda saldo disponible para una nueva devolución.')
 if(held.blocked)blocks.push('Hay una disputa o retención pendiente de resolución.')
 if(automaticReason)blocks.push('Esta campaña tiene devolución automática del saldo restante. No necesitas presentar una solicitud manual.')
 if(!blocks.length){try{await refundCapacity(m,p.campaign_id,p.currencyCode,remaining)}catch(e){if(e instanceof LedgerConflict)blocks.push(e.message);else throw e}}
 return{paymentId:p.paymentId,contributionId:p.contributionId,reference:p.reference,campaignTitle:p.campaignTitle,campaignStatus:p.campaignStatus,currencyCode:p.currencyCode,original:p.original,returned:t.returned,reserved:t.reserved,remaining,automaticReason,openRefundId:open?.id??null,canRequest:!blocks.length,blocks,allowedReasons:['SPONSOR_REQUEST',...(p.hasReward?['REWARD_ISSUE']:[]),'OTHER']}
}
