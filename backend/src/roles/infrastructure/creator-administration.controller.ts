import { Body, ConflictException, Controller, ForbiddenException, Get, Header, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Equals, IsBoolean, IsEmail, IsString, MaxLength } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { CreatorAdministration, CreatorGrantConflict, CreatorGrantDenied, ManagedUserMissing } from '../application/creator-administration'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from './roles-http'

export class UserLookupDto { @IsEmail() @MaxLength(254) email!: string }
export class EnableCreatorDto {
  @IsBoolean() @Equals(true) confirmed!: boolean
  @IsString() @MaxLength(500) reason!: string
}
function translate(error: unknown): never {
  if (error instanceof ManagedUserMissing) throw new NotFoundException('No se encontró una cuenta disponible con esos datos.')
  if (error instanceof CreatorGrantDenied) throw new ForbiddenException('Se requiere un administrador vigente para habilitar creadores.')
  if (error instanceof CreatorGrantConflict) throw new ConflictException('No se pudo habilitar: revisa el estado, roles y motivo de la cuenta. No se reactivan concesiones vencidas o futuras.')
  throw error
}
@Controller('admin/users') @UseGuards(RoleGuard) @RequireRoles('ADMIN')
export class CreatorAdministrationController {
  constructor(private readonly administration: CreatorAdministration) {}
  @Get() @Header('Cache-Control', 'no-store')
  async find(@Query() input: UserLookupDto) {
    try { return await this.administration.find(input.email) } catch (error) { translate(error) }
  }
  @Post(':id/creator') @HttpCode(200) @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async grant(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: EnableCreatorDto) {
    try { return await this.administration.grant(request.brotarUser.id, id, input.reason) } catch (error) { translate(error) }
  }
}
