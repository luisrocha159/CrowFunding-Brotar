import { Controller, ForbiddenException, Get, Header, Injectable, NotFoundException, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
class PartyQuery {
  @IsIn(['USER','ORGANIZATION']) kind: 'USER'|'ORGANIZATION'='USER'
  @IsOptional() @IsString() @MaxLength(120) query?: string
  @Transform(({value}: {value:unknown})=>Number(value)) @IsInt() @Min(1) @Max(10000) page=1
}
const access = `EXISTS(SELECT 1 FROM public.app_user actor JOIN public.user_role ur ON ur.user_id=actor.id JOIN public.role r ON r.id=ur.role_id
  WHERE actor.id=$1 AND actor.status::text=ANY($2::text[]) AND actor.deleted_at IS NULL AND (actor.locked_until IS NULL OR actor.locked_until<=clock_timestamp())
  AND ur.granted_at<=clock_timestamp() AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()) AND r.code IN ('ADMIN','AUDITOR'))`
@Injectable()
export class PartyAdministration {
  constructor(private readonly database: DatabaseService) {}
  private async assertActor(userId: string) {
    const rows: { allowed: boolean }[] = await this.database.connection().query(`SELECT ${access} AS allowed`,[userId,BASIC_ACCESS_STATUSES])
    if (!rows[0]?.allowed) throw new ForbiddenException('Se requiere administración o auditoría vigente.')
  }
  async list(userId: string,input: PartyQuery) {
    await this.assertActor(userId)
    const query=(input.query??'').trim().replace(/[\\%_]/g,'\\$&'); const parameters=[userId,BASIC_ACCESS_STATUSES,`%${query}%`,(input.page-1)*20]
    const select=input.kind==='USER'
      ? `SELECT u.id,'USER' AS kind,concat_ws(' ',p.first_name,p.last_name) AS name,u.email::text AS contact,u.status::text AS status,
          COALESCE((SELECT string_agg(r.code,', ' ORDER BY r.code) FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())),'') AS detail
        FROM public.app_user u JOIN public.user_profile p ON p.user_id=u.id WHERE u.deleted_at IS NULL AND (concat_ws(' ',p.first_name,p.last_name) ILIKE $3 OR u.email::text ILIKE $3)`
      : `SELECT o.id,'ORGANIZATION' AS kind,o.legal_name AS name,COALESCE(o.contact_email::text,'') AS contact,o.status::text AS status,t.name AS detail
        FROM public.organization o JOIN public.organization_type t ON t.id=o.organization_type_id WHERE o.deleted_at IS NULL AND (o.legal_name ILIKE $3 OR COALESCE(o.trade_name,'') ILIKE $3)`
    const items: { id:string;kind:string;name:string;contact:string;status:string;detail:string }[] = await this.database.connection().query(`${select} AND ${access} ORDER BY name,id LIMIT 21 OFFSET $4`,parameters)
    return {items:items.slice(0,20),page:input.page,hasMore:items.length>20}
  }
  async representation(userId: string,id: string) {
    await this.assertActor(userId)
    const organization: {id:string;name:string;status:string}[] = await this.database.connection().query(`SELECT o.id,o.legal_name AS name,o.status FROM public.organization o WHERE o.id=$3 AND o.deleted_at IS NULL AND ${access}`,[userId,BASIC_ACCESS_STATUSES,id])
    if(!organization[0])throw new NotFoundException('Organización no disponible.')
    const members: {id:string;name:string;role:string;joinedAt:string;leftAt:string|null;current:boolean}[] = await this.database.connection().query(`SELECT m.id,concat_ws(' ',p.first_name,p.last_name) AS name,m.organization_role AS role,m.joined_at AS "joinedAt",m.left_at AS "leftAt",
      ((m.left_at IS NULL OR m.left_at>clock_timestamp()) AND m.joined_at<=clock_timestamp() AND u.deleted_at IS NULL) AS current
      FROM public.organization_member m JOIN public.app_user u ON u.id=m.user_id JOIN public.user_profile p ON p.user_id=u.id WHERE m.organization_id=$3 AND ${access} ORDER BY m.joined_at DESC,m.id LIMIT 200`,[userId,BASIC_ACCESS_STATUSES,id])
    return {...organization[0],members}
  }
}
@Controller('administration/parties') @UseGuards(RoleGuard) @RequirePermissions('parties.read')
export class PartyAdministrationController {
  constructor(private readonly parties: PartyAdministration) {}
  @Get() @Header('Cache-Control','no-store')
  list(@Req() request: AuthenticatedRequest,@Query() input: PartyQuery){return this.parties.list(request.brotarUser.id,input)}
  @Get('organizations/:id') @Header('Cache-Control','no-store')
  organization(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.parties.representation(request.brotarUser.id,id)}
}
