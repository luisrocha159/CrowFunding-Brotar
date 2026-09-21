import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsEmail, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RegistrationLimitGuard } from '../../users/infrastructure/http/registration-limit.guard'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { OrganizationAccessUnavailable, Organizations, OrganizationTypeUnavailable } from '../application/organizations'
import { Memberships } from '../application/memberships'
import { NotFoundException, Injectable } from '@nestjs/common'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value
export class OrganizationDto {
  @Transform(trim) @IsString() @Length(1,200) legalName!: string
  @Transform(trim) @IsString() @Length(1,200) tradeName!: string
  @IsUUID() organizationTypeId!: string
  @Transform(trim) @IsEmail() @MaxLength(254) contactEmail!: string
  @Transform(trim) @IsString() @MaxLength(40) @Matches(/^(?:\+?[0-9][0-9 ()-]{3,39})?$/) contactPhone!: string
}
@Injectable()
export class OrganizationLimitGuard extends RegistrationLimitGuard {}
@Controller('organizations') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class OrganizationController {
  constructor(private readonly organizations: Organizations, private readonly memberships: Memberships) {}
  @Get('types') @Header('Cache-Control', 'no-store')
  types() { return this.organizations.types() }
  @Get() @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthenticatedRequest) { return this.organizations.list(request.brotarUser.id) }
  @Get(':id') @Header('Cache-Control', 'no-store')
  async find(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const organization = await this.organizations.find(request.brotarUser.id, id)
    if (!organization) throw new NotFoundException('Organización no disponible.')
    return organization
  }
  // Pertenencia comprobada en la API: el flujo creador la consulta antes de operar,
  // y la denegación no depende de que el frontend oculte controles.
  @Get(':id/membership') @Header('Cache-Control', 'no-store')
  async membership(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const role = await this.memberships.roleOf(request.brotarUser.id, id)
    if (role === null) throw new NotFoundException('Organización no disponible.')
    return { organizationId: id, organizationRole: role, manages: await this.memberships.manages(request.brotarUser.id, id) }
  }

  @Post() @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard, OrganizationLimitGuard)
  async create(@Req() request: AuthenticatedRequest, @Body() input: OrganizationDto) {
    try { return await this.organizations.create(request.brotarUser.id, input) }
    catch (error) {
      if (error instanceof OrganizationTypeUnavailable) throw new BadRequestException('El tipo de organización no está disponible.')
      if (error instanceof OrganizationAccessUnavailable) throw new ForbiddenException('Tu cuenta no está habilitada para esta operación.')
      throw error
    }
  }
}
