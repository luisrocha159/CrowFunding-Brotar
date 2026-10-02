import { BadRequestException, Body, ConflictException, Controller, Get, Header, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common'
import { Equals, IsBoolean } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { DiscardUnconfirmed, ProjectConflict, ProjectMissing, Projects } from '../application/projects'

export class DiscardProjectDto { @IsBoolean() @Equals(true) confirmed!: boolean }
function translate(error: unknown): never {
  if (error instanceof ProjectMissing) throw new NotFoundException('Proyecto no disponible.')
  if (error instanceof ProjectConflict) throw new ConflictException('Solo puedes descartar un borrador propio. Actualiza la lista.')
  if (error instanceof DiscardUnconfirmed) throw new BadRequestException('Confirma el descarte del borrador.')
  throw error
}
@Controller('campaigns/mine') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
export class ProjectsController {
  constructor(private readonly projects: Projects) {}
  @Get() @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthenticatedRequest) { return this.projects.listOwn(request.brotarUser.id) }
  @Get(':id') @Header('Cache-Control', 'no-store')
  async detail(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.projects.findOwn(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Post(':id/discard') @HttpCode(204) @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async discard(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: DiscardProjectDto) {
    try { await this.projects.discard(request.brotarUser.id, id, input.confirmed) } catch (error) { translate(error) }
  }
}
/** Preparación de S2-17: solo lectura, sin botones que simulen aprobar/publicar. */
@Controller('admin/campaigns/review') @UseGuards(RoleGuard) @RequireRoles('ADMIN')
export class CampaignReviewQueueController {
  constructor(private readonly projects: Projects) {}
  @Get() @Header('Cache-Control', 'no-store')
  list() { return this.projects.reviewQueue() }
  @Get(':id') @Header('Cache-Control', 'no-store')
  async detail(@Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.projects.findForReview(id) } catch (error) { translate(error) }
  }
}
