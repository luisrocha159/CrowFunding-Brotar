import { BadRequestException, Body, Controller, Get, Header, NotFoundException, Param, Put, Req, UseGuards } from '@nestjs/common'
import { IsDefined } from 'class-validator'
import { CatalogReadGuard } from './catalog-read.guard'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequirePermissions, RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { Settings, SettingNotAgreed, SettingValueInvalid } from '../application/categories'

export class SettingDto {
  @IsDefined() value!: unknown
}

/**
 * Claves operativas de ensayo acordadas en ADR-013 (BG-55 CA 2).
 * Los restantes parámetros no se admiten implícitamente. Cambio y auditoría son atómicos.
 */
@Controller('catalogs/admin/settings') @UseGuards(RoleGuard) @RequireRoles('ADMIN') @RequirePermissions('catalog.manage')
export class SettingController {
  constructor(private readonly settings: Settings) {}

  @Get() @Header('Cache-Control', 'no-store') @RequireRoles('REGISTERED_USER') @RequirePermissions('catalog.read') @UseGuards(CatalogReadGuard)
  list() { return this.settings.list() }

  @Get(':key') @Header('Cache-Control', 'no-store') @RequireRoles('REGISTERED_USER') @RequirePermissions('catalog.read') @UseGuards(CatalogReadGuard)
  async read(@Param('key') key: string) {
    try {
      const setting = await this.settings.read(key)
      if (!setting) throw new NotFoundException('Parámetro no definido.')
      return setting
    } catch (error) {
      if (error instanceof SettingNotAgreed) {
        throw new BadRequestException('El parámetro no está entre los acordados. Requiere D02 y D10.')
      }
      throw error
    }
  }

  @Put(':key') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async write(@Req() request: AuthenticatedRequest, @Param('key') key: string, @Body() input: SettingDto) {
    try { return await this.settings.write(key, input.value, request.brotarUser.id) }
    catch (error) {
      if(error instanceof SettingValueInvalid)throw new BadRequestException('Usa un entero dentro de los límites aprobados del parámetro.')
      if (error instanceof SettingNotAgreed) {
        throw new BadRequestException('El parámetro no está entre los acordados. Requiere D02 y D10.')
      }
      throw error
    }
  }
}
