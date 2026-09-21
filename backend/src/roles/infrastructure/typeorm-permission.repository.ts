import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { PermissionRepository } from '../application/permissions'

@Injectable()
export class TypeormPermissionRepository implements PermissionRepository {
  constructor(private readonly database: DatabaseService) {}

  async granted(userId: string): Promise<string[]> {
    // Solo roles vigentes: concedidos, no revocados y no caducados, igual que TypeormRoleRepository.
    const rows: { code: string }[] = await this.database.connection().query(
      `SELECT DISTINCT p.code FROM public.user_role ur
         JOIN public.role r ON r.id = ur.role_id
         JOIN public.role_permission rp ON rp.role_id = r.id
         JOIN public.permission p ON p.id = rp.permission_id
        WHERE ur.user_id = $1 AND ur.revoked_at IS NULL AND ur.granted_at <= now()
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
        ORDER BY p.code`, [userId])
    return rows.map((row) => row.code)
  }
}
