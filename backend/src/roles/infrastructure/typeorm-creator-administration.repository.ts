import type { EntityManager } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { canEnableCreator, CreatorGrantConflict, CreatorGrantDenied, ManagedUserMissing, type CreatorAdministrationRepository, type ManagedUser } from '../application/creator-administration'
import { setAuditActor } from '../../shared/infrastructure/database/audit'

const USER = `SELECT u.id,u.email::text AS email,concat_ws(' ',p.first_name,p.last_name) AS name,u.status,
  (u.locked_until IS NOT NULL AND u.locked_until>clock_timestamp()) AS locked,
  ARRAY(SELECT r.code::text FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id
    WHERE ur.user_id=u.id AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp()
    AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()) ORDER BY r.code) AS roles
  FROM public.app_user u LEFT JOIN public.user_profile p ON p.user_id=u.id`

/** Runs inside the personal identity decision. An administrative revocation is respected. */
export async function grantCreatorAfterIdentity(manager: EntityManager, actor: string, verificationId: string) {
  const [subject] = await manager.query(`SELECT u.id FROM public.verification v
    JOIN public.verification_type t ON t.id=v.verification_type_id
    JOIN public.app_user u ON u.id=v.user_id
    WHERE v.id=$1 AND v.organization_id IS NULL AND t.code='KYC_IDENTITY'
      AND v.status='APPROVED' AND (v.expires_at IS NULL OR v.expires_at>clock_timestamp())
      AND u.deleted_at IS NULL FOR UPDATE OF u`, [verificationId])
  if (!subject) return
  const [target]: ManagedUser[] = await manager.query(`${USER} WHERE u.id=$1`, [subject.id])
  if (!target || !canEnableCreator(target) || target.roles.includes('CREATOR')) return
  const [grant] = await manager.query(`INSERT INTO public.user_role(user_id,role_id,granted_by)
    SELECT $1,r.id,$2 FROM public.role r WHERE r.code='CREATOR' AND r.is_system
      AND NOT EXISTS (SELECT 1 FROM public.user_role ur WHERE ur.user_id=$1 AND ur.role_id=r.id)
    ON CONFLICT DO NOTHING RETURNING id`, [target.id, actor])
  if (grant) await manager.query(`INSERT INTO public.audit_log(actor_user_id,action,entity_name,entity_id,description,new_values)
    VALUES($1,'CREATE','user_role',$2,'Habilitación automática por identidad aprobada',
    jsonb_build_object('source','KYC_APPROVAL','verificationId',$3::text,'userId',$4::text,'role','CREATOR'))`,
    [actor, grant.id, verificationId, target.id])
}

@Injectable()
export class TypeormCreatorAdministrationRepository implements CreatorAdministrationRepository {
  constructor(private readonly database: DatabaseService) {}
  async find(email: string): Promise<ManagedUser | null> {
    const rows: ManagedUser[] = await this.database.connection().query(`${USER} WHERE u.email=$1 AND u.deleted_at IS NULL`, [email])
    return rows[0] ?? null
  }
  grant(actorId: string, userId: string, reason: string) {
    return this.database.connection().transaction(async manager => {
      // Serializa concesiones concurrentes sin ampliar UPDATE sobre user_role.
      await manager.query('SELECT id FROM public.app_user WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[actorId, userId]])
      const users: ManagedUser[] = await manager.query(`${USER} WHERE u.id=ANY($1::uuid[]) AND u.deleted_at IS NULL`, [[actorId, userId]])
      const actor = users.find(user => user.id === actorId)
      if (!actor || actor.locked || !['ACTIVE', 'PENDING_VERIFICATION'].includes(actor.status)
        || !actor.roles.includes('ADMIN') || actor.roles.includes('AUDITOR')) throw new CreatorGrantDenied()
      const target = users.find(user => user.id === userId)
      if (!target) throw new ManagedUserMissing()
      if (!canEnableCreator(target)) throw new CreatorGrantConflict()
      const result = { id: userId, role: 'CREATOR' as const, created: false, provisional: true as const }
      if (target.roles.includes('CREATOR')) return result
      const roles: { id: string }[] = await manager.query("SELECT id FROM public.role WHERE code='CREATOR' AND is_system=true")
      if (!roles[0]) throw new CreatorGrantConflict()
      const existing: { id: string }[] = await manager.query('SELECT id FROM public.user_role WHERE user_id=$1 AND role_id=$2 AND revoked_at IS NULL', [userId, roles[0].id])
      // Una concesión vencida/futura requiere revisión, no reactivación silenciosa.
      if (existing.length) throw new CreatorGrantConflict()
      await setAuditActor(manager,actorId)
      const [grant]: { id: string }[] = await manager.query('INSERT INTO public.user_role(user_id,role_id,granted_by) VALUES($1,$2,$3) RETURNING id', [userId, roles[0].id, actorId])
      await manager.query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,entity_id,description,new_values)
        VALUES($1,'ADMIN','CREATE','user_role',$2,$3,jsonb_build_object('source','APPLICATION','result','APPLIED','userId',$4::text,'role','CREATOR','provisional',true,'verificationChanged',false))`,
      [actorId, grant!.id, reason, userId])
      // Ni contraseña ni estado ni KYC se modifican. Auditoría y rol se confirman juntos.
      return { ...result, created: true }
    })
  }
}
