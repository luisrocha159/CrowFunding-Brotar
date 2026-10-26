import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { SupportCampaignClosed, SupportCases, SupportForbidden, SupportMissing } from '../application/support-cases'
import { SUPPORT_CATEGORIES, SupportConflict, SupportInvalid } from '../domain/support-case'
class SupportCreateDto {
  @IsUUID() requestId!: string
  @IsOptional() @IsUUID() campaignId?: string
  @IsOptional() @IsUUID() contributionId?: string
  @IsIn(SUPPORT_CATEGORIES) category!: string
  @IsString() @MaxLength(200) subject!: string
  @IsString() @MaxLength(10000) description!: string
  @IsArray() @ArrayMaxSize(10) @ArrayUnique() @IsUUID('all', { each: true }) evidenceFileIds!: string[]
  @IsBoolean() confirmed!: boolean
}
function translate(error: unknown): never {
  if(error instanceof SupportCampaignClosed)throw new ConflictException('La campaña ya está cerrada. El MVP no admite añadir nuevas obligaciones a un cierre terminal; las incidencias históricas siguen consultables.')
  if (error instanceof SupportForbidden) throw new ForbiddenException('Tus permisos cambiaron. Auditor conserva solo lectura.')
  if (error instanceof SupportInvalid) throw new BadRequestException('Revisa los datos y la confirmación de la incidencia.')
  if (error instanceof SupportMissing) throw new NotFoundException('El caso, contexto o evidencia no está disponible para tu cuenta.')
  if (error instanceof SupportConflict) throw new ConflictException('La solicitud ya fue utilizada con otro contenido. Consulta tus incidencias antes de crear otra.')
  throw error
}
@Controller('me/support-cases') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class SupportCaseController {
  constructor(private readonly cases: SupportCases) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  async list(@Req() request: AuthenticatedRequest, @Query('page') page?: string) {
    try { return await this.cases.list(request.brotarUser.id, page) } catch (error) { translate(error) }
  }
  @Get('context') @Header('Cache-Control', 'private, no-store')
  async context(@Req() request: AuthenticatedRequest, @Query('campaignId') campaignId?: string, @Query('contributionId') contributionId?: string) {
    try { return await this.cases.context(request.brotarUser.id, campaignId, contributionId) } catch (error) { translate(error) }
  }
  @Get(':id') @Header('Cache-Control', 'private, no-store')
  async detail(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.cases.detail(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Post() @Header('Cache-Control', 'private, no-store') @UseGuards(SessionMutationGuard)
  async create(@Req() request: AuthenticatedRequest, @Body() input: SupportCreateDto) {
    try { return await this.cases.create(request.brotarUser.id, input) } catch (error) { translate(error) }
  }
}
