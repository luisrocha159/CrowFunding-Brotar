import type { EntityManager } from 'typeorm'
import { LedgerConflict, LedgerInvalid } from '../../contributions/domain/payment'
import { recordAudit } from '../../shared/infrastructure/database/audit'
import { rewardOwed } from '../../campaign-lifecycle/infrastructure/closure-integrity'

/** Shared by progress management and closure. Caller holds the campaign lock and rechecks owner access after this function. */
export async function fulfillCampaignReward(m:EntityManager,actor:string,campaignId:string,id:string,on:string,file:string,notes:string) {
  const [c]=await m.query(`SELECT c.status,(x.execution_started_at AT TIME ZONE 'America/La_Paz')::date::text AS execution_on FROM public.campaign c LEFT JOIN brotar_extension.campaign_cycle x ON x.campaign_id=c.id WHERE c.id=$1`,[campaignId])
  if(c?.status!=='IN_EXECUTION'||!c.execution_on||on<c.execution_on)throw new LedgerConflict('El cumplimiento pertenece a una fecha real de ejecución.')
  const [contribution]=await m.query(`SELECT c.id FROM public.contribution c WHERE c.id=$1 AND c.campaign_id=$2 AND ${rewardOwed} FOR UPDATE OF c`,[id,campaignId])
  if(!contribution)throw new LedgerInvalid('No hay una recompensa exigible en este aporte.')
  const [old]=await m.query(`SELECT status,(fulfilled_at AT TIME ZONE 'America/La_Paz')::date::text AS fulfilled_on FROM public.reward_fulfillment WHERE contribution_id=$1 FOR UPDATE`,[id])
  if((await m.query('SELECT file_id FROM brotar_extension.campaign_reward_evidence WHERE contribution_id=$1',[id])).length)throw new LedgerConflict('Este cumplimiento ya está registrado y se conserva.')
  if(old?.status==='FULFILLED'&&old.fulfilled_on!==on)throw new LedgerConflict(`El cumplimiento histórico ya tiene fecha ${old.fulfilled_on}; adjunta respaldo sin cambiarla.`)
  const files=await m.query(`SELECT id FROM public.file_asset WHERE id=$1 AND uploaded_by=$2 AND scope='PRIVATE' AND storage_key LIKE 'CLOSURE_EVIDENCE/%' AND deleted_at IS NULL FOR UPDATE`,[file,actor])
  if(!files.length)throw new LedgerInvalid('La evidencia privada no está disponible o no pertenece a esta cuenta.')
  if((await m.query('SELECT contribution_id FROM brotar_extension.campaign_reward_evidence WHERE file_id=$1',[file])).length)throw new LedgerInvalid('La evidencia ya se utilizó para otra recompensa.')
  if(old?.status!=='FULFILLED')await m.query(`INSERT INTO public.reward_fulfillment(contribution_id,status,fulfilled_by,fulfilled_at,notes) VALUES($1,'FULFILLED',$2,($3::date+time '00:00') AT TIME ZONE 'America/La_Paz',$4) ON CONFLICT(contribution_id) DO UPDATE SET status='FULFILLED',fulfilled_by=EXCLUDED.fulfilled_by,fulfilled_at=EXCLUDED.fulfilled_at,notes=EXCLUDED.notes`,[id,actor,on,notes])
  await m.query('INSERT INTO brotar_extension.campaign_reward_evidence(contribution_id,file_id,recorded_by) VALUES($1,$2,$3)',[id,file,actor])
  await rewardHistorySnapshot(m,actor,id,notes)
  const [fulfillment]=await m.query('SELECT id FROM public.reward_fulfillment WHERE contribution_id=$1',[id])
  await recordAudit(m,actor,'UPDATE','reward_fulfillment',fulfillment.id)
}
export async function rewardHistorySnapshot(m:EntityManager,actor:string,id:string,notes:string) {
  await m.query(`INSERT INTO brotar_extension.reward_history(contribution_id,actor_id,reason,snapshot)
    SELECT $1,$2,$3,jsonb_build_object('status',f.status,'notes',f.notes,'fulfilledAt',f.fulfilled_at,'fulfilledBy',f.fulfilled_by,'fileId',e.file_id)
    FROM public.reward_fulfillment f LEFT JOIN brotar_extension.campaign_reward_evidence e ON e.contribution_id=f.contribution_id WHERE f.contribution_id=$1`,[id,actor,notes])
}
