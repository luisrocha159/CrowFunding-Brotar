import { Controller, ForbiddenException, Get, Header, Req, UseGuards } from '@nestjs/common'
import { RoleAccess } from '../../roles/application/roles'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
@Controller('administration/dashboard') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class AdministrativeDashboardController {
  constructor(private readonly database: DatabaseService, private readonly roles: RoleAccess) {}
  @Get() @Header('Cache-Control', 'no-store')
  async read(@Req() request: AuthenticatedRequest) {
    const roles = await this.roles.current(request.brotarUser.id)
    if (!roles.some(r => r.code === 'ADMIN' || r.code === 'AUDITOR')) throw new ForbiddenException('Se requiere administración o auditoría.')
    return this.database.connection().transaction('REPEATABLE READ', async m => ({
      readOnly: roles.some(r => r.code === 'AUDITOR'),
      campaigns: await m.query('SELECT status,count(*)::int AS count FROM public.campaign WHERE deleted_at IS NULL GROUP BY status ORDER BY status') as { status: string; count: number }[],
      catalogs: (await m.query('SELECT count(*) FILTER(WHERE is_active)::int AS active,count(*) FILTER(WHERE NOT is_active)::int AS inactive FROM public.category') as { active: number; inactive: number }[])[0],
      parties: (await m.query(`SELECT (SELECT count(*)::int FROM public.app_user WHERE deleted_at IS NULL) AS users,(SELECT count(*)::int FROM public.organization WHERE deleted_at IS NULL) AS organizations`) as { users: number; organizations: number }[])[0]
    }))
  }
}
