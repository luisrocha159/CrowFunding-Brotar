import type { EntityManager } from 'typeorm'

/** Contexto local de transacción: nunca dejar una identidad en la conexión del pool. */
export async function setAuditActor(manager: EntityManager, actorId: string | null): Promise<void> {
  if (actorId!==null && !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(actorId)) throw new Error('Actor de auditoría inválido.')
  await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id',actorId ?? ''])
}

/** No acepta cuerpos, textos, motivos, credenciales ni datos del proveedor. Solo metadatos tipados. */
export async function recordAudit(manager: EntityManager, actorId: string | null,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'STATUS_CHANGE' | 'PAYMENT_EVENT' | 'LOGIN' | 'LOGOUT' | 'READ' | 'EXPORT',
  entity: 'campaign' | 'contribution' | 'payment' | 'demo_event' | 'reconciliation' | 'reconciliation_item' | 'verification' | 'refund' | 'dispute' | 'disbursement' | 'payout_account' | 'app_user' | 'user_profile' | 'organization' | 'organization_member' | 'file_asset' | 'support_case' | 'campaign_bookmark' | 'campaign_progress' | 'campaign_update' | 'support_simulation' | 'accountability_report' | 'reward_fulfillment' | 'legal_acceptance', id: string | null): Promise<void> {
  await manager.query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,entity_id,new_values,occurred_at)
    VALUES($1,CASE WHEN $1::uuid IS NULL THEN 'SYSTEM' ELSE (SELECT r.code FROM public.user_role ur
      JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=$1 AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp()
      AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()) ORDER BY r.code LIMIT 1) END,
      $2::public.audit_action,$3,$4,jsonb_build_object('result','APPLIED','source','APPLICATION'),clock_timestamp())`,[actorId,action,entity,id])
}
