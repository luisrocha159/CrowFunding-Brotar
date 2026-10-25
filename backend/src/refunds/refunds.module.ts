import {BadRequestException,Body,ConflictException,Controller,Get,Header,Module,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common'
import {Equals,IsBoolean,IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Matches,Max,Min} from 'class-validator'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {RolesModule} from '../roles/roles.module'
import {RoleGuard,RequirePermissions,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import {LedgerConflict,LedgerInvalid} from '../contributions/domain/payment'
import {refundActions,refundReasons} from './domain/refund'
import {DemoRefunds} from './infrastructure/demo-refunds'
class DemoConsentDto {@IsUUID('4') requestKey!:string;@IsBoolean() @Equals(true) demoConsent!:true}
export class RefundRequestDto extends DemoConsentDto {@IsUUID() paymentId!:string;@IsOptional() @IsUUID() disputeId?:string;@IsString() @Matches(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/) amount!:string;@IsIn(refundReasons) reasonCode!:string;@IsString() @Length(20,500) reason!:string}
export class RefundActionDto extends DemoConsentDto {@IsIn(refundActions) action!:string;@IsInt() @Min(1) @Max(2147483647) expectedVersion!:number;@IsString() @Length(20,500) reason!:string}
async function run<T>(op:()=>Promise<T>){try{return await op()}catch(e){if(e instanceof LedgerInvalid)throw new BadRequestException(e.message);if(e instanceof LedgerConflict)throw new ConflictException(e.message);throw e}}
function pageNumber(value:string){if(!/^[1-9]\d{0,3}$/.test(value))throw new LedgerInvalid('Página inválida.');return Number(value)}
@Controller('me/refunds') @UseGuards(RoleGuard) @RequirePermissions('contribution.read.own')
export class OwnRefundController {
 constructor(private readonly refunds:DemoRefunds){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') page='1',@Query('status') status?:string){return run(()=>this.refunds.list(r.brotarUser.id,false,pageNumber(page),status))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return run(()=>this.refunds.detail(r.brotarUser.id,id))}
 @Post() @Header('Cache-Control','private, no-store') @RequirePermissions('contribution.write.own') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 request(@Req() r:AuthenticatedRequest,@Body() input:RefundRequestDto){return run(()=>this.refunds.request(r.brotarUser.id,input))}
}
@Controller('admin/finance/refunds') @UseGuards(RoleGuard) @RequirePermissions('finance.read')
export class RefundAdministrationController {
 constructor(private readonly refunds:DemoRefunds){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') page='1',@Query('status') status?:string){return run(()=>this.refunds.list(r.brotarUser.id,true,pageNumber(page),status))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return run(()=>this.refunds.detail(r.brotarUser.id,id,true))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @RequirePermissions('finance.operate') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:RefundActionDto){return run(()=>this.refunds.act(r.brotarUser.id,id,input))}
}
@Module({imports:[DatabaseModule,RolesModule],controllers:[OwnRefundController,RefundAdministrationController],providers:[DemoRefunds,SessionMutationGuard,CaseWriteLimitGuard],exports:[DemoRefunds]})
export class RefundsModule{}
