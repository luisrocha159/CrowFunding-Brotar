import {
  BadRequestException, Body, ConflictException, Controller, Get, Header, NotFoundException,
  Param, ParseUUIDPipe, Put, Req, UseGuards
} from '@nestjs/common'
import { IsIn, IsOptional, IsBoolean } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { CAMPAIGN_TYPES, FUNDING_MODELS } from '../domain/modality'
import { DraftNotEditable, DraftNotFound } from '../application/drafts'
import { Modalities, ModalityDiscardsRewards, ModalityInvalid, type CampaignType, type FundingModel } from '../application/modality'

export class ModalityDto {
  @IsIn([...CAMPAIGN_TYPES]) campaignType!: CampaignType
  @IsOptional() @IsIn([...FUNDING_MODELS]) fundingModel?: FundingModel
  /** El creador reconoce que las recompensas cargadas dejarán de aplicar. */
  @IsOptional() @IsBoolean() acknowledgeRewards?: boolean
}

/** Etapa de modalidad del asistente (BG-15). Conserva la elección y no descarta datos. */
@Controller('campaigns/drafts/:id/modality') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class ModalityController {
  constructor(private readonly modalities: Modalities) {}

  @Get() @Header('Cache-Control', 'no-store')
  async read(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.modalities.read(request.brotarUser.id, id) }
    catch (error) {
      if (error instanceof DraftNotFound) throw new NotFoundException('Borrador no disponible.')
      throw error
    }
  }

  @Put() @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async change(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: ModalityDto
  ) {
    try {
      return await this.modalities.change(
        request.brotarUser.id, id, input.campaignType,
        input.fundingModel ?? null, input.acknowledgeRewards === true)
    } catch (error) {
      if (error instanceof DraftNotFound) throw new NotFoundException('Borrador no disponible.')
      if (error instanceof DraftNotEditable) throw new ConflictException('El borrador ya no admite edición por el asistente.')
      if (error instanceof ModalityDiscardsRewards) {
        // El filtro global solo conserva statusCode y message, así que el dato va en el texto.
        throw new ConflictException(
          `Tienes ${error.rewardCount} recompensa(s) cargada(s) que dejarán de aplicar en donación. ` +
          'No se borran: confirma el cambio con acknowledgeRewards para continuar.')
      }
      if (error instanceof ModalityInvalid) throw new BadRequestException('Modalidad o modelo de financiación no válidos.')
      throw error
    }
  }
}
