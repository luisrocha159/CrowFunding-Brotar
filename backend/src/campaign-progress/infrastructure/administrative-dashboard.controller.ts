import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common'
import { RoleAccess } from '../../roles/application/roles'
import { PermissionAccess } from '../../roles/application/permissions'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
@Controller('administration/dashboard') @UseGuards(RoleGuard) @RequirePermissions('dashboard.read')
export class AdministrativeDashboardController {
  constructor(private readonly database: DatabaseService, private readonly roles: RoleAccess, private readonly permissions: PermissionAccess) {}
  @Get() @Header('Cache-Control', 'no-store')
  async read(@Req() request: AuthenticatedRequest) {
    const roles = await this.roles.current(request.brotarUser.id)
    const granted = new Set(await this.permissions.granted(request.brotarUser.id))
    const has = (permission: string) => granted.has(permission)
    const readOnly = roles.some(r => r.code === 'AUDITOR')
    return this.database.connection().transaction('REPEATABLE READ', async m => {
      const result: Record<string, unknown> = { readOnly }
      if (has('campaign.review.read') || has('campaign.lifecycle.read') || roles.some(r => r.code === 'ADMIN')) result.campaigns = await m.query('SELECT status,count(*)::int AS count FROM public.campaign WHERE deleted_at IS NULL GROUP BY status ORDER BY status') as { status: string; count: number }[]
      if (has('catalog.read')) result.catalogs = (await m.query('SELECT count(*) FILTER(WHERE is_active)::int AS active,count(*) FILTER(WHERE NOT is_active)::int AS inactive FROM public.category') as { active: number; inactive: number }[])[0]
      if (has('parties.read')) result.parties = (await m.query(`SELECT (SELECT count(*)::int FROM public.app_user WHERE deleted_at IS NULL) AS users,(SELECT count(*)::int FROM public.organization WHERE deleted_at IS NULL) AS organizations`) as { users: number; organizations: number }[])[0]
      if (has('support.read')) result.supportAlerts = (await m.query(`SELECT count(*)::int AS open,
        count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.support_case_message msg WHERE msg.support_case_id=s.id AND NOT msg.is_internal AND msg.author_user_id IS DISTINCT FROM s.user_id)
          AND s.created_at<now()-make_interval(hours=>COALESCE((SELECT (value::text)::int FROM public.system_setting WHERE key='support.first_response_hours'),48)))::int AS "firstResponseDue",
        count(*) FILTER(WHERE s.created_at<now()-make_interval(hours=>COALESCE((SELECT (value::text)::int FROM public.system_setting WHERE key='support.escalation_hours'),120)))::int AS "escalationDue"
        FROM public.support_case s WHERE s.status NOT IN ('RESOLVED','CLOSED') AND NOT EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id)`))[0]
      if (has('verification.read')) result.identityAlerts = (await m.query(`SELECT count(*) FILTER(WHERE status IN ('PENDING','IN_REVIEW'))::int AS "awaitingReview",
        count(*) FILTER(WHERE status='REQUIRES_INFO')::int AS "requiresInformation" FROM public.verification`))[0]
      if (has('campaign.closure.read')) {
        result.accountabilityAlerts = (await m.query(`SELECT count(*) FILTER(WHERE status IN ('SUBMITTED','IN_REVIEW'))::int AS "awaitingReview",
          count(*) FILTER(WHERE status='CHANGES_REQUESTED')::int AS "requiresInformation" FROM public.accountability_report`))[0]
        result.closureAlerts = (await m.query(`SELECT count(*)::int AS blocked FROM public.campaign c WHERE c.deleted_at IS NULL AND c.status IN ('IN_EXECUTION','CANCELLED','CLOSED') AND (
          EXISTS(SELECT 1 FROM public.support_case s WHERE s.campaign_id=c.id AND s.status NOT IN ('RESOLVED','CLOSED')) OR
          EXISTS(SELECT 1 FROM public.contribution x JOIN public.reward_fulfillment r ON r.contribution_id=x.id WHERE x.campaign_id=c.id AND r.status NOT IN ('FULFILLED','CANCELLED')) OR
          EXISTS(SELECT 1 FROM public.accountability_report a WHERE a.campaign_id=c.id AND a.is_final AND a.status NOT IN ('APPROVED','PUBLISHED')) OR
          (c.status='IN_EXECUTION' AND NOT EXISTS(SELECT 1 FROM public.accountability_report a WHERE a.campaign_id=c.id AND a.is_final AND a.status IN ('APPROVED','PUBLISHED'))))`))[0]
      }
      return result
    })
  }
}
