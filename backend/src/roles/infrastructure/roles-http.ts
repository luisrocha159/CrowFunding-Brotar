import { Controller, ForbiddenException, Get, Header, Injectable, Req, SetMetadata, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { Sessions, SessionMissing, type CurrentUser } from '../../auth/application/sessions'
import { readSessionCookie } from '../../auth/infrastructure/http/session-http'
import { RoleAccess } from '../application/roles'

const ROLE_REQUIREMENTS = 'brotar.requiredRoles'
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLE_REQUIREMENTS, roles)
export interface AuthenticatedRequest extends Request { brotarUser: CurrentUser }
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly sessions: Sessions, private readonly access: RoleAccess, private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    try { request.brotarUser = await this.sessions.current(readSessionCookie(request)) }
    catch (error) { if (error instanceof SessionMissing) throw new UnauthorizedException('Inicia sesión para continuar.'); throw error }
    const required = this.reflector.getAllAndOverride<string[]>(ROLE_REQUIREMENTS, [context.getHandler(), context.getClass()]) ?? []
    if (!await this.access.allows(request.brotarUser.id, required)) throw new ForbiddenException('Tu cuenta no tiene el rol requerido.')
    return true
  }
}
@Controller('access')
export class RolesController {
  constructor(private readonly sessions: Sessions, private readonly access: RoleAccess) {}
  @Get('roles') @Header('Cache-Control', 'no-store')
  async current(@Req() request: Request) {
    try {
      const user = await this.sessions.current(readSessionCookie(request))
      return { roles: await this.access.current(user.id) }
    } catch (error) { if (error instanceof SessionMissing) throw new UnauthorizedException('Inicia sesión para continuar.'); throw error }
  }
}
