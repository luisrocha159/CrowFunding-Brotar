import {Body,Controller,Get,Header,Module,Param,ParseUUIDPipe,Post,Put,Query,Req,UseGuards} from '@nestjs/common'
import {IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Matches,Max,Min} from 'class-validator'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {RolesModule} from '../roles/roles.module'
import {RoleGuard,RequirePermissions,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import {DemoOperationDto,operation,pageNumber} from '../campaign-lifecycle/campaign-lifecycle.module'
import {disbursementActions} from './domain/disbursement'
import {DemoDisbursements} from './infrastructure/demo-disbursements'
export class DestinationDto extends DemoOperationDto {
 @IsString() @Length(6,45) reference!:string
 @IsString() @Length(8,95) holder!:string
 @IsInt() @Min(0) @Max(2147483647) expectedVersion!:number
}
export class DestinationReviewDto extends DemoOperationDto {@IsIn(['VERIFIED','REJECTED','DISABLED']) decision!:string;@IsInt() @Min(1) @Max(2147483647) expectedVersion!:number}
export class DisbursementRequestDto extends DemoOperationDto {
 @IsString() @Matches(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/) amount!:string
 @IsUUID() payoutAccountId!:string
 @IsInt() @Min(1) @Max(2147483647) destinationVersion!:number
 @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) scheduledFor:string|null=null
}
export class DisbursementActionDto extends DemoOperationDto {@IsIn(disbursementActions) action!:string;@IsInt() @Min(1) @Max(2147483647) expectedVersion!:number}
@Controller('me/disbursements') @UseGuards(RoleGuard) @RequirePermissions('campaign.manage.own')
export class OwnDisbursementController {
 constructor(private readonly operations:DemoDisbursements){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1',@Query('status') s?:string,@Query('campaignId') c?:string){return operation(()=>this.operations.list(r.brotarUser.id,false,pageNumber(p),s,c))}
 @Get('campaigns/:id/destination') @Header('Cache-Control','private, no-store') destination(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return operation(()=>this.operations.destinationDetail(r.brotarUser.id,id))}
 @Put('campaigns/:id/destination') @Header('Cache-Control','private, no-store') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 save(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:DestinationDto){return operation(()=>this.operations.saveDestination(r.brotarUser.id,id,input))}
 @Post('campaigns/:id') @Header('Cache-Control','private, no-store') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 request(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:DisbursementRequestDto){return operation(()=>this.operations.request(r.brotarUser.id,id,input))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return operation(()=>this.operations.detail(r.brotarUser.id,id))}
}
@Controller('admin/finance/disbursements') @UseGuards(RoleGuard) @RequirePermissions('finance.read')
export class AdministrativeDisbursementController {
 constructor(private readonly operations:DemoDisbursements){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1',@Query('status') s?:string,@Query('campaignId') c?:string){return operation(()=>this.operations.list(r.brotarUser.id,true,pageNumber(p),s,c))}
 @Get('campaigns/:id/destination') @Header('Cache-Control','private, no-store') destination(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return operation(()=>this.operations.destinationDetail(r.brotarUser.id,id,true))}
 @Post('campaigns/:id/destination/review') @Header('Cache-Control','private, no-store') @RequirePermissions('finance.operate') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 review(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:DestinationReviewDto){return operation(()=>this.operations.reviewDestination(r.brotarUser.id,id,input))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return operation(()=>this.operations.detail(r.brotarUser.id,id,true))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @RequirePermissions('finance.operate') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:DisbursementActionDto){return operation(()=>this.operations.act(r.brotarUser.id,id,input))}
}
@Module({imports:[DatabaseModule,RolesModule],controllers:[OwnDisbursementController,AdministrativeDisbursementController],providers:[DemoDisbursements,SessionMutationGuard,CaseWriteLimitGuard]})
export class DisbursementsModule{}
