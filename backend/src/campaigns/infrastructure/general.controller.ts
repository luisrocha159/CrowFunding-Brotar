import {
  BadRequestException, Body, ConflictException, Controller, Get, Header, NotFoundException,
  Param, ParseUUIDPipe, Put, Req, UseGuards
} from '@nestjs/common'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize, IsArray, IsDefined, IsNumber, IsObject, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested
} from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { LIMITS } from '../domain/general'
import { STORY_LIMITS } from '../domain/story'
import { DraftNotEditable, DraftNotFound } from '../application/drafts'
import { CategoryUnavailable, CountryUnavailable, FieldErrors, GeneralInfo, TooManyIndicators } from '../application/general'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class LocationDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 2) countryCode?: string
  @Transform(trim) @IsString() @MaxLength(LIMITS.locality) locality!: string
  @Transform(trim) @IsString() @MaxLength(LIMITS.addressLine) addressLine!: string
  @Transform(trim) @IsString() @MaxLength(LIMITS.reference) reference!: string
}

export class GeneralDto {
  @Transform(trim) @IsString() @MaxLength(LIMITS.title) title!: string
  @Transform(trim) @IsString() @MaxLength(LIMITS.summary) summary!: string
  @IsOptional() @IsUUID() categoryId?: string
  @IsDefined() @IsObject() @ValidateNested() @Type(() => LocationDto) location!: LocationDto
}

export class IndicatorDto {
  @Transform(trim) @IsString() @MaxLength(STORY_LIMITS.indicatorName) name!: string
  @Transform(trim) @IsString() @MaxLength(STORY_LIMITS.text) description!: string
  @Transform(trim) @IsString() @MaxLength(STORY_LIMITS.unit) unit!: string
  @IsOptional() @IsNumber() baselineValue?: number
  @IsOptional() @IsNumber() targetValue?: number
  // achievedValue no se declara a propósito: el asistente registra metas, no resultados.
}

export class StoryDto {
  @Transform(trim) @IsString() @MaxLength(STORY_LIMITS.text) problem!: string
  @Transform(trim) @IsString() @MaxLength(STORY_LIMITS.text) solution!: string
  @Transform(trim) @IsString() @MaxLength(STORY_LIMITS.text) beneficiaries!: string
  @Transform(trim) @IsString() @MaxLength(STORY_LIMITS.text) expectedResults!: string
  @IsArray() @ArrayMaxSize(STORY_LIMITS.indicators) @ValidateNested({ each: true })
  @Type(() => IndicatorDto) indicators!: IndicatorDto[]
}

function translate(error: unknown): never {
  if (error instanceof DraftNotFound) throw new NotFoundException('Borrador no disponible.')
  if (error instanceof DraftNotEditable) throw new ConflictException('El borrador ya no admite edición por el asistente.')
  if (error instanceof CategoryUnavailable) throw new BadRequestException('La categoría no está disponible.')
  if (error instanceof CountryUnavailable) throw new BadRequestException('El país no está disponible.')
  if (error instanceof TooManyIndicators) throw new BadRequestException(`Máximo ${STORY_LIMITS.indicators} indicadores.`)
  if (error instanceof FieldErrors) {
    // El filtro global conserva message como lista de cadenas: un error por campo (CA 2).
    throw new BadRequestException(Object.entries(error.fields).map(([field, message]) => `${field}: ${message}`))
  }
  throw error
}

/** Información general (BG-16) e historia e impacto (BG-19) del borrador. */
@Controller('campaigns/drafts/:id') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class GeneralController {
  constructor(private readonly general: GeneralInfo) {}

  @Get('general') @Header('Cache-Control', 'no-store')
  async readGeneral(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return { ...await this.general.readGeneral(request.brotarUser.id, id), limits: LIMITS } }
    catch (error) { translate(error) }
  }

  @Put('general') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async saveGeneral(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: GeneralDto
  ) {
    try {
      const saved = await this.general.saveGeneral(request.brotarUser.id, id, {
        title: input.title, summary: input.summary, categoryId: input.categoryId ?? null,
        location: {
          countryCode: input.location.countryCode ?? null,
          locality: input.location.locality, addressLine: input.location.addressLine,
          reference: input.location.reference
        }
      })
      return { ...saved, limits: LIMITS }
    } catch (error) { translate(error) }
  }

  @Get('story') @Header('Cache-Control', 'no-store')
  async readStory(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return { ...await this.general.readStory(request.brotarUser.id, id), limits: STORY_LIMITS } }
    catch (error) { translate(error) }
  }

  @Put('story') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async saveStory(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: StoryDto
  ) {
    try {
      const saved = await this.general.saveStory(request.brotarUser.id, id, {
        problem: input.problem, solution: input.solution,
        beneficiaries: input.beneficiaries, expectedResults: input.expectedResults
      }, input.indicators.map((indicator) => ({
        name: indicator.name, description: indicator.description, unit: indicator.unit,
        baselineValue: indicator.baselineValue ?? null, targetValue: indicator.targetValue ?? null
      })))
      return { ...saved, limits: STORY_LIMITS }
    } catch (error) { translate(error) }
  }

  /** Tarjeta y revisión: solo lo guardado, sin cifras ni verificaciones inventadas. */
  @Get('review') @Header('Cache-Control', 'no-store')
  async review(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.general.review(request.brotarUser.id, id) }
    catch (error) { translate(error) }
  }
}
