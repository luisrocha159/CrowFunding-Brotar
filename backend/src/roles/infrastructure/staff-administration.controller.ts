import { Body, ConflictException, Controller, ForbiddenException, Header, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common'
import { Equals, IsBoolean, IsIn, IsString, MaxLength, MinLength } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { STAFF_ROLES, StaffRoleConflict, StaffRoleDenied, StaffUserMissing } from '../domain/staff-role'
import { RequirePermissions, RequireRoles, RoleGuard, type AuthenticatedRequest } from './roles-http'
import { StaffAdministration } from './staff-administration'

export class StaffChangeDto {
  @IsIn(STAFF_ROLES) role!: string
  @IsIn(['GRANT', 'REVOKE']) operation!: 'GRANT' | 'REVOKE'
  @IsBoolean() @Equals(true) confirmed!: boolean
  @IsString() @MinLength(10) @MaxLength(500) reason!: string
}
@Controller('admin/users') @UseGuards(RoleGuard, SessionMutationGuard) @RequireRoles('ADMIN') @RequirePermissions('roles.manage')
export class StaffAdministrationController {
  constructor(private readonly staff: StaffAdministration) {}
  @Post(':id/responsibilities') @HttpCode(200) @Header('Cache-Control', 'no-store')
  async change(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: StaffChangeDto) {
    try { return await this.staff.change(request.brotarUser.id, id, input.role, input.operation, input.reason) }
    catch (error) {
      if (error instanceof StaffRoleDenied) throw new ForbiddenException(error.message)
      if (error instanceof StaffRoleConflict) throw new ConflictException(error.message)
      if (error instanceof StaffUserMissing) throw new NotFoundException(error.message)
      throw error
    }
  }
}
