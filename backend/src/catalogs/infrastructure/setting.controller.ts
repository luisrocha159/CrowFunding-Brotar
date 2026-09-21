import { BadRequestException, Body, Controller, Get, Header, NotFoundException, Param, Put, Req, UseGuards } from '@nestjs/common'
import { IsDefined } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { Settings, SettingNotAgreed } from '../application/categories'

export class SettingDto {
  @IsDefined() value!: unknown
}

/**
 * Parámetros de negocio acordados (BG-55 CA 2). La lista de claves admitidas está
 * vacía mientras D02 y D10 sigan abiertas, así que toda clave se rechaza por ahora.
 * El mecanismo registra quién modifica en system_setting.updated_by.
 */
@Controller('catalogs/admin/settings') @UseGuards(RoleGuard) @RequireRoles('ADMIN')
export class SettingController {
  constructor(private readonly settings: Settings) {}

  @Get(':key') @Header('Cache-Control', 'no-store')
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
      if (error instanceof SettingNotAgreed) {
        throw new BadRequestException('El parámetro no está entre los acordados. Requiere D02 y D10.')
      }
      throw error
    }
  }
}
