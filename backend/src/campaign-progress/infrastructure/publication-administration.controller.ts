import {Body,Controller,Get,Header,Param,ParseUUIDPipe,Put,Query,Req,UseGuards} from '@nestjs/common'
import {IsBoolean,IsString,MaxLength} from 'class-validator'
import {ProgressRepository} from './progress.repository'
import {RoleGuard,RequirePermissions,type AuthenticatedRequest} from '../../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../../shared/infrastructure/http/case-write-limit.guard'
import {operation} from '../../campaign-lifecycle/infrastructure/operation'
class WithdrawalDto {@IsString() @MaxLength(100) revision!:string;@IsString() @MaxLength(1000) reason!:string;@IsBoolean() confirmed!:true}
@Controller('admin/campaign-publications') @UseGuards(RoleGuard) @RequirePermissions('campaign.review.read')
export class PublicationAdministrationController {
 constructor(private readonly repository:ProgressRepository){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') page='1',@Query('campaignId',new ParseUUIDPipe({optional:true})) campaignId?:string){return this.repository.administrativePublications(r.brotarUser.id,Number(page),campaignId)}
 @Put(':campaignId/:updateId/withdraw') @RequirePermissions('campaign.publish') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store') withdraw(@Req() r:AuthenticatedRequest,@Param('campaignId',new ParseUUIDPipe()) campaign:string,@Param('updateId',new ParseUUIDPipe()) update:string,@Body() input:WithdrawalDto){return operation(()=>this.repository.changePublication(r.brotarUser.id,campaign,update,{...input,action:'WITHDRAW'},true))}
}
