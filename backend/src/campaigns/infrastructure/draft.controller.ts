import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header,
  NotFoundException, Param, ParseUUIDPipe, Post, Put, Req, UseGuards
} from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { CAMPAIGN_TYPES, LAST_BUILDER_STEP, TOTAL_BUILDER_STEPS } from '../domain/draft'
import {
  Drafts, DraftCategoryUnavailable, DraftInvalid, DraftNotEditable, DraftNotFound,
  DraftOrganizationForbidden, DraftStepUnreachable, type CampaignType
} from '../application/drafts'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class DraftDto {
  @Transform(trim) @IsString() @Length(1, 200) title!: string
  @Transform(trim) @IsString() @MaxLength(300) summary!: string
  @IsIn([...CAMPAIGN_TYPES]) campaignType!: CampaignType
  @IsOptional() @IsUUID() categoryId?: string
  @IsOptional() @IsUUID() organizationId?: string
}

export class DraftSaveDto extends DraftDto {
  @IsInt() @Min(0) @Max(LAST_BUILDER_STEP) builderStep!: number
}

function translate(error: unknown): never {
  if (error instanceof DraftNotFound) throw new NotFoundException('Borrador no disponible.')
  if (error instanceof DraftNotEditable) throw new ConflictException('El borrador ya no admite edición por el asistente.')
  if (error instanceof DraftStepUnreachable) throw new ConflictException('Ese paso no es alcanzable desde la posición actual.')
  if (error instanceof DraftOrganizationForbidden) throw new ForbiddenException('No gestionas esa organización.')
  if (error instanceof DraftCategoryUnavailable) throw new BadRequestException('La categoría no está disponible.')
  if (error instanceof DraftInvalid) throw new BadRequestException('Datos del borrador inválidos.')
  throw error
}

/**
 * Asistente de creación (BG-18). Toda operación va contra el borrador propio:
 * la propiedad se comprueba en la API y la posición se guarda junto a los datos.
 */
@Controller('campaigns/drafts') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class DraftController {
  constructor(private readonly drafts: Drafts) {}

  @Get() @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthenticatedRequest) {
    return this.drafts.listOwn(request.brotarUser.id)
  }

  @Get(':id') @Header('Cache-Control', 'no-store')
  async find(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const draft = await this.drafts.findOwn(request.brotarUser.id, id)
      return { ...draft, totalSteps: TOTAL_BUILDER_STEPS }
    } catch (error) { translate(error) }
  }

  @Post() @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async create(@Req() request: AuthenticatedRequest, @Body() input: DraftDto) {
    try {
      const draft = await this.drafts.create(request.brotarUser.id, {
        ...input, categoryId: input.categoryId ?? null, organizationId: input.organizationId ?? null
      })
      return { ...draft, totalSteps: TOTAL_BUILDER_STEPS }
    } catch (error) { translate(error) }
  }

  /** Guardado manual o automático: el cliente reintenta esta misma operación. */
  @Put(':id') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async save(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: DraftSaveDto
  ) {
    try {
      const draft = await this.drafts.save(request.brotarUser.id, id, {
        title: input.title, summary: input.summary, campaignType: input.campaignType,
        categoryId: input.categoryId ?? null, organizationId: input.organizationId ?? null
      }, input.builderStep)
      return { ...draft, totalSteps: TOTAL_BUILDER_STEPS }
    } catch (error) { translate(error) }
  }
}
