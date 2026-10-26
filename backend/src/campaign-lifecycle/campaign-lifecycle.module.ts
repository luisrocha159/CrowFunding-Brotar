import {Body,Controller,Get,Header,Module,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common'
import {IsIn,IsInt,Max,Min} from 'class-validator'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {RolesModule} from '../roles/roles.module'
import {ContributionsModule} from '../contributions/contributions.module'
import {RoleGuard,RequirePermissions,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import {FilesModule} from '../files/files.module'
import {cycleActions} from './domain/cycle'
import {CampaignCycle} from './infrastructure/campaign-cycle'
import {CampaignClosure} from './infrastructure/campaign-closure'
import {OwnClosureController,AdminClosureController} from './infrastructure/closure.controller'
import {DemoOperationDto,operation,pageNumber} from './infrastructure/operation'
export {DemoOperationDto,operation,pageNumber} from './infrastructure/operation'
export class CycleActionDto extends DemoOperationDto {@IsIn(cycleActions) action!:string;@IsInt() @Min(1) @Max(2147483647) expectedVersion!:number}
@Controller('me/campaign-cycle') @UseGuards(RoleGuard) @RequirePermissions('campaign.manage.own')
export class OwnCycleController {
 constructor(private readonly cycle:CampaignCycle){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1'){return operation(()=>this.cycle.list(r.brotarUser.id,false,pageNumber(p)))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') p='1'){return operation(()=>this.cycle.detail(r.brotarUser.id,id,false,pageNumber(p)))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:CycleActionDto){return operation(()=>this.cycle.act(r.brotarUser.id,id,input,false))}
}
@Controller('admin/campaign-cycle') @UseGuards(RoleGuard) @RequirePermissions('campaign.lifecycle.read')
export class AdministrativeCycleController {
 constructor(private readonly cycle:CampaignCycle){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1'){return operation(()=>this.cycle.list(r.brotarUser.id,true,pageNumber(p)))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') p='1'){return operation(()=>this.cycle.detail(r.brotarUser.id,id,true,pageNumber(p)))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @RequirePermissions('campaign.lifecycle.manage') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:CycleActionDto){return operation(()=>this.cycle.act(r.brotarUser.id,id,input,true))}
}
@Module({imports:[DatabaseModule,RolesModule,ContributionsModule,FilesModule],controllers:[OwnCycleController,AdministrativeCycleController,OwnClosureController,AdminClosureController],providers:[CampaignCycle,CampaignClosure,SessionMutationGuard,CaseWriteLimitGuard]})
export class CampaignLifecycleModule{}
