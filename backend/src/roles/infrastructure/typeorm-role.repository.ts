import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { AssignedRole, RoleRepository } from '../application/roles'
@Injectable()
export class TypeormRoleRepository implements RoleRepository {
  constructor(private readonly database: DatabaseService) {}
  active(userId: string): Promise<AssignedRole[]> {
    return this.database.connection().query(`SELECT r.code, r.name FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id
      WHERE ur.user_id=$1 AND ur.revoked_at IS NULL AND ur.granted_at<=now()
        AND (ur.expires_at IS NULL OR ur.expires_at>now()) ORDER BY r.code`, [userId])
  }
}
