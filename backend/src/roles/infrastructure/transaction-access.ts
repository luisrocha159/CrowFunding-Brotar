import {ForbiddenException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {ACCESS_POLICY} from '../domain/access-policy'
/** Escrituras personales: también se revalida tras esperar bloqueos; no concede roles internos. */
export async function transactionRegisteredAccess(manager:EntityManager,actor:string) {
 await manager.query('SELECT id FROM public.app_user WHERE id=$1 FOR SHARE',[actor])
 const [allowed]=await manager.query(`SELECT u.id FROM public.app_user u WHERE u.id=$1 AND u.deleted_at IS NULL
  AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
  AND EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='REGISTERED_USER'
   AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()))
  AND NOT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='AUDITOR'
   AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()))`,[actor])
 if(!allowed)throw new ForbiddenException('La cuenta debe estar habilitada y AUDITOR conserva solo lectura.')
}
/** Revalidar después de esperar el bloqueo de negocio. La gestión de roles bloquea esta misma cuenta. */
export async function transactionAccess(manager:EntityManager,actor:string,permission:keyof typeof ACCESS_POLICY) {
 await manager.query('SELECT id FROM public.app_user WHERE id=$1 FOR SHARE',[actor])
 const rule=ACCESS_POLICY[permission]
 const [allowed]=await manager.query(`SELECT u.id FROM public.app_user u WHERE u.id=$1 AND u.deleted_at IS NULL
  AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
  AND EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id JOIN public.role_permission rp ON rp.role_id=r.id JOIN public.permission p ON p.id=rp.permission_id
    WHERE ur.user_id=u.id AND r.code=ANY($2::text[]) AND p.code=$3 AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()))
  AND ($4::boolean OR NOT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='AUDITOR'
    AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())))`,[actor,[...rule.roles],permission,rule.action==='read'])
 if(!allowed)throw new ForbiddenException('La responsabilidad o el permiso vigente no autoriza esta operación.')
}
