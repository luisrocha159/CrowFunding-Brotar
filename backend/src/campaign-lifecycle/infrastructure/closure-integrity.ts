import type {EntityManager} from 'typeorm'

// Stable snapshot: changing actual progress or fulfillment invalidates a previously reviewed final.
export async function closureSnapshot(m:EntityManager,id:string):Promise<string>{
 const [r]=await m.query(`SELECT md5(jsonb_build_object(
 'activities',(SELECT COALESCE(jsonb_agg(jsonb_build_array(id,status,progress_percent,responsible_name,actual_start_on,actual_end_on) ORDER BY id),'[]') FROM public.campaign_activity WHERE campaign_id=$1),
 'milestones',(SELECT COALESCE(jsonb_agg(jsonb_build_array(id,status,progress_percent,responsible_name,actual_start_on,actual_end_on) ORDER BY id),'[]') FROM public.milestone WHERE campaign_id=$1),
 'indicators',(SELECT COALESCE(jsonb_agg(jsonb_build_array(id,achieved_value) ORDER BY id),'[]') FROM public.campaign_impact_indicator WHERE campaign_id=$1),
 'rewards',(SELECT COALESCE(jsonb_agg(jsonb_build_array(c.id,c.status,rf.status,rf.fulfilled_at,rf.fulfilled_by,x.file_id) ORDER BY c.id),'[]') FROM public.contribution c LEFT JOIN public.reward_fulfillment rf ON rf.contribution_id=c.id LEFT JOIN brotar_extension.campaign_reward_evidence x ON x.contribution_id=c.id WHERE c.campaign_id=$1 AND c.reward_id IS NOT NULL)
 )::text) AS hash`,[id]);return r.hash
}
/** A completely refunded contribution no longer owes a reward. Partial refunds do not waive it. */
export const rewardOwed=`c.reward_id IS NOT NULL AND c.status='CONFIRMED' AND EXISTS(
 SELECT 1 FROM public.payment p JOIN public.payment_provider pp ON pp.id=p.provider_id
 WHERE p.contribution_id=c.id AND pp.code='BROTAR_INTERNAL_DEMO' AND pp.is_sandbox AND p.confirmed_at IS NOT NULL
 AND p.amount>COALESCE((SELECT sum(r.amount) FROM public.refund r WHERE r.payment_id=p.id AND r.status='REFUNDED'),0))`
export async function executionPending(m:EntityManager,id:string){
 const [r]=await m.query(`SELECT
 (SELECT count(*)::int FROM public.campaign_activity WHERE campaign_id=$1 AND (status<>'COMPLETED' OR progress_percent<>100 OR actual_start_on IS NULL OR actual_end_on IS NULL OR actual_end_on>(clock_timestamp() AT TIME ZONE 'America/La_Paz')::date))+
 (SELECT count(*)::int FROM public.milestone WHERE campaign_id=$1 AND (status<>'COMPLETED' OR progress_percent<>100 OR actual_start_on IS NULL OR actual_end_on IS NULL OR actual_end_on>(clock_timestamp() AT TIME ZONE 'America/La_Paz')::date)) AS progress,
 (SELECT count(*)::int FROM public.contribution c WHERE c.campaign_id=$1 AND ${rewardOwed} AND NOT EXISTS(SELECT 1 FROM public.reward_fulfillment rf JOIN brotar_extension.campaign_reward_evidence x ON x.contribution_id=rf.contribution_id JOIN public.file_asset f ON f.id=x.file_id WHERE rf.contribution_id=c.id AND rf.status='FULFILLED' AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL)) AS rewards`,[id]);return r as {progress:number;rewards:number}
}
