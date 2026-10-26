import type {EntityManager} from 'typeorm'

/** Solo metadatos y titular; se confirma con la operación, sin copiar mensajes privados. */
export function recordSupportNotice(manager:EntityManager,id:string,actor:string,kind:'MESSAGE'|'STATUS'){
  return manager.query(`INSERT INTO brotar_extension.support_mail_event(case_id,recipient_user_id,kind,status)
    SELECT id,user_id,$3,status FROM public.support_case WHERE id=$1 AND user_id IS NOT NULL AND user_id<>$2`,[id,actor,kind])
}
