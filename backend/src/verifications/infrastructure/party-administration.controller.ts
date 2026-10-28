import { Body, ConflictException, Controller, ForbiddenException, Get, Header, Injectable, NotFoundException, Param, ParseUUIDPipe, Query, Req, Put, UseGuards } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Max, MaxLength, Min, Matches } from 'class-validator'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../../auth/infrastructure/http/session-http'
import type {EntityManager} from 'typeorm'
import {assertMutation,partyActor,partyEvents,partyHistory,partyVersion,PartyMutationDto} from './party-mutations'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {PERSON_NAME} from '../../shared/domain/person-name'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
const OPTIONAL_PROFILE_TEXT=/^(?: *|(?=[\s\S]*[\p{L}\p{N}])[^\p{Cc}\p{Cf}\p{Cs}<>]*)$/u
export class PartyUpdateDto extends PartyMutationDto {
 @IsIn(['UPDATE','RESTRICT','RESTORE']) action!:'UPDATE'|'RESTRICT'|'RESTORE'
 @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim():value) @IsOptional() @IsString() @Length(1,120) @Matches(PERSON_NAME) firstName?:string
 @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim():value) @IsOptional() @IsString() @Length(1,120) @Matches(PERSON_NAME) lastName?:string
 @IsOptional() @IsString() @MaxLength(160) @Matches(OPTIONAL_PROFILE_TEXT) displayName?:string
 @IsOptional() @IsString() @MaxLength(120) @Matches(OPTIONAL_PROFILE_TEXT) city?:string
 @IsOptional() @IsUrl({protocols:['https'],require_protocol:true,disallow_auth:true}) @MaxLength(500) websiteUrl?:string
}
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
  private async userView(m:EntityManager,actor:string,id:string){
    await partyActor(m,actor,true,false)
    const [user]=await m.query(`SELECT u.id,u.email::text AS email,u.status,p.first_name AS "firstName",p.last_name AS "lastName",COALESCE(p.display_name,'') AS "displayName",COALESCE(p.city,'') AS city,COALESCE(p.website_url,'') AS "websiteUrl",(COALESCE(s.version,0)::text||':'||md5(concat_ws('|',u.status::text,p.updated_at::text))) AS version,
      (u.id<>$2 AND NOT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.is_internal AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()))) AS "canManage",
      (s.restore_status IS NOT NULL) AS "canRestore"
      FROM public.app_user u JOIN public.user_profile p ON p.user_id=u.id LEFT JOIN brotar_extension.party_state s ON s.kind='USER' AND s.subject_id=u.id WHERE u.id=$1 AND u.deleted_at IS NULL`,[id,actor])
    if(!user)throw new NotFoundException('Persona no disponible.')
    const history=await partyEvents(m,'USER',id)
    const actorRoles:{code:string}[]=await m.query(`SELECT r.code FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=$1 AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())`,[actor])
    return {...user,canManage:user.canManage&&actorRoles.some(r=>r.code==='ADMIN')&&!actorRoles.some(r=>r.code==='AUDITOR'),history}
  }
  async user(actor:string,id:string){return this.userView(this.database.connection().manager,actor,id)}
  async updateUser(actor:string,id:string,input:PartyUpdateDto){
    assertMutation(input)
    return this.database.connection().transaction(async m=>{
      // Authorization only needs a shared actor lock; serialize mutations on the target, in the same account order as role administration.
      for(const accountId of [...new Set([actor,id])].sort()){
        await m.query(`SELECT id FROM public.app_user WHERE id=$1 FOR ${accountId===id?'UPDATE':'SHARE'}`,[accountId])
      }
      await partyActor(m,actor,true)
      const before=await this.userView(m,actor,id)
      if(!before.canManage)throw new ForbiddenException('No puedes modificar tu propia cuenta ni una cuenta con responsabilidades internas vigentes.')
      if(before.version!==input.expectedVersion)throw new ConflictException('Los datos cambiaron. Recarga la cuenta antes de confirmar de nuevo.')
      const state=await partyVersion(m,'USER',id,input.expectedVersion.split(':')[0]!)
      if(input.action==='UPDATE'){
        if(!input.firstName?.trim()||!input.lastName?.trim())throw new ConflictException('Nombre y apellido son obligatorios.')
        await m.query('SELECT user_id FROM public.user_profile WHERE user_id=$1 FOR UPDATE',[id])
      }else if(input.action==='RESTRICT'){
        if(!['ACTIVE','PENDING_VERIFICATION'].includes(before.status))throw new ConflictException('Solo se pueden restringir cuentas habilitadas.')
      }else if(input.action==='RESTORE'){
        if(before.status!=='SUSPENDED'||!state.restore_status||!['ACTIVE','PENDING_VERIFICATION'].includes(state.restore_status))throw new ConflictException('No hay una restricción de este módulo que pueda restaurarse.')
      }
      // Account locks serialize login, grants, restriction, and session revocation. Re-read after waits.
      await partyActor(m,actor,true)
      await setAuditActor(m,actor)
      if(input.action==='UPDATE'){
        await m.query(`UPDATE public.user_profile SET first_name=$2,last_name=$3,display_name=$4,city=$5,website_url=$6 WHERE user_id=$1`,[id,input.firstName!.trim(),input.lastName!.trim(),input.displayName?.trim()||null,input.city?.trim()||null,input.websiteUrl||null])
        await recordAudit(m,actor,'UPDATE','user_profile',id)
      }else{
        if(input.action==='RESTRICT'){
          await m.query(`UPDATE brotar_extension.party_state SET restore_status=$2 WHERE kind='USER' AND subject_id=$1`,[id,before.status])
          await m.query(`UPDATE public.app_user SET status='SUSPENDED' WHERE id=$1`,[id])
          await m.query(`UPDATE public.user_token SET revoked_at=clock_timestamp() WHERE user_id=$1 AND revoked_at IS NULL AND used_at IS NULL`,[id])
        }else{
          await m.query('UPDATE public.app_user SET status=$2 WHERE id=$1',[id,state.restore_status])
          await m.query(`UPDATE brotar_extension.party_state SET restore_status=NULL WHERE kind='USER' AND subject_id=$1`,[id])
        }
        await recordAudit(m,actor,'STATUS_CHANGE','app_user',id)
      }
      await partyHistory(m,actor,'USER',id,input,input.action,{before:{status:before.status,firstName:before.firstName,lastName:before.lastName,displayName:before.displayName,city:before.city,websiteUrl:before.websiteUrl},after:input.action==='UPDATE'?{firstName:input.firstName,lastName:input.lastName,displayName:input.displayName,city:input.city,websiteUrl:input.websiteUrl}:{status:input.action==='RESTRICT'?'SUSPENDED':state.restore_status}})
      return this.userView(m,actor,id)
    })
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
  @Get('users/:id') @Header('Cache-Control','no-store')
  user(@Req() request:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.parties.user(request.brotarUser.id,id)}
  @Put('users/:id') @UseGuards(SessionMutationGuard) @Header('Cache-Control','no-store')
  updateUser(@Req() request:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:PartyUpdateDto){return this.parties.updateUser(request.brotarUser.id,id,input)}
  @Get('organizations/:id') @Header('Cache-Control','no-store')
  organization(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.parties.representation(request.brotarUser.id,id)}
}
