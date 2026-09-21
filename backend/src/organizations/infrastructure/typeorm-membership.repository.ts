import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { MembershipRepository } from '../application/memberships'

@Injectable()
export class TypeormMembershipRepository implements MembershipRepository {
  constructor(private readonly database: DatabaseService) {}

  async roleOf(userId: string, organizationId: string): Promise<string | null> {
    // Membresía vigente sobre organización no eliminada; misma condición que selectOwn.
    const rows: { organizationRole: string }[] = await this.database.connection().query(
      `SELECT m.organization_role AS "organizationRole"
         FROM public.organization_member m
         JOIN public.organization o ON o.id = m.organization_id
        WHERE m.user_id = $1 AND m.organization_id = $2
          AND m.left_at IS NULL AND m.joined_at <= now() AND o.deleted_at IS NULL`,
      [userId, organizationId])
    return rows[0]?.organizationRole ?? null
  }
}
