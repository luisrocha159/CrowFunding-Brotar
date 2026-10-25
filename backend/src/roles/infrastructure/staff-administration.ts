import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { setAuditActor } from '../../shared/infrastructure/database/audit'
import { staffChange, StaffRoleConflict, StaffRoleDenied, StaffUserMissing } from '../domain/staff-role'

/** Gestión acotada de responsabilidades. No administra perfiles, KYC ni credenciales. */
@Injectable()
export class StaffAdministration {
  constructor(private readonly database: DatabaseService) {}
  change(actorId: string, userId: string, roleCode: string, operation: 'GRANT' | 'REVOKE', reason: string) {
    const input = staffChange(actorId, userId, roleCode, reason)
    return this.database.connection().transaction(async manager => {
      // Mismo orden de bloqueo que el habilitador CREATOR: evita ciclos entre administradores.
      await manager.query('SELECT id FROM public.app_user WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[actorId, userId]])
      const rows: { id: string; available: boolean; basic: boolean; roles: string[] }[] = await manager.query(`SELECT u.id,
        (u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=now())) AS available,
        EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id
          AND r.code='REGISTERED_USER' AND ur.revoked_at IS NULL AND ur.granted_at<=now() AND (ur.expires_at IS NULL OR ur.expires_at>now())) AS basic,
        ARRAY(SELECT r.code::text FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id
          AND ur.revoked_at IS NULL AND ur.granted_at<=now() AND (ur.expires_at IS NULL OR ur.expires_at>now())) AS roles
        FROM public.app_user u WHERE u.id=ANY($1::uuid[]) AND u.deleted_at IS NULL`, [[actorId, userId]])
      const actor = rows.find(row => row.id === actorId), target = rows.find(row => row.id === userId)
      const permission = await manager.query(`SELECT 1 FROM public.role_permission rp JOIN public.role r ON r.id=rp.role_id
        JOIN public.permission p ON p.id=rp.permission_id WHERE r.code='ADMIN' AND p.code='roles.manage'`)
      if (!actor?.available || !actor.basic || !actor.roles.includes('ADMIN') || actor.roles.includes('AUDITOR') || !permission.length) throw new StaffRoleDenied('Se requiere ADMIN vigente sin AUDITOR.')
      if (!target) throw new StaffUserMissing('Cuenta no disponible.')
      // Revocar también debe ser posible si el destinatario está suspendido/bloqueado.
      if (operation === 'GRANT' && (!target.available || !target.basic || (target.roles.includes('AUDITOR') && input.role !== 'AUDITOR'))) throw new StaffRoleConflict('No se concede este rol a una cuenta bloqueada, suspendida o con AUDITOR.')
      const [role]: { id: string }[] = await manager.query('SELECT id FROM public.role WHERE code=$1 AND is_system=true', [input.role])
      if (!role) throw new StaffRoleConflict('Falta el catálogo de responsabilidades.')
      const grants: { id: string; active: boolean }[] = await manager.query(`SELECT id,
        granted_at<=now() AND (expires_at IS NULL OR expires_at>now()) AS active FROM public.user_role
        WHERE user_id=$1 AND role_id=$2 AND revoked_at IS NULL FOR UPDATE`, [userId, role.id])
      const result = { id: userId, role: input.role, operation, changed: false }
      if (operation === 'GRANT' && grants.some(grant => grant.active)) return result
      if (operation === 'GRANT' && grants.length) throw new StaffRoleConflict('Revoca explícitamente la concesión vencida o futura antes de conceder una nueva.')
      if (operation === 'REVOKE' && !grants.length) return result
      await setAuditActor(manager, actorId)
      let grantId: string
      if (operation === 'GRANT') {
        const [grant]: { id: string }[] = await manager.query('INSERT INTO public.user_role(user_id,role_id,granted_by) VALUES($1,$2,$3) RETURNING id', [userId, role.id, actorId])
        grantId = grant!.id
      } else {
        await manager.query('UPDATE public.user_role SET revoked_at=clock_timestamp() WHERE user_id=$1 AND role_id=$2 AND revoked_at IS NULL', [userId, role.id])
        grantId = grants[0]!.id
      }
      await manager.query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,entity_id,description,new_values)
        VALUES($1,'ADMIN',$2::public.audit_action,'user_role',$3,$4,
          jsonb_build_object('source','APPLICATION','result','APPLIED','operation',$5::text,'role',$6::text))`,
      [actorId, operation === 'GRANT' ? 'CREATE' : 'UPDATE', grantId, input.reason, operation, input.role])
      return { ...result, changed: true }
    })
  }
}
