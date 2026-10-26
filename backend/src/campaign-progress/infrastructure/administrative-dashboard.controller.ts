import { Controller, ForbiddenException, Get, Header, Req, UseGuards } from '@nestjs/common'
import { RoleAccess } from '../../roles/application/roles'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
@Controller('administration/dashboard') @UseGuards(RoleGuard) @RequirePermissions('dashboard.read')
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
      parties: (await m.query(`SELECT (SELECT count(*)::int FROM public.app_user WHERE deleted_at IS NULL) AS users,(SELECT count(*)::int FROM public.organization WHERE deleted_at IS NULL) AS organizations`) as { users: number; organizations: number }[])[0],
      supportAlerts:(await m.query(`SELECT count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.support_case_message msg WHERE msg.support_case_id=s.id AND NOT msg.is_internal AND msg.author_user_id IS DISTINCT FROM s.user_id)
        AND s.created_at<now()-make_interval(hours=>COALESCE((SELECT (value::text)::int FROM public.system_setting WHERE key='support.first_response_hours'),48)))::int AS "firstResponseDue",
        count(*) FILTER(WHERE s.created_at<now()-make_interval(hours=>COALESCE((SELECT (value::text)::int FROM public.system_setting WHERE key='support.escalation_hours'),120)))::int AS "escalationDue"
        FROM public.support_case s WHERE s.status NOT IN ('RESOLVED','CLOSED')`))[0]
    }))
  }
}
