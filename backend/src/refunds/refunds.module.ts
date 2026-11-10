import {BadRequestException,Body,ConflictException,ForbiddenException,NotFoundException,Controller,Get,Header,Module,Param,ParseUUIDPipe,Post,Query,Req,Res,StreamableFile,UseGuards} from '@nestjs/common'
import {ArrayMaxSize,ArrayUnique,IsArray,Equals,IsBoolean,IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Matches,Max,Min} from 'class-validator'
import type {Response} from 'express'
import {FilesModule} from '../files/files.module'
import {Files,FileUnavailable,FileAccessDenied} from '../files/application/files'
import {DatabaseService} from '../shared/infrastructure/database/database.service'
import {auditFileRead} from '../shared/infrastructure/database/file-read-audit'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {RolesModule} from '../roles/roles.module'
import {RoleGuard,RequirePermissions,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import {LedgerConflict,LedgerInvalid} from '../contributions/domain/payment'
import {refundActions,refundReasons} from './domain/refund'
import {DemoRefunds} from './infrastructure/demo-refunds'
class DemoConsentDto {@IsUUID('4') requestKey!:string;@IsBoolean() @Equals(true) demoConsent!:true}
export class RefundRequestDto extends DemoConsentDto {@IsUUID() paymentId!:string;@IsOptional() @IsUUID() disputeId?:string;@IsString() @Matches(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/) amount!:string;@IsIn(refundReasons) reasonCode!:string;@IsString() @Length(20,500) reason!:string;@IsOptional() @IsArray() @ArrayMaxSize(10) @ArrayUnique() @IsUUID('all',{each:true}) evidenceFileIds?:string[]}
export class RefundActionDto extends DemoConsentDto {@IsIn(refundActions) action!:string;@IsInt() @Min(1) @Max(2147483647) expectedVersion!:number;@IsString() @Length(20,500) reason!:string}
async function run<T>(op:()=>Promise<T>){try{return await op()}catch(e){if(e instanceof FileUnavailable)throw new NotFoundException('Evidencia no disponible.');if(e instanceof FileAccessDenied)throw new ForbiddenException('No puedes consultar este archivo.');if(e instanceof LedgerInvalid)throw new BadRequestException(e.message);if(e instanceof LedgerConflict)throw new ConflictException(e.message);throw e}}
function pageNumber(value:string){if(!/^[1-9]\d{0,3}$/.test(value))throw new LedgerInvalid('Página inválida.');return Number(value)}
@Controller('me/refunds') @UseGuards(RoleGuard) @RequirePermissions('contribution.read.own')
export class OwnRefundController {
 constructor(private readonly refunds:DemoRefunds,private readonly files:Files,private readonly database:DatabaseService){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') page='1',@Query('status') status?:string){return run(()=>this.refunds.list(r.brotarUser.id,false,pageNumber(page),status))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return run(()=>this.refunds.detail(r.brotarUser.id,id))}
 @Get('payments/:id/eligibility') @Header('Cache-Control','private, no-store') eligibility(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return run(()=>this.refunds.eligibility(r.brotarUser.id,id))}
 @Get(':id/evidence/:fileId') @Header('Cache-Control','private, no-store') evidence(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) file:string,@Res({passthrough:true}) response:Response){return run(async()=>download(this.files,file,await this.refunds.evidenceOwner(r.brotarUser.id,id,file,false),response,this.database,r.brotarUser.id))}
 @Post() @Header('Cache-Control','private, no-store') @RequirePermissions('contribution.write.own') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 request(@Req() r:AuthenticatedRequest,@Body() input:RefundRequestDto){return run(()=>this.refunds.request(r.brotarUser.id,input))}
}
@Controller('admin/finance/refunds') @UseGuards(RoleGuard) @RequirePermissions('finance.read')
export class RefundAdministrationController {
 constructor(private readonly refunds:DemoRefunds,private readonly files:Files,private readonly database:DatabaseService){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') page='1',@Query('status') status?:string){return run(()=>this.refunds.list(r.brotarUser.id,true,pageNumber(page),status))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return run(()=>this.refunds.detail(r.brotarUser.id,id,true))}
 @Get(':id/evidence/:fileId') @Header('Cache-Control','private, no-store') evidence(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) file:string,@Res({passthrough:true}) response:Response){return run(async()=>download(this.files,file,await this.refunds.evidenceOwner(r.brotarUser.id,id,file,true),response,this.database,r.brotarUser.id))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @RequirePermissions('finance.operate') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard)
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:RefundActionDto){return run(()=>this.refunds.act(r.brotarUser.id,id,input))}
}
async function download(files:Files,id:string,owner:string,response:Response,database:DatabaseService,actor:string){const data=await files.privateDownload(id,owner);await auditFileRead(database,actor,id);response.setHeader('Content-Type',data.file.mimeType);response.setHeader('Content-Length',data.file.sizeBytes);response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(data.file.originalName)}`);response.setHeader('X-Content-Type-Options','nosniff');return new StreamableFile(data.content)}
@Module({imports:[DatabaseModule,RolesModule,FilesModule],controllers:[OwnRefundController,RefundAdministrationController],providers:[DemoRefunds,SessionMutationGuard,CaseWriteLimitGuard],exports:[DemoRefunds]})
export class RefundsModule{}
