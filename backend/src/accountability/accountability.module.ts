import {PublicAccountabilityRepository} from './infrastructure/public-accountability.repository'
import {Body,Controller,ForbiddenException,Get,Header,Module,NotFoundException,Param,ParseUUIDPipe,Post,Put,Query,Req,Res,StreamableFile,UseGuards} from '@nestjs/common'
import {IsBoolean,IsIn,IsInt,IsObject,IsString,IsUUID,Length,Max,Min} from 'class-validator'
import type {Response} from 'express'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {DatabaseService} from '../shared/infrastructure/database/database.service'
import {auditFileRead} from '../shared/infrastructure/database/file-read-audit'
import {RolesModule} from '../roles/roles.module'
import {RoleGuard,RequirePermissions,RequireRoles,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import {FilesModule} from '../files/files.module'
import {Files,FileUnavailable,FileAccessDenied} from '../files/application/files'
import {DemoOperationDto,operation,pageNumber} from '../campaign-lifecycle/infrastructure/operation'
import {accountabilityActions} from './domain/accountability'
import {AccountabilityOriginGuard} from './infrastructure/accountability-origin.guard'
import {AccountabilityRepository} from './infrastructure/accountability.repository'
class AccountabilityDto extends DemoOperationDto {@IsIn(accountabilityActions) action!:string;@IsInt() @Min(1) @Max(2147483647) expectedVersion!:number;@IsObject() data!:Record<string,unknown>}
async function download(repository:AccountabilityRepository,files:Files,database:DatabaseService,actor:string,id:string,fileId:string,admin:boolean,response:Response){
 try{const owner=await repository.documentOwner(actor,id,fileId,admin),result=await files.closureDownload(fileId,owner);await auditFileRead(database,actor,fileId);response.setHeader('Content-Type',result.file.mimeType);response.setHeader('Content-Length',result.file.sizeBytes);response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(result.file.originalName)}`);response.setHeader('X-Content-Type-Options','nosniff');return new StreamableFile(result.content)}catch(e){if(e instanceof FileUnavailable)throw new NotFoundException('Archivo no disponible.');if(e instanceof FileAccessDenied)throw new ForbiddenException('No puedes consultar esta evidencia.');throw e}
}
@Controller('me/accountability') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
export class OwnAccountabilityController {
 constructor(private readonly repository:AccountabilityRepository,private readonly files:Files,private readonly database:DatabaseService){}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') p='1',@Query('reportPage') rp='1',@Query('returnPage') sp='1'){return operation(()=>this.repository.detail(r.brotarUser.id,id,false,pageNumber(p),pageNumber(rp),pageNumber(sp)))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @UseGuards(AccountabilityOriginGuard,SessionMutationGuard,CaseWriteLimitGuard) act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:AccountabilityDto){return operation(()=>this.repository.act(r.brotarUser.id,id,input,false))}
 @Get(':id/documents/:fileId') @Header('Cache-Control','private, no-store') document(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) fileId:string,@Res({passthrough:true}) response:Response){return operation(()=>download(this.repository,this.files,this.database,r.brotarUser.id,id,fileId,false,response))}
}
@Controller('admin/accountability') @UseGuards(RoleGuard) @RequirePermissions('campaign.lifecycle.read')
export class AdminAccountabilityController {
 constructor(private readonly repository:AccountabilityRepository,private readonly files:Files,private readonly database:DatabaseService){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') p='1'){return operation(()=>this.repository.list(r.brotarUser.id,pageNumber(p)))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') p='1',@Query('reportPage') rp='1',@Query('returnPage') sp='1'){return operation(()=>this.repository.detail(r.brotarUser.id,id,true,pageNumber(p),pageNumber(rp),pageNumber(sp)))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @UseGuards(AccountabilityOriginGuard,SessionMutationGuard,CaseWriteLimitGuard) act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:AccountabilityDto){return operation(()=>this.repository.act(r.brotarUser.id,id,input,true))}
 @Get(':id/documents/:fileId') @Header('Cache-Control','private, no-store') document(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) fileId:string,@Res({passthrough:true}) response:Response){return operation(()=>download(this.repository,this.files,this.database,r.brotarUser.id,id,fileId,true,response))}
}
class PublicReportDto {@IsUUID() reportId!:string;@IsUUID() requestKey!:string;@IsString() @Length(10,1000) reason!:string;@IsBoolean() publishConsent!:boolean}
class WithdrawReportDto {@IsUUID() requestKey!:string;@IsString() @Length(10,1000) reason!:string;@IsBoolean() confirmed!:boolean;@IsInt() @Min(1) @Max(1) expectedVersion!:number}
@Controller('campaigns/public')
export class PublicAccountabilityController {
 constructor(private readonly repository:PublicAccountabilityRepository){}
 @Get(':id/accountability') @Header('Cache-Control','no-store') list(@Param('id',new ParseUUIDPipe()) id:string,@Query('page') page='1'){return operation(()=>this.repository.list(id,pageNumber(page)))}
}
@Controller('me/accountability') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
export class ShareAccountabilityController {
 constructor(private readonly repository:PublicAccountabilityRepository){}
 @Post(':id/publications') @UseGuards(AccountabilityOriginGuard,SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store') publish(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:PublicReportDto){return operation(()=>this.repository.change(r.brotarUser.id,id,input.reportId,input))}
}
@Controller('admin/accountability') @UseGuards(RoleGuard) @RequirePermissions('campaign.lifecycle.manage')
export class WithdrawAccountabilityController {
 constructor(private readonly repository:PublicAccountabilityRepository){}
 @Put(':id/publications/:reportId/withdraw') @UseGuards(AccountabilityOriginGuard,SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store') withdraw(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('reportId',new ParseUUIDPipe()) reportId:string,@Body() input:WithdrawReportDto){return operation(()=>this.repository.change(r.brotarUser.id,id,reportId,input,true))}
}
@Module({imports:[DatabaseModule,RolesModule,FilesModule],controllers:[OwnAccountabilityController,AdminAccountabilityController,PublicAccountabilityController,ShareAccountabilityController,WithdrawAccountabilityController],providers:[AccountabilityRepository,PublicAccountabilityRepository,AccountabilityOriginGuard,SessionMutationGuard,CaseWriteLimitGuard]})
export class AccountabilityModule{}
