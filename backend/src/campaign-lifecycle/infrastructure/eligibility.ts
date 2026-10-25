import {ForbiddenException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {LedgerConflict} from '../../contributions/domain/payment'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {approvedPolicy,validateSubmission,InvalidVerification,VerificationPolicyUnavailable,type VerificationPolicy,type VerificationSubmission} from '../../verifications/domain/verification'

export interface CampaignSubject {id:string;creator_user_id:string;organization_id:string|null;currency_code:string;status:string}
/** Campaign row is locked by the caller before checking ownership or obligations. */
export async function ownerAccess(m:EntityManager,actor:string,c:CampaignSubject){
 await transactionAccess(m,actor,'campaign.manage.own')
 if(c.organization_id){const [org]=await m.query(`SELECT id FROM public.organization WHERE id=$1 AND deleted_at IS NULL AND status NOT IN ('SUSPENDED','CLOSED') FOR SHARE`,[c.organization_id]);if(!org)throw new LedgerConflict('La organización no está operativa.')}
 if(c.organization_id ? !(await m.query(`SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN') AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())`,[c.organization_id,actor])).length : c.creator_user_id!==actor)throw new ForbiddenException('No administras esta campaña.')
}
export async function independentActor(m:EntityManager,actor:string,c:CampaignSubject){
 // Membership mutations must lock their parent organization first (same protocol as verification).
 if(c.organization_id)await m.query('SELECT id FROM public.organization WHERE id=$1 FOR SHARE',[c.organization_id])
 if(c.creator_user_id===actor || c.organization_id && (await m.query(`SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())`,[c.organization_id,actor])).length)throw new ForbiddenException('No puedes aprobar u operar tu propia campaña u organización.')
}
export async function identityReady(m:EntityManager,c:CampaignSubject){
 const kyc=async(user:string)=>{
  const [person]=await m.query(`SELECT id FROM public.app_user WHERE id=$1 AND deleted_at IS NULL AND status IN ('ACTIVE','PENDING_VERIFICATION') AND (locked_until IS NULL OR locked_until<=clock_timestamp()) FOR SHARE`,[user])
  if(!person || !(await approved('KYC_IDENTITY',user,null)))throw new LedgerConflict('Falta KYC DEMO aprobado y vigente del titular o representante.')
 }
 const approved=async(code:string,user:string|null,org:string|null)=>{
  const rows=await m.query(`SELECT v.id,v.submitted_data AS data,p.definition,v.submitted_data->>'acceptedBy' AS representative FROM public.verification v JOIN public.verification_type t ON t.id=v.verification_type_id
   JOIN brotar_extension.verification_policy p ON p.verification_type_id=t.id AND p.version=v.submitted_data->>'policyVersion' AND p.is_active
   WHERE t.code=$1 AND t.is_active AND v.user_id IS NOT DISTINCT FROM $2::uuid AND v.organization_id IS NOT DISTINCT FROM $3::uuid AND v.status='APPROVED'
    AND v.reviewed_by IS NOT NULL AND v.reviewed_at IS NOT NULL AND v.submitted_data->>'accepted'='true' AND p.version LIKE 'mvp-demo-%'
    AND NOT EXISTS(SELECT 1 FROM public.verification newer WHERE newer.verification_type_id=v.verification_type_id AND newer.user_id IS NOT DISTINCT FROM v.user_id AND newer.organization_id IS NOT DISTINCT FROM v.organization_id AND (newer.created_at,newer.id)>(v.created_at,v.id))
    AND (v.expires_at IS NULL OR v.expires_at>clock_timestamp()) ORDER BY v.created_at DESC,v.id DESC LIMIT 1 FOR SHARE OF v`,[code,user,org])
  const row=rows[0] as {id:string;data:VerificationSubmission;definition:VerificationPolicy;representative:string}|undefined
  if(!row)return undefined
  try{
   if(!approvedPolicy(row.definition))return undefined
   const data=validateSubmission(row.definition,row.data)
   const docs=await m.query(`SELECT d.file_id FROM public.verification_document d JOIN public.file_asset f ON f.id=d.file_id WHERE d.verification_id=$1 AND d.is_valid AND f.scope='PRIVATE' AND f.deleted_at IS NULL AND f.storage_key LIKE 'VERIFICATION_DOCUMENT/%' AND d.file_id=ANY($2::uuid[]) FOR SHARE OF d,f`,[row.id,data.documents.map(d=>d.fileId)])
   if(docs.length!==data.documents.length)return undefined
   const [stillValid]=await m.query(`SELECT id FROM public.verification WHERE id=$1 AND (expires_at IS NULL OR expires_at>clock_timestamp())`,[row.id]);if(!stillValid)return undefined
  }catch(error){if(error instanceof InvalidVerification||error instanceof VerificationPolicyUnavailable)return undefined;throw error}
  return row
 }
 if(!c.organization_id){await kyc(c.creator_user_id);return}
 const [org]=await m.query(`SELECT id FROM public.organization WHERE id=$1 AND deleted_at IS NULL AND status NOT IN ('SUSPENDED','CLOSED') FOR SHARE`,[c.organization_id])
 const legal=await approved('KYB_LEGAL',null,c.organization_id),rep=await approved('KYB_REPRESENTATIVE',null,c.organization_id)
 if(!org || !legal || !rep || legal.representative!==rep.representative || !(await m.query(`SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id::text=$2 AND organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN') AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())`,[c.organization_id,rep.representative])).length)throw new LedgerConflict('Faltan KYB DEMO y representación aprobados y vigentes.')
 await kyc(rep.representative)
}

/** Canonical synthetic receipts only; the caller serializes on the campaign row. */
export async function campaignFunds(m:EntityManager,id:string,currency:string){
 const [r]=await m.query(`SELECT
  COALESCE((SELECT sum(p.amount) FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.payment_provider pp ON pp.id=p.provider_id WHERE c.campaign_id=$1 AND p.currency_code=$2 AND p.confirmed_at IS NOT NULL AND pp.code='BROTAR_INTERNAL_DEMO' AND pp.is_sandbox),0)::numeric(16,2)::text AS confirmed,
  COALESCE((SELECT sum(r.amount) FROM public.refund r JOIN public.contribution c ON c.id=r.contribution_id WHERE c.campaign_id=$1 AND r.currency_code=$2 AND r.status='REFUNDED'),0)::numeric(16,2)::text AS refunded,
  COALESCE((SELECT sum(r.amount) FROM public.refund r JOIN public.contribution c ON c.id=r.contribution_id WHERE c.campaign_id=$1 AND r.currency_code=$2 AND r.status IN ('REQUESTED','PROCESSING')),0)::numeric(16,2)::text AS refunds_reserved,
  COALESCE((SELECT sum(d.gross_amount) FROM public.disbursement d WHERE d.campaign_id=$1 AND d.currency_code=$2 AND d.status IN ('PENDING','APPROVED','PROCESSING','COMPLETED')),0)::numeric(16,2)::text AS committed,
  COALESCE((SELECT sum(d.gross_amount) FROM public.disbursement d WHERE d.campaign_id=$1 AND d.currency_code=$2 AND d.status='COMPLETED'),0)::numeric(16,2)::text AS disbursed,
  COALESCE((SELECT sum(x.hold_amount) FROM brotar_extension.demo_dispute x JOIN public.dispute d ON d.id=x.dispute_id JOIN public.payment p ON p.id=d.payment_id WHERE d.campaign_id=$1 AND p.currency_code=$2 AND x.financial_hold),0)::numeric(16,2)::text AS disputed`,[id,currency])
 return r as {confirmed:string;refunded:string;refunds_reserved:string;committed:string;disbursed:string;disputed:string}
}
export async function unsettled(m:EntityManager,id:string){
 const [r]=await m.query(`SELECT
 (SELECT count(*)::int FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE c.campaign_id=$1 AND p.status IN ('INITIATED','PENDING')) AS payments,
 (SELECT count(*)::int FROM public.dispute WHERE campaign_id=$1 AND status NOT IN ('RESOLVED','CLOSED')) AS disputes,
 (SELECT count(*)::int FROM public.support_case WHERE campaign_id=$1 AND status NOT IN ('RESOLVED','CLOSED')) AS cases,
 (SELECT count(*)::int FROM public.reconciliation_item i JOIN public.payment p ON p.id=i.payment_id JOIN public.contribution c ON c.id=p.contribution_id WHERE c.campaign_id=$1 AND i.status<>'MATCHED' AND i.resolved_at IS NULL) AS reconciliation,
 (SELECT count(*)::int FROM brotar_extension.demo_event e JOIN public.payment p ON p.id=e.payment_id JOIN public.contribution c ON c.id=p.contribution_id WHERE c.campaign_id=$1 AND e.processing IN ('RECEIVED','NEEDS_REVIEW')) AS events`,[id])
 return r as {payments:number;disputes:number;cases:number;reconciliation:number;events:number}
}
