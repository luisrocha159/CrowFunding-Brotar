import { Controller, ForbiddenException, Get, Header, Injectable, Req, SetMetadata, UnauthorizedException, UseGuards, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { Sessions, SessionMissing, type CurrentUser } from '../../auth/application/sessions'
import { readSessionCookie } from '../../auth/infrastructure/http/session-http'
import { RoleAccess } from '../application/roles'
import { PermissionAccess } from '../application/permissions'
import { hasRequiredRoles } from '../domain/role'
import { deniesMutation } from '../domain/responsibility'
import { effectivePermissions } from '../domain/access-policy'

const ROLE_REQUIREMENTS = 'brotar.requiredRoles'
const PERMISSION_REQUIREMENTS = 'brotar.requiredPermissions'
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLE_REQUIREMENTS, roles)
/** Declara el permiso que exige el endpoint. Sin declararlo no se concede nada por omisión. */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSION_REQUIREMENTS, permissions)
export interface AuthenticatedRequest extends Request { brotarUser: CurrentUser }
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly sessions: Sessions,
    private readonly access: RoleAccess,
    private readonly permissions: PermissionAccess,
    private readonly reflector: Reflector
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    try { request.brotarUser = await this.sessions.current(readSessionCookie(request)) }
    catch (error) { if (error instanceof SessionMissing) throw new UnauthorizedException('Inicia sesión para continuar.'); throw error }

    // Una sola lectura de roles vigentes para las tres comprobaciones siguientes.
    const current = await this.access.current(request.brotarUser.id)
    if (deniesMutation(current.map((role) => role.code), request.method)) {
      throw new ForbiddenException('El rol auditor se mantiene en lectura.')
    }
    const required = this.reflector.getAllAndOverride<string[]>(ROLE_REQUIREMENTS, [context.getHandler(), context.getClass()])
    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSION_REQUIREMENTS, [context.getHandler(), context.getClass()])
    if (required === undefined && permissions === undefined) throw new ForbiddenException('La operación no declara autorización.')
    if (required !== undefined && !hasRequiredRoles(current, required)) throw new ForbiddenException('Tu cuenta no tiene el rol requerido.')
    if (permissions !== undefined && !await this.permissions.allows(request.brotarUser.id, permissions)) {
      throw new ForbiddenException('Tu cuenta no tiene el permiso requerido.')
    }
    return true
  }
}
@Controller('access')
export class RolesController {
  constructor(private readonly sessions: Sessions, private readonly access: RoleAccess, private readonly permissions: PermissionAccess) {}
  @Get('permissions') @Header('Cache-Control', 'no-store') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
  async capabilities(@Req() request: AuthenticatedRequest) {
    const roles = await this.access.current(request.brotarUser.id)
    const readOnly = roles.some(role => role.code === 'AUDITOR')
    return { permissions: effectivePermissions(await this.permissions.granted(request.brotarUser.id), readOnly), readOnly }
  }
  @Get('roles') @Header('Cache-Control', 'no-store')
  async current(@Req() request: Request) {
    try {
      const user = await this.sessions.current(readSessionCookie(request))
      return { roles: await this.access.current(user.id) }
    } catch (error) { if (error instanceof SessionMissing) throw new UnauthorizedException('Inicia sesión para continuar.'); throw error }
  }
}
