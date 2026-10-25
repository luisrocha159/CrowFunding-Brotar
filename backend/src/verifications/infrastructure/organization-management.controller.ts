import { Body, ConflictException, Controller, ForbiddenException, Get, Header, Injectable, NotFoundException, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common'
import { IsString, Length } from 'class-validator'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { OrganizationDto } from '../../organizations/infrastructure/organization.controller'
import { normalizeOrganization, type Organization } from '../../organizations/domain/organization'
import { ORGANIZATION_MANAGERS } from '../../organizations/domain/membership'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
import type { EntityManager } from 'typeorm'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
export interface ManagedOrganization extends Organization { version: string; canEdit: boolean }
class OrganizationUpdateDto extends OrganizationDto { @IsString() @Length(1,100) expectedVersion!: string }
const select = `SELECT o.id,o.legal_name AS "legalName",COALESCE(o.trade_name,'') AS "tradeName",o.organization_type_id AS "organizationTypeId",
  COALESCE(o.contact_email::text,'') AS "contactEmail",COALESCE(o.contact_phone,'') AS "contactPhone",o.status,t.name AS "typeName",m.organization_role AS "membershipRole",o.updated_at::text AS version,
  (o.status='DRAFT' AND m.organization_role::text=ANY($2::text[]) AND NOT EXISTS(SELECT 1 FROM public.verification v WHERE v.organization_id=o.id AND v.status IN ('PENDING','IN_REVIEW','APPROVED'))) AS "canEdit"
  FROM public.organization o JOIN public.organization_type t ON t.id=o.organization_type_id JOIN public.organization_member m ON m.organization_id=o.id
  WHERE m.user_id=$1 AND (m.left_at IS NULL OR m.left_at>clock_timestamp()) AND m.joined_at<=clock_timestamp() AND o.deleted_at IS NULL`
@Injectable()
export class OrganizationManagement {
  constructor(private readonly database: DatabaseService) {}
  private async actor(manager: EntityManager, id: string, write: boolean) {
    const rows: { code: string }[] = await manager.query(`SELECT r.code FROM public.app_user u JOIN public.user_role ur ON ur.user_id=u.id JOIN public.role r ON r.id=ur.role_id
      WHERE u.id=$1 AND u.status::text=ANY($2::text[]) AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
      AND ur.granted_at<=clock_timestamp() AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()) ${write ? 'FOR SHARE OF u' : ''}`, [id, BASIC_ACCESS_STATUSES])
    if (!rows.some(row => row.code==='REGISTERED_USER') || (write && rows.some(row => row.code==='AUDITOR'))) throw new ForbiddenException('Tu cuenta no permite esta operación.')
  }
  async list(userId: string): Promise<ManagedOrganization[]> {
    const manager = this.database.connection().manager
    await this.actor(manager, userId, false)
    return manager.query(`${select} ORDER BY o.created_at DESC,o.id`, [userId, ORGANIZATION_MANAGERS])
  }
  async save(userId: string, id: string, input: OrganizationUpdateDto): Promise<ManagedOrganization> {
    return this.database.connection().transaction(async manager => {
      await this.actor(manager, userId, true)
      const rows: ManagedOrganization[] = await manager.query(`${select} AND o.id=$3 FOR UPDATE OF o`, [userId, ORGANIZATION_MANAGERS, id])
      const before = rows[0]
      if (!before) throw new NotFoundException('Organización no disponible.')
      if (!ORGANIZATION_MANAGERS.some(role => role===before.membershipRole)) throw new ForbiddenException('Tu membresía no permite editar esta organización.')
      const verifying: { found: boolean }[] = await manager.query("SELECT EXISTS(SELECT 1 FROM public.verification WHERE organization_id=$1 AND status IN ('PENDING','IN_REVIEW','APPROVED')) AS found", [id])
      if (!before.canEdit || verifying[0]?.found) throw new ConflictException('Los datos están vinculados a una verificación o estado que requiere revisión. Consulta al equipo responsable.')
      if (before.version!==input.expectedVersion) throw new ConflictException('La organización cambió. Recarga sus datos antes de guardar.')
      const types: { id: string }[] = await manager.query('SELECT id FROM public.organization_type WHERE id=$1 AND is_active', [input.organizationTypeId])
      if (!types.length) throw new ConflictException('El tipo de organización ya no está disponible.')
      await this.actor(manager, userId, true)
      const membership: { allowed: boolean }[] = await manager.query("SELECT EXISTS(SELECT 1 FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND (left_at IS NULL OR left_at>clock_timestamp()) AND joined_at<=clock_timestamp() AND organization_role::text=ANY($3::text[])) AS allowed", [id,userId,ORGANIZATION_MANAGERS])
      if (!membership[0]?.allowed) throw new ForbiddenException('Tu membresía cambió; recarga los datos.')
      const value = normalizeOrganization(input)
      await manager.query(`UPDATE public.organization SET legal_name=$2,trade_name=$3,organization_type_id=$4,contact_email=$5,contact_phone=$6 WHERE id=$1`, [id, value.legalName, value.tradeName, value.organizationTypeId, value.contactEmail, value.contactPhone || null])
      await setAuditActor(manager,userId)
      await recordAudit(manager,userId,'UPDATE','organization',id)
      const after: ManagedOrganization[] = await manager.query(`${select} AND o.id=$3`, [userId, ORGANIZATION_MANAGERS, id])
      return after[0]!
    })
  }
}
@Controller('me/organizations') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class OrganizationManagementController {
  constructor(private readonly organizations: OrganizationManagement) {}
  @Get() @Header('Cache-Control','no-store')
  list(@Req() request: AuthenticatedRequest) { return this.organizations.list(request.brotarUser.id) }
  @Put(':id') @UseGuards(SessionMutationGuard) @Header('Cache-Control','no-store')
  save(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: OrganizationUpdateDto) { return this.organizations.save(request.brotarUser.id, id, input) }
}
