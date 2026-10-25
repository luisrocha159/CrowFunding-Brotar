import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { RoleAccess } from '../../roles/application/roles'
import type { AuthenticatedRequest } from '../../roles/infrastructure/roles-http'

/** Se ejecuta después de RoleGuard: sesión vigente, ADMIN o AUDITOR para lectura. */
@Injectable()
export class CatalogReadGuard implements CanActivate {
  constructor(private readonly access: RoleAccess) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const roles = await this.access.current(request.brotarUser.id)
    if (!roles.some(role => role.code === 'ADMIN' || role.code === 'AUDITOR')) throw new ForbiddenException('Se requiere administración o auditoría para consultar el catálogo completo.')
    return true
  }
}
