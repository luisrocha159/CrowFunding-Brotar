import {Body,Controller,ForbiddenException,Get,Header,NotFoundException,Param,ParseUUIDPipe,Post,Query,Req,Res,StreamableFile,UseGuards} from '@nestjs/common'
import {IsIn,IsInt,IsObject,Max,Min} from 'class-validator'
import type {Response} from 'express'
import {RoleGuard,RequirePermissions,type AuthenticatedRequest} from '../../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../../shared/infrastructure/http/case-write-limit.guard'
import {Files,FileUnavailable,FileAccessDenied} from '../../files/application/files'
import {AccountabilityOriginGuard} from '../../accountability/infrastructure/accountability-origin.guard'
import {closureActions} from '../domain/closure'
import {CampaignClosure} from './campaign-closure'
import {DemoOperationDto,operation,pageNumber} from './operation'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {auditFileRead} from '../../shared/infrastructure/database/file-read-audit'
class ClosureDto extends DemoOperationDto {
 @IsIn(closureActions) action!:string
 @IsInt() @Min(1) @Max(2147483647) expectedVersion!:number
 @IsObject() data!:Record<string,unknown>
}
async function download(c:CampaignClosure,files:Files,database:DatabaseService,actor:string,id:string,fileId:string,admin:boolean,response:Response){
 try{
 const owner=await c.documentOwner(actor,id,fileId,admin),result=await files.closureDownload(fileId,owner)
 await auditFileRead(database,actor,fileId)
 response.setHeader('Content-Type',result.file.mimeType);response.setHeader('Content-Length',result.file.sizeBytes)
 response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(result.file.originalName)}`);response.setHeader('X-Content-Type-Options','nosniff');return new StreamableFile(result.content)
 }catch(e){if(e instanceof FileUnavailable)throw new NotFoundException('Archivo no disponible.');if(e instanceof FileAccessDenied)throw new ForbiddenException('No puedes consultar esta evidencia.');throw e}
}
@Controller('me/campaign-closure') @UseGuards(RoleGuard) @RequirePermissions('campaign.manage.own')
export class OwnClosureController {
 constructor(private readonly closure:CampaignClosure,private readonly files:Files,private readonly database:DatabaseService){}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') page='1'){return operation(()=>this.closure.detail(r.brotarUser.id,id,false,pageNumber(page)))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @UseGuards(AccountabilityOriginGuard,SessionMutationGuard,CaseWriteLimitGuard)
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:ClosureDto){return operation(()=>this.closure.act(r.brotarUser.id,id,input,false))}
 @Get(':id/documents/:fileId') @Header('Cache-Control','private, no-store')
 document(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) fileId:string,@Res({passthrough:true}) response:Response){return operation(()=>download(this.closure,this.files,this.database,r.brotarUser.id,id,fileId,false,response))}
}
@Controller('admin/campaign-closure') @UseGuards(RoleGuard) @RequirePermissions('campaign.closure.read')
export class AdminClosureController {
 constructor(private readonly closure:CampaignClosure,private readonly files:Files,private readonly database:DatabaseService){}
 @Get() @Header('Cache-Control','private, no-store') list(@Req() r:AuthenticatedRequest,@Query('page') page='1'){return operation(()=>this.closure.list(r.brotarUser.id,pageNumber(page)))}
 @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') page='1'){return operation(()=>this.closure.detail(r.brotarUser.id,id,true,pageNumber(page)))}
 @Post(':id/actions') @Header('Cache-Control','private, no-store') @UseGuards(AccountabilityOriginGuard,SessionMutationGuard,CaseWriteLimitGuard)
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:ClosureDto){return operation(()=>this.closure.act(r.brotarUser.id,id,input,true))}
 @Get(':id/documents/:fileId') @Header('Cache-Control','private, no-store')
 document(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) fileId:string,@Res({passthrough:true}) response:Response){return operation(()=>download(this.closure,this.files,this.database,r.brotarUser.id,id,fileId,true,response))}
}
