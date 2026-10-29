import {InvalidLegalAgreement,LegalAgreementRequired} from '../../legal/domain/legal-agreement'
import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, NotFoundException, Param, ParseUUIDPipe, Post, Put, Req, Res, StreamableFile, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator'
import type { Response } from 'express'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { Files,FileUnavailable,FileAccessDenied } from '../../files/application/files'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {auditFileRead} from '../../shared/infrastructure/database/file-read-audit'
import { Verifications } from '../application/verifications'
import { InvalidVerification, VerificationConflict, VerificationForbidden, VerificationPolicyUnavailable, VerificationUnavailable } from '../domain/verification'
class StartVerificationDto {
  @IsUUID() verificationTypeId!: string
  @IsOptional() @IsUUID() organizationId?: string
}
class VerificationDocumentDto {
  @IsUUID() documentTypeId!: string
  @IsUUID() fileId!: string
}
class SaveVerificationDto {
  @IsString() @Length(1,100) expectedVersion!: string
  @IsString() @Length(1,100) policyVersion!: string
  @IsString() @Length(1,100) legalVersion!: string
  @IsObject() fields!: Record<string,string>
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => VerificationDocumentDto) documents!: VerificationDocumentDto[]
  @IsBoolean() accepted!: boolean
  @IsBoolean() submit!: boolean
}
@Controller('me/verifications') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class VerificationController {
  constructor(private readonly cases: Verifications, private readonly files: Files,private readonly database:DatabaseService) {}
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation() }
    catch (error) {
      if(error instanceof FileUnavailable)throw new NotFoundException('Documento privado no disponible o sin integridad confirmada.')
      if(error instanceof FileAccessDenied)throw new ForbiddenException('No puedes consultar este documento.')
      if(error instanceof InvalidLegalAgreement)throw new BadRequestException(error.message)
      if(error instanceof LegalAgreementRequired)throw new ConflictException(error.message)
      if (error instanceof VerificationForbidden) throw new ForbiddenException('Tu cuenta no permite esta operación.')
      if (error instanceof VerificationUnavailable) throw new NotFoundException('Verificación no disponible.')
      if (error instanceof VerificationConflict) throw new ConflictException('El caso cambió. Recarga su estado antes de corregirlo.')
      if (error instanceof VerificationPolicyUnavailable) throw new ConflictException('Los requisitos y el aviso de tratamiento de datos aún no están aprobados o cambiaron. Recarga el caso.')
      if (error instanceof InvalidVerification) throw new BadRequestException('Revisa los requisitos, documentos y estado del caso.')
      throw error
    }
  }
  @Get('types') @Header('Cache-Control','no-store')
  types(@Req() request: AuthenticatedRequest) { return this.execute(() => this.cases.types(request.brotarUser.id)) }
  @Get('payout-accounts') @Header('Cache-Control','no-store')
  payouts(@Req() request: AuthenticatedRequest) { return this.execute(() => this.cases.payouts(request.brotarUser.id)) }
  @Get() @Header('Cache-Control','no-store')
  list(@Req() request: AuthenticatedRequest) { return this.execute(() => this.cases.list(request.brotarUser.id)) }
  @Get(':id') @Header('Cache-Control','no-store')
  detail(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.execute(() => this.cases.detail(request.brotarUser.id, id)) }
  @Post() @UseGuards(SessionMutationGuard) @Header('Cache-Control','no-store')
  start(@Req() request: AuthenticatedRequest, @Body() input: StartVerificationDto) { return this.execute(() => this.cases.start(request.brotarUser.id, input.verificationTypeId, input.organizationId ?? null)) }
  @Put(':id') @UseGuards(SessionMutationGuard) @Header('Cache-Control','no-store')
  save(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: SaveVerificationDto) { return this.execute(() => this.cases.save(request.brotarUser.id, id, input.expectedVersion, input, input.submit)) }
  @Get(':id/documents/:fileId') @Header('Cache-Control','private, no-store')
  document(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('fileId', new ParseUUIDPipe()) fileId: string, @Res({ passthrough: true }) response: Response) {
    return this.execute(async () => {
      const owner = await this.cases.documentOwner(request.brotarUser.id, id, fileId)
      const file = await this.files.verificationDownload(fileId, owner)
      await auditFileRead(this.database,request.brotarUser.id,fileId)
      response.setHeader('Content-Type', file.file.mimeType)
      response.setHeader('Content-Length', file.file.sizeBytes)
      response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.file.originalName)}`)
      return new StreamableFile(file.content)
    })
  }
}
