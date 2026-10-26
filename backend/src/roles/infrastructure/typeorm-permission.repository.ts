import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { PermissionRepository } from '../application/permissions'
import {ACCESS_POLICY} from '../domain/access-policy'

@Injectable()
export class TypeormPermissionRepository implements PermissionRepository {
  constructor(private readonly database: DatabaseService) {}

  async granted(userId: string): Promise<string[]> {
    // Solo roles vigentes: concedidos, no revocados y no caducados, igual que TypeormRoleRepository.
    const rows: { code: string; role:string }[] = await this.database.connection().query(
      `SELECT DISTINCT p.code,r.code AS role FROM public.user_role ur
         JOIN public.role r ON r.id = ur.role_id
         JOIN public.role_permission rp ON rp.role_id = r.id
         JOIN public.permission p ON p.id = rp.permission_id
        WHERE ur.user_id = $1 AND ur.revoked_at IS NULL AND ur.granted_at <= now()
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
        ORDER BY p.code`, [userId])
    // Una concesión residual en SQL no amplía la matriz acordada de un permiso conocido.
    return [...new Set(rows.filter(row=>{
      const rule=ACCESS_POLICY[row.code as keyof typeof ACCESS_POLICY]
      return !rule || (rule.roles as readonly string[]).includes(row.role)
    }).map(row=>row.code))].sort()
  }
}
