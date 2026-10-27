import {assertRepresentationSettled} from './representation-settlement'
import { Body, BadRequestException, ConflictException, Controller, ForbiddenException, Get, Header, Injectable, NotFoundException, Param, ParseUUIDPipe, Put, Query, Req, UseGuards } from '@nestjs/common'
import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { OrganizationDto } from '../../organizations/infrastructure/organization.controller'
import { normalizeOrganization, type Organization } from '../../organizations/domain/organization'
import { ORGANIZATION_MANAGERS } from '../../organizations/domain/membership'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
import type { EntityManager } from 'typeorm'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {assertMutation,partyActor,partyEvents,partyHistory,partyVersion,PartyMutationDto} from './party-mutations'
import {randomUUID} from 'node:crypto'
import {operation,pageNumber} from '../../campaign-lifecycle/infrastructure/operation'
export class MemberMutationDto extends PartyMutationDto {
 @IsIn(['ADD','CHANGE','REMOVE','TRANSFER']) action!:'ADD'|'CHANGE'|'REMOVE'|'TRANSFER'
 @IsUUID() userId!:string
 @IsOptional() @IsIn(['OWNER','LEGAL_REPRESENTATIVE','ADMIN','MEMBER']) role?:string
}
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
  private async memberView(manager:EntityManager,userId:string,id:string,currentPage=1,memberPage=1) {
    await partyActor(manager,userId,false,false)
    const [org]=await manager.query(`SELECT o.id,o.legal_name AS name,o.status,COALESCE(s.version,0)::text AS version,m.organization_role AS "actorRole"
      FROM public.organization o JOIN public.organization_member m ON m.organization_id=o.id
      LEFT JOIN brotar_extension.party_state s ON s.kind='ORGANIZATION' AND s.subject_id=o.id
      WHERE o.id=$1 AND o.deleted_at IS NULL AND m.user_id=$2 AND m.joined_at<=clock_timestamp() AND (m.left_at IS NULL OR m.left_at>clock_timestamp()) AND m.organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN')`,[id,userId])
    if(!org)throw new NotFoundException('Organización no disponible.')
    const members=await manager.query(`SELECT m.id,m.user_id AS "userId",concat_ws(' ',p.first_name,p.last_name) AS name,m.organization_role AS role,m.joined_at AS "joinedAt",m.left_at AS "leftAt",
      (m.joined_at<=clock_timestamp() AND (m.left_at IS NULL OR m.left_at>clock_timestamp())) AS current
      FROM public.organization_member m JOIN public.user_profile p ON p.user_id=m.user_id WHERE m.organization_id=$1 ORDER BY m.joined_at DESC,m.id LIMIT 20 OFFSET $2`,[id,(memberPage-1)*20])
    const currentMembers=await manager.query(`SELECT m.id,m.user_id AS "userId",concat_ws(' ',p.first_name,p.last_name) AS name,m.organization_role AS role,m.joined_at AS "joinedAt",m.left_at AS "leftAt",true AS current
      FROM public.organization_member m JOIN public.user_profile p ON p.user_id=m.user_id WHERE m.organization_id=$1 AND m.joined_at<=clock_timestamp() AND (m.left_at IS NULL OR m.left_at>clock_timestamp()) ORDER BY m.joined_at DESC,m.id LIMIT 20 OFFSET $2`,[id,(currentPage-1)*20])
    const [totals]=await manager.query(`SELECT count(*)::int AS "totalMembers",count(*) FILTER(WHERE joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp()))::int AS "totalCurrentMembers" FROM public.organization_member WHERE organization_id=$1`,[id])
    const history=await partyEvents(manager,'ORGANIZATION',id)
    return {...org,members,currentMembers,...totals,currentPage,memberPage,pageSize:20,history}
  }
  async members(userId:string,id:string,currentPage=1,memberPage=1){return this.database.connection().transaction('REPEATABLE READ',m=>this.memberView(m,userId,id,currentPage,memberPage))}
  async changeMember(actor:string,id:string,input:MemberMutationDto){
    assertMutation(input)
    return this.database.connection().transaction(async m=>{
      // Same parent lock protocol as ownerAccess/independentActor: serialize representation before inspecting members.
      const [org]=await m.query(`SELECT id,status FROM public.organization WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,[id])
      if(!org)throw new NotFoundException('Organización no disponible.')
      if(['SUSPENDED','CLOSED'].includes(org.status))throw new ConflictException('La organización no permite cambios de membresía.')
      // Existing verification/identity flows can hold accounts before requesting this parent. Never wait on their accounts while retaining it.
      try{
        await m.query('SELECT id FROM public.app_user WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE NOWAIT',[[actor,input.userId]])
      }catch(error){
        if(error && typeof error==='object' && 'code' in error && error.code==='55P03')throw new ConflictException('Una cuenta está ocupada por otra operación. Recarga los datos y confirma de nuevo.')
        throw error
      }
      await partyActor(m,actor,false)
      const before=await this.memberView(m,actor,id)
      await assertRepresentationSettled(m,id)
      await partyVersion(m,'ORGANIZATION',id,input.expectedVersion)
      const current: {id:string;userId:string;role:string}[]=await m.query(`SELECT id,user_id AS "userId",organization_role AS role FROM public.organization_member WHERE organization_id=$1 AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp()) FOR UPDATE`,[id])
      const actorMember=current.find(row=>row.userId===actor),target=current.find(row=>row.userId===input.userId)
      if(!actorMember || !['OWNER','ADMIN','LEGAL_REPRESENTATIVE'].includes(actorMember.role))throw new ForbiddenException('Tu membresía cambió.')
      const owner=actorMember.role==='OWNER'
      if(!owner && (input.userId===actor||input.action==='TRANSFER'||input.role!=='MEMBER'&&input.action!=='REMOVE'||target&&target.role!=='MEMBER'))throw new ForbiddenException('Solo un propietario puede cambiar administradores, propietarios o representantes.')
      if(input.action==='TRANSFER'||['OWNER','LEGAL_REPRESENTATIVE'].includes(input.role??'')&&input.action!=='REMOVE'||target?.role==='OWNER')throw new ConflictException('La propiedad y representación requieren solicitud, aceptación y aprobación administrativa. Un propietario no se modifica por membresía directa.')
      if(input.action!=='REMOVE')await partyActor(m,input.userId,false,false)
      if(input.action==='ADD' && (target||(await m.query('SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND (left_at IS NULL OR left_at>clock_timestamp())',[id,input.userId])).length))throw new ConflictException('Ya existe una membresía vigente.')
      if(input.action!=='ADD'&&!target)throw new ConflictException('La membresía ya no está vigente; no se puede reactivar su registro histórico.')
      if(input.action!=='REMOVE'&&!input.role)throw new BadRequestException('Selecciona un rol institucional.')
      if(input.action==='CHANGE'&&target?.role===input.role)throw new ConflictException('La membresía ya tiene ese rol.')
      // Recheck role/account after every potentially blocking read, including the membership locks.
      await partyActor(m,actor,false)
      if(input.action!=='REMOVE')await partyActor(m,input.userId,false,false)
      await setAuditActor(m,actor)
      const terminate=async(member:{id:string})=>{await m.query('UPDATE public.organization_member SET left_at=clock_timestamp() WHERE id=$1',[member.id]);await recordAudit(m,actor,'UPDATE','organization_member',member.id)}
      const add=async(user:string,role:string)=>{const memberId=randomUUID();await m.query('INSERT INTO public.organization_member(id,organization_id,user_id,organization_role,invited_by,joined_at) VALUES($1,$2,$3,$4,$5,clock_timestamp())',[memberId,id,user,role,actor]);await recordAudit(m,actor,'CREATE','organization_member',memberId)}
      if(target)await terminate(target)
      if(input.action!=='REMOVE')await add(input.userId,input.role!)
      const representationChanged=['OWNER','LEGAL_REPRESENTATIVE'].includes(input.role??'')||['OWNER','LEGAL_REPRESENTATIVE'].includes(target?.role??'')||!!target&&input.action!=='ADD'
      if(representationChanged){
        const cases:{id:string;status:string;submitted_data:unknown}[]=await m.query(`SELECT v.id,v.status,v.submitted_data FROM public.verification v JOIN public.verification_type t ON t.id=v.verification_type_id WHERE v.organization_id=$1 AND t.code IN ('KYB_LEGAL','KYB_REPRESENTATIVE') AND v.status IN ('PENDING','IN_REVIEW','APPROVED') FOR UPDATE OF v`,[id])
        for(const row of cases){await m.query(`INSERT INTO brotar_extension.verification_revision(id,verification_id,actor_user_id,operation,snapshot) VALUES($1,$2,$3,'REPRESENTATION_CHANGE',$4::jsonb)`,[randomUUID(),row.id,actor,JSON.stringify({status:row.status,submission:row.submitted_data,reason:input.reason})]);await m.query(`UPDATE public.verification SET status='EXPIRED',expires_at=clock_timestamp() WHERE id=$1`,[row.id]);await recordAudit(m,actor,'STATUS_CHANGE','verification',row.id)}
      }
      await partyActor(m,actor,false)
      if(input.action!=='REMOVE')await partyActor(m,input.userId,false,['OWNER','LEGAL_REPRESENTATIVE','ADMIN'].includes(input.role??''))
      await partyHistory(m,actor,'ORGANIZATION',id,input,input.action,{before:current,targetUserId:input.userId,role:input.role??null,representationChanged})
      // A transfer/removal may remove the caller's manager access; return only the committed change acknowledgement.
      return {id,version:String(Number(before.version)+1),representationChanged}
    })
  }
  async save(userId: string, id: string, input: OrganizationUpdateDto): Promise<ManagedOrganization> {
    return this.database.connection().transaction(async manager => {
      await manager.query('SELECT id FROM public.organization WHERE id=$1 FOR UPDATE',[id])
      try{await manager.query('SELECT id FROM public.app_user WHERE id=$1 FOR SHARE NOWAIT',[userId])}catch(error){if(error&&typeof error==='object'&&'code'in error&&error.code==='55P03')throw new ConflictException('Una cuenta está ocupada. Recarga antes de guardar.');throw error}
      await this.actor(manager, userId, true)
      const rows: ManagedOrganization[] = await manager.query(`${select} AND o.id=$3 FOR UPDATE OF o`, [userId, ORGANIZATION_MANAGERS, id])
      const before = rows[0]
      if (!before) throw new NotFoundException('Organización no disponible.')
      await assertRepresentationSettled(manager,id)
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
  @Get(':id/members') @Header('Cache-Control','no-store')
  members(@Req() request:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('currentPage') current='1',@Query('memberPage') history='1'){return operation(()=>this.organizations.members(request.brotarUser.id,id,pageNumber(current),pageNumber(history)))}
  @Put(':id/members') @UseGuards(SessionMutationGuard) @Header('Cache-Control','no-store')
  changeMember(@Req() request:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:MemberMutationDto){return this.organizations.changeMember(request.brotarUser.id,id,input)}
  @Put(':id') @UseGuards(SessionMutationGuard) @Header('Cache-Control','no-store')
  save(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: OrganizationUpdateDto) { return this.organizations.save(request.brotarUser.id, id, input) }
}
