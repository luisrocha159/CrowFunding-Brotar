import {BadRequestException,Body,ConflictException,Controller,ForbiddenException,Get,Header,NotFoundException,Param,ParseUUIDPipe,Post,Query,Req,Res,StreamableFile,UseGuards} from '@nestjs/common'
import {Type} from 'class-transformer'
import {ArrayMaxSize,IsArray,IsBoolean,IsIn,IsString,IsUUID,Length,MaxLength,ValidateNested} from 'class-validator'
import type {Response} from 'express'
import {RequirePermissions,RoleGuard,type AuthenticatedRequest} from '../../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../../shared/infrastructure/http/case-write-limit.guard'
import {Files,FileUnavailable,FileAccessDenied} from '../../files/application/files'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {auditFileRead} from '../../shared/infrastructure/database/file-read-audit'
import {InvalidVerification,VerificationConflict,VerificationForbidden,VerificationPolicyUnavailable,VerificationUnavailable} from '../domain/verification'
import {reviewStates} from '../domain/review'
import {TypeormVerificationRepository} from './typeorm-verification.repository'
class DocumentReviewDto {@IsUUID() fileId!:string;@IsBoolean() isValid!:boolean;@IsString() @MaxLength(500) notes!:string}
export class VerificationReviewDto {
 @IsString() @Length(1,100) expectedVersion!:string
 @IsIn(reviewStates) decision!:string
 @IsString() @Length(20,500) reason!:string
 @IsArray() @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>DocumentReviewDto) documents!:DocumentReviewDto[]
}
async function run<T>(operation:()=>Promise<T>){try{return await operation()}catch(e){
 if(e instanceof FileUnavailable)throw new NotFoundException('Documento privado no disponible o sin integridad confirmada.')
 if(e instanceof FileAccessDenied)throw new ForbiddenException('No puedes consultar este documento.')
 if(e instanceof InvalidVerification)throw new BadRequestException('Revisa estado, motivo y evaluación de los documentos actuales.')
 if(e instanceof VerificationForbidden)throw new ForbiddenException('No se permite revisar un expediente propio o vinculado a tu representación.')
 if(e instanceof VerificationUnavailable)throw new NotFoundException('Expediente o documento no disponible.')
 if(e instanceof VerificationConflict || e instanceof VerificationPolicyUnavailable)throw new ConflictException('El caso, versión o política DEMO cambió. Actualiza antes de decidir.')
 throw e
}}
@Controller('admin/verifications') @UseGuards(RoleGuard) @RequirePermissions('verification.read')
export class VerificationReviewController {
 constructor(private readonly cases:TypeormVerificationRepository,private readonly files:Files,private readonly database:DatabaseService){}
 @Get() @Header('Cache-Control','private, no-store')
 list(@Req() r:AuthenticatedRequest,@Query('kind') kind='USER',@Query('status') status='PENDING',@Query('page') page='1'){
  return run(()=>{if(!/^[1-9]\d{0,3}$/.test(page))throw new InvalidVerification();return this.cases.reviewList(r.brotarUser.id,kind,status,Number(page))})
 }
 @Get(':id') @Header('Cache-Control','private, no-store')
 detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return run(()=>this.cases.reviewDetail(r.brotarUser.id,id))}
 @Post(':id/review') @RequirePermissions('verification.review') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store')
 decide(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:VerificationReviewDto){return run(()=>this.cases.decide(r.brotarUser.id,id,input.expectedVersion,input))}
 @Get(':id/documents/:fileId') @Header('Cache-Control','private, no-store')
 document(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('fileId',new ParseUUIDPipe()) fileId:string,@Res({passthrough:true}) response:Response){return run(async()=>{
  const owner=await this.cases.reviewDocumentOwner(r.brotarUser.id,id,fileId),download=await this.files.verificationDownload(fileId,owner)
  await auditFileRead(this.database,r.brotarUser.id,fileId)
  response.setHeader('Content-Type',download.file.mimeType);response.setHeader('Content-Length',download.file.sizeBytes)
  response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(download.file.originalName)}`)
  response.setHeader('X-Content-Type-Options','nosniff');return new StreamableFile(download.content)
 })}
}
@Controller('verification-badges/campaigns')
export class VerificationBadgeController {
 constructor(private readonly cases:TypeormVerificationRepository){}
 @Get(':id') @Header('Cache-Control','no-store')
 read(@Param('id',new ParseUUIDPipe()) id:string){return this.cases.badges(id)}
}
