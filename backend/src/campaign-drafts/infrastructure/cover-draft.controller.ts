import { BadRequestException, Body, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common'
import { IsString, IsUUID, Length } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { CampaignCoverDrafts, CampaignCoverUnavailable, InvalidCampaignCover } from '../application/cover-draft'

class CoverDraftDto {
  @IsUUID()
  fileId!: string

  @IsString()
  @Length(10, 180)
  altText!: string
}

@Controller('campaigns/drafts/:id/cover')
@UseGuards(RoleGuard)
@RequireRoles('REGISTERED_USER')
export class CoverDraftController {
  constructor(private readonly covers: CampaignCoverDrafts) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async read(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.covers.read(request.brotarUser.id, id) }
    catch (error) {
      if (error instanceof CampaignCoverUnavailable) throw new NotFoundException('Borrador no disponible.')
      throw error
    }
  }

  @Patch()
  @Header('Cache-Control', 'no-store')
  @UseGuards(SessionMutationGuard)
  async save(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: CoverDraftDto) {
    try { return await this.covers.save(request.brotarUser.id, id, input.fileId, input.altText) }
    catch (error) {
      if (error instanceof InvalidCampaignCover) throw new BadRequestException('La portada no cumple los requisitos del borrador.')
      if (error instanceof CampaignCoverUnavailable) throw new NotFoundException('La portada cargada no está disponible para tu cuenta.')
      throw error
    }
  }
}
