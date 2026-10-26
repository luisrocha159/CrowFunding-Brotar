import {BadRequestException,Body,ConflictException,Controller,Get,Header,Module,Param,ParseUUIDPipe,Post,Query,Req,Res,StreamableFile,UseGuards} from '@nestjs/common'
import {Equals,IsBoolean,IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Matches,Max,Min} from 'class-validator'
import type {Response} from 'express'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {RolesModule} from '../roles/roles.module'
import {FilesModule} from '../files/files.module'
import {Files} from '../files/application/files'
import {RoleGuard,RequirePermissions,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import {LedgerConflict,LedgerInvalid} from '../contributions/domain/payment'
import {disputeActions} from './domain/dispute'
import {DemoDisputes} from './infrastructure/demo-disputes'
class Consent{@IsUUID('4') requestKey!:string;@IsBoolean() @Equals(true) demoConsent!:true}
class Version extends Consent{@IsInt() @Min(1) @Max(2147483647) expectedVersion!:number}
class Request extends Consent{@IsUUID() supportCaseId!:string;@IsUUID() paymentId!:string;@IsString() @Length(20,5000) description!:string}
class Action extends Version{@IsIn(disputeActions) action!:string;@IsString() @Length(20,500) reason!:string;@IsOptional() @IsInt() @Min(1) @Max(5) priority?:number;@IsOptional() @IsString() @Matches(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/) recommendedAmount?:string}
class Message extends Version{@IsString() @Length(20,2000) body!:string}
class StaffMessage extends Message{@IsBoolean() isInternal!:boolean}
async function run<T>(op:()=>Promise<T>){try{return await op()}catch(e){if(e instanceof LedgerInvalid)throw new BadRequestException(e.message);if(e instanceof LedgerConflict)throw new ConflictException(e.message);throw e}}
function number(v:string){if(!/^[1-9]\d{0,3}$/.test(v))throw new LedgerInvalid('Número inválido.');return Number(v)}
@Controller('me/disputes') @UseGuards(RoleGuard) @RequirePermissions('contribution.read.own')
export class OwnDisputes{
 constructor(private readonly cases:DemoDisputes,private readonly files:Files){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1',@Query('status') status?:string){return run(()=>this.cases.list(r.brotarUser.id,false,number(p),status))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') p='1'){return run(()=>this.cases.detail(r.brotarUser.id,id,false,number(p)))}
 @Post() @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @RequirePermissions('contribution.write.own') @Header('Cache-Control','private, no-store') request(@Req() r:AuthenticatedRequest,@Body() input:Request){return run(()=>this.cases.request(r.brotarUser.id,input))}
 @Post(':id/messages') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @RequirePermissions('contribution.write.own') @Header('Cache-Control','private, no-store') message(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:Message){return run(()=>this.cases.message(r.brotarUser.id,id,false,input))}
 @Get(':id/evidence/:fileId') @Header('Cache-Control','private, no-store') evidence(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) file:string,@Res({passthrough:true}) response:Response){return run(async()=>download(this.files,file,await this.cases.evidenceOwner(r.brotarUser.id,id,file,false),response))}
}
async function download(files:Files,id:string,owner:string,response:Response){const data=await files.privateDownload(id,owner);response.setHeader('Content-Type',data.file.mimeType);response.setHeader('Content-Length',data.file.sizeBytes);response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(data.file.originalName)}`);response.setHeader('X-Content-Type-Options','nosniff');return new StreamableFile(data.content)}
@Controller('admin/disputes') @UseGuards(RoleGuard) @RequirePermissions('support.read')
export class AdministrativeDisputes{
 constructor(private readonly cases:DemoDisputes,private readonly files:Files){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1',@Query('status') status?:string,@Query('priority') priority?:string){return run(()=>this.cases.list(r.brotarUser.id,true,number(p),status,priority===undefined?undefined:number(priority)))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') p='1'){return run(()=>this.cases.detail(r.brotarUser.id,id,true,number(p)))}
 @Post(':id/actions') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @RequirePermissions('support.resolve') @Header('Cache-Control','private, no-store') act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:Action){return run(()=>this.cases.act(r.brotarUser.id,id,input))}
 @Post(':id/messages') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @RequirePermissions('support.resolve') @Header('Cache-Control','private, no-store') message(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:StaffMessage){return run(()=>this.cases.message(r.brotarUser.id,id,true,input))}
 @Get(':id/evidence/:fileId') @Header('Cache-Control','private, no-store') evidence(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) file:string,@Res({passthrough:true}) response:Response){return run(async()=>download(this.files,file,await this.cases.evidenceOwner(r.brotarUser.id,id,file,true),response))}
}
@Module({imports:[DatabaseModule,RolesModule,FilesModule],controllers:[OwnDisputes,AdministrativeDisputes],providers:[DemoDisputes,SessionMutationGuard,CaseWriteLimitGuard]})
export class DisputesModule{}
