import {
  BadRequestException, Body, ConflictException, Controller, Get, Header, Injectable, NotFoundException,
  Param, ParseUUIDPipe, Post, Put, Req, UseGuards
} from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import {
  Categories, CategoryInUse, CategoryInvalid, CategoryNotFound, CategoryParentUnavailable, CategorySlugTaken
} from '../application/categories'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class CategoryDto {
  @Transform(trim) @IsString() @Length(1, 120) slug!: string
  @Transform(trim) @IsString() @Length(1, 120) name!: string
  @Transform(trim) @IsString() @MaxLength(2000) description!: string
  @IsInt() @Min(0) @Max(32767) displayOrder!: number
  @IsOptional() @IsUUID() parentId?: string
}

export class CategoryStateDto {
  @IsBoolean() isActive!: boolean
}

function translate(error: unknown): never {
  if (error instanceof CategoryNotFound) throw new NotFoundException('Categoría no disponible.')
  if (error instanceof CategorySlugTaken) throw new ConflictException('Ya existe una categoría con ese identificador.')
  if (error instanceof CategoryParentUnavailable) throw new BadRequestException('La categoría superior no está disponible.')
  if (error instanceof CategoryInUse) throw new ConflictException('La categoría está en uso y no se puede desactivar.')
  if (error instanceof CategoryInvalid) throw new BadRequestException('Datos de categoría inválidos.')
  throw error
}

/** Lectura del catálogo para cualquier cuenta registrada; el asistente de campaña la consume. */
@Controller('catalogs/categories') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class CategoryController {
  constructor(private readonly categories: Categories) {}

  @Get() @Header('Cache-Control', 'no-store')
  list() { return this.categories.list(false) }

  @Get(':id') @Header('Cache-Control', 'no-store')
  async find(@Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.categories.find(id) } catch (error) { translate(error) }
  }
}

/**
 * Edición autorizada (BG-55 CA 1): exige ADMIN, comprobado en la API. El auditor
 * queda fuera por la regla de solo lectura del RoleGuard, aunque acumule ADMIN.
 */
@Injectable()
@Controller('catalogs/admin/categories') @UseGuards(RoleGuard) @RequireRoles('ADMIN')
export class CategoryAdminController {
  constructor(private readonly categories: Categories) {}

  @Get() @Header('Cache-Control', 'no-store')
  list() { return this.categories.list(true) }

  @Post() @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async create(@Body() input: CategoryDto) {
    try { return await this.categories.create({ ...input, parentId: input.parentId ?? null }) }
    catch (error) { translate(error) }
  }

  @Put(':id') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: CategoryDto) {
    try { return await this.categories.update(id, { ...input, parentId: input.parentId ?? null }) }
    catch (error) { translate(error) }
  }

  @Put(':id/state') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async setState(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CategoryStateDto
  ) {
    // request.brotarUser confirma que la operación va asociada a una identidad autenticada.
    void request.brotarUser.id
    try { return await this.categories.setActive(id, input.isActive) } catch (error) { translate(error) }
  }
}
