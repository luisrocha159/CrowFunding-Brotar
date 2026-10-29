import {Body,Controller,Get,Header,Param,ParseUUIDPipe,Put,Query,Req,UseGuards} from '@nestjs/common'
import {IsIn} from 'class-validator'
import {RoleGuard,RequireRoles,type AuthenticatedRequest} from '../../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../../shared/infrastructure/http/case-write-limit.guard'
import {pageNumber,operation} from '../../campaign-lifecycle/infrastructure/operation'
import {PartyMutationDto} from './party-mutations'
import {OrganizationInvitations} from './organization-invitations'
class InvitationActionDto extends PartyMutationDto {@IsIn(['ACCEPT','DECLINE','CANCEL']) action!:'ACCEPT'|'DECLINE'|'CANCEL'}
@Controller('me/organization-invitations') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class OrganizationInvitationController {
 constructor(private readonly invitations:OrganizationInvitations){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1',@Query('organizationId',new ParseUUIDPipe({optional:true})) id?:string){return operation(()=>this.invitations.list(r.brotarUser.id,pageNumber(p),id))}
 @Put(':id') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store') act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:InvitationActionDto){return this.invitations.act(r.brotarUser.id,id,input)}
}
