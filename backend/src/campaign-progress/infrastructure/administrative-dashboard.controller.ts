import {currentPeriodic} from '../../accountability/infrastructure/accountability-integrity'
import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common'
import { RoleAccess } from '../../roles/application/roles'
import { PermissionAccess } from '../../roles/application/permissions'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import {rewardOwed} from '../../campaign-lifecycle/infrastructure/closure-integrity'
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
      const [snapshot]: {asOf: Date}[] = await m.query('SELECT transaction_timestamp() AS "asOf"')
      const result: Record<string, unknown> = { readOnly, asOf: snapshot!.asOf.toISOString() }
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
      if (has('finance.read')) result.financeAlerts = (await m.query(`SELECT
        (SELECT count(*)::int FROM public.payment) AS "paymentsTotal",
        (SELECT count(*)::int FROM public.payment WHERE status IN ('INITIATED','PENDING')) AS "paymentsPending",
        (SELECT count(*)::int FROM public.payment WHERE status IN ('INITIATED','PENDING') AND expires_at<=now()) AS "paymentsOverdue",
        (SELECT count(DISTINCT payment_id)::int FROM brotar_extension.demo_event WHERE processing IN ('RECEIVED','NEEDS_REVIEW')) AS "paymentsNeedingReview",
        (SELECT count(*)::int FROM public.reconciliation r JOIN brotar_extension.demo_reconciliation x ON x.reconciliation_id=r.id WHERE r.status<>'CLOSED') AS "reconciliationOpen",
        (SELECT count(*)::int FROM public.reconciliation_item i JOIN brotar_extension.demo_reconciliation x ON x.reconciliation_id=i.reconciliation_id JOIN public.reconciliation r ON r.id=i.reconciliation_id WHERE r.status<>'CLOSED' AND i.status NOT IN ('MATCHED','RESOLVED')) AS "reconciliationUnresolved",
        (SELECT count(*)::int FROM public.disbursement d JOIN brotar_extension.demo_disbursement x ON x.disbursement_id=d.id WHERE d.status='PENDING') AS "disbursementsPending",
        (SELECT count(*)::int FROM public.disbursement d JOIN brotar_extension.demo_disbursement x ON x.disbursement_id=d.id WHERE d.status='APPROVED') AS "disbursementsApproved",
        (SELECT count(*)::int FROM public.disbursement d JOIN brotar_extension.demo_disbursement x ON x.disbursement_id=d.id WHERE d.status='PROCESSING') AS "disbursementsProcessing",
        (SELECT count(*)::int FROM public.refund r JOIN brotar_extension.demo_refund x ON x.refund_id=r.id WHERE r.status='REQUESTED') AS "refundsRequested",
        (SELECT count(*)::int FROM public.refund r JOIN brotar_extension.demo_refund x ON x.refund_id=r.id WHERE r.status='PROCESSING') AS "refundsProcessing"`))[0]
      if (has('support.read')) result.disputeAlerts = (await m.query(`SELECT
        count(*) FILTER(WHERE d.status NOT IN ('RESOLVED','CLOSED'))::int AS open,
        count(*) FILTER(WHERE d.status='AWAITING_RESPONSE')::int AS "awaitingResponse",
        count(*) FILTER(WHERE d.status='ESCALATED')::int AS escalated
        FROM public.dispute d JOIN brotar_extension.demo_dispute x ON x.dispute_id=d.id`))[0]
      if (has('campaign.closure.read')) {
        result.accountabilityAlerts = (await m.query(`WITH current_reports AS (
          SELECT r.status FROM public.accountability_report r WHERE ${currentPeriodic} UNION ALL
          SELECT status FROM(SELECT DISTINCT ON(campaign_id) status FROM public.accountability_report WHERE is_final ORDER BY campaign_id,created_at DESC,id DESC) latest)
          SELECT count(*) FILTER(WHERE status IN ('SUBMITTED','IN_REVIEW'))::int AS "awaitingReview",
          count(*) FILTER(WHERE status='CHANGES_REQUESTED')::int AS "requiresInformation" FROM current_reports`))[0]
        result.closureAlerts = (await m.query(`SELECT count(*)::int AS blocked FROM public.campaign ca WHERE ca.deleted_at IS NULL AND ca.status IN ('IN_EXECUTION','CANCELLED') AND (
          EXISTS(SELECT 1 FROM public.support_case s WHERE s.campaign_id=ca.id AND s.status NOT IN ('RESOLVED','CLOSED')) OR
          EXISTS(SELECT 1 FROM public.contribution c WHERE c.campaign_id=ca.id AND ${rewardOwed} AND NOT EXISTS(
            SELECT 1 FROM public.reward_fulfillment rf JOIN brotar_extension.campaign_reward_evidence e ON e.contribution_id=rf.contribution_id
            JOIN public.file_asset f ON f.id=e.file_id WHERE rf.contribution_id=c.id AND rf.status='FULFILLED' AND f.scope='PRIVATE' AND f.storage_key LIKE 'CLOSURE_EVIDENCE/%' AND f.deleted_at IS NULL)) OR
          (ca.status='IN_EXECUTION' AND COALESCE((SELECT a.status::text IN ('APPROVED','PUBLISHED') FROM public.accountability_report a
            WHERE a.campaign_id=ca.id AND a.is_final ORDER BY a.created_at DESC,a.id DESC LIMIT 1),false)=false))`))[0]
      }
      return result
    })
  }
}
