import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { UserSchema } from '../../users/infrastructure/persistence/user.schemas'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
import { OrganizationAccessUnavailable, OrganizationTypeUnavailable, type Organization, type OrganizationInput, type OrganizationRepository, type OrganizationType } from '../application/organizations'

const selectOwn = `SELECT o.id, o.legal_name AS "legalName", COALESCE(o.trade_name,'') AS "tradeName",
  o.organization_type_id AS "organizationTypeId", COALESCE(o.contact_email::text,'') AS "contactEmail",
  COALESCE(o.contact_phone,'') AS "contactPhone", o.status, t.name AS "typeName", m.organization_role AS "membershipRole"
  FROM public.organization o JOIN public.organization_type t ON t.id=o.organization_type_id
  JOIN public.organization_member m ON m.organization_id=o.id
  WHERE m.user_id=$1 AND m.left_at IS NULL AND m.joined_at<=now() AND o.deleted_at IS NULL`
@Injectable()
export class TypeormOrganizationRepository implements OrganizationRepository {
  constructor(private readonly database: DatabaseService) {}
  types(): Promise<OrganizationType[]> {
    return this.database.connection().query('SELECT id, code, name FROM public.organization_type WHERE is_active=true ORDER BY name')
  }
  list(userId: string): Promise<Organization[]> {
    return this.database.connection().query(`${selectOwn} ORDER BY o.created_at DESC, o.id`, [userId])
  }
  private async select(manager: EntityManager, userId: string, id: string): Promise<Organization | null> {
    const rows: Organization[] = await manager.query(`${selectOwn} AND o.id=$2`, [userId, id])
    return rows[0] ?? null
  }
  find(userId: string, id: string) { return this.select(this.database.connection().manager, userId, id) }
  create(userId: string, input: OrganizationInput): Promise<Organization> {
    return this.database.connection().transaction(async manager => {
      const user = await manager.getRepository(UserSchema).createQueryBuilder('u').setLock('pessimistic_write')
        .where('u.id=:userId AND u.status IN (:...statuses) AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until<=now())', { userId, statuses: BASIC_ACCESS_STATUSES }).getOne()
      if (!user) throw new OrganizationAccessUnavailable()
      const roles: { id: string }[] = await manager.query(`SELECT ur.id FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id
        WHERE ur.user_id=$1 AND r.code='REGISTERED_USER' AND ur.revoked_at IS NULL AND ur.granted_at<=now()
        AND (ur.expires_at IS NULL OR ur.expires_at>now())`, [userId])
      if (!roles.length) throw new OrganizationAccessUnavailable()
      const types: { id: string }[] = await manager.query('SELECT id FROM public.organization_type WHERE id=$1 AND is_active=true', [input.organizationTypeId])
      if (!types.length) throw new OrganizationTypeUnavailable()
      const id = randomUUID()
      await manager.query(`INSERT INTO public.organization(id,slug,legal_name,trade_name,organization_type_id,contact_email,contact_phone,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, `org-${id}`, input.legalName, input.tradeName || null, input.organizationTypeId, input.contactEmail, input.contactPhone || null, userId])
      await manager.query(`INSERT INTO public.organization_member(organization_id,user_id,organization_role) VALUES($1,$2,'OWNER')`, [id, userId])
      const result = await this.select(manager, userId, id)
      if (!result) throw new Error('No se pudo confirmar el registro de organización.')
      return result
    })
  }
}
