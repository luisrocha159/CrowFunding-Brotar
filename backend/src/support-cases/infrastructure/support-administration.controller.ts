import { BadRequestException, Body, ConflictException, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, Res, StreamableFile, UseGuards } from '@nestjs/common'
import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator'
import type { Response } from 'express'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { CaseWriteLimitGuard } from '../../shared/infrastructure/http/case-write-limit.guard'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { auditFileRead } from '../../shared/infrastructure/database/file-read-audit'
import { Files } from '../../files/application/files'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { SupportCases, SupportMissing } from '../application/support-cases'
import { SupportConflict, SupportInvalid, type SupportStatus } from '../domain/support-case'

class StaffMessageDto { @IsString() @Length(1, 5000) body!: string }
class SupportActionDto {
  @IsIn(['IN_PROGRESS','AWAITING_RESPONSE','RESOLVED','CLOSED']) status!: SupportStatus
  @IsString() @Length(10, 500) reason!: string
}
class SupportAssignmentDto { @IsOptional() @IsUUID() assignedTo?: string | null }
function run<T>(operation: () => Promise<T>) {
  return operation().catch(error => {
    if (error instanceof SupportInvalid) throw new BadRequestException('Revisa el contenido y el estado solicitado.')
    if (error instanceof SupportConflict) throw new ConflictException('La transición no corresponde al estado actual del caso.')
    if (error instanceof SupportMissing) throw new NotFoundException('Caso de soporte o evidencia no disponible.')
    throw error
  })
}

@Controller('admin/support-cases') @UseGuards(RoleGuard) @RequirePermissions('support.read')
export class SupportAdministrationController {
  constructor(private readonly cases: SupportCases, private readonly files: Files, private readonly database: DatabaseService) {}

  @Get() @Header('Cache-Control', 'private, no-store')
  list(@Query('page') page = '1') { return run(() => this.cases.adminList(page)) }

  @Get(':id') @Header('Cache-Control', 'private, no-store')
  async detail(@Param('id', new ParseUUIDPipe()) id: string) {
    const detail = await this.cases.adminDetail(id)
    if (!detail) throw new NotFoundException('Caso de soporte no disponible.')
    return detail
  }

  @Post(':id/messages') @RequirePermissions('support.resolve') @UseGuards(SessionMutationGuard, CaseWriteLimitGuard) @Header('Cache-Control', 'private, no-store')
  async message(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: StaffMessageDto) {
    await run(() => this.cases.adminMessage(request.brotarUser.id, id, input.body))
    return { ok: true }
  }

  @Post(':id/actions') @RequirePermissions('support.resolve') @UseGuards(SessionMutationGuard, CaseWriteLimitGuard) @Header('Cache-Control', 'private, no-store')
  async action(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: SupportActionDto) {
    await run(() => this.cases.adminTransition(request.brotarUser.id, id, input.status, input.reason))
    return { ok: true }
  }

  @Post(':id/assignment') @RequirePermissions('support.resolve') @UseGuards(SessionMutationGuard, CaseWriteLimitGuard) @Header('Cache-Control', 'private, no-store')
  async assign(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: SupportAssignmentDto) {
    await run(() => this.cases.adminAssign(request.brotarUser.id, id, input.assignedTo ?? null))
    return { ok: true }
  }

  @Get(':id/evidence/:fileId') @Header('Cache-Control', 'private, no-store')
  async evidence(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('fileId', new ParseUUIDPipe()) fileId: string, @Res({ passthrough: true }) response: Response) {
    const owner = await this.cases.adminEvidenceOwner(request.brotarUser.id, id, fileId)
    const file = await this.files.privateDownload(fileId, owner)
    await auditFileRead(this.database, request.brotarUser.id, fileId)
    response.setHeader('Content-Type', file.file.mimeType)
    response.setHeader('Content-Length', String(file.file.sizeBytes))
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.file.originalName)}`)
    response.setHeader('X-Content-Type-Options', 'nosniff')
    return new StreamableFile(file.content)
  }
}
