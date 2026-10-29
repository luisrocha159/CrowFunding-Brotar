import { BadRequestException, Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { incompleteExecution, incompleteReward } from '../../campaign-lifecycle/infrastructure/closure-integrity'

export function dashboardQuery(page: string, scope: string) {
  if (!/^[1-9]\d{0,5}$/.test(page) || Number(page) > 100000 || !['all', 'personal', 'institutional'].includes(scope)) throw new BadRequestException('Página o ámbito del panel inválido.')
  return { page: Number(page), scope }
}
const accessible = `WITH own AS (
 SELECT c.*,o.legal_name AS organization_name FROM public.campaign c LEFT JOIN public.organization o ON o.id=c.organization_id
 WHERE c.deleted_at IS NULL AND ((c.organization_id IS NULL AND c.creator_user_id=$1) OR
  (o.deleted_at IS NULL AND o.status NOT IN ('SUSPENDED','CLOSED') AND EXISTS(SELECT 1 FROM public.organization_member om
    WHERE om.organization_id=c.organization_id AND om.user_id=$1 AND om.organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN')
     AND om.joined_at<=clock_timestamp() AND (om.left_at IS NULL OR om.left_at>clock_timestamp()))))
 AND ($2='all' OR ($2='personal' AND c.organization_id IS NULL) OR ($2='institutional' AND c.organization_id IS NOT NULL))
), metrics AS (SELECT c.*,
 COALESCE(f.real,0)::numeric(16,2) AS real_amount,COALESCE(f.demo,0)::numeric(16,2) AS demo_amount
 FROM own c LEFT JOIN LATERAL (
  SELECT GREATEST(COALESCE(sum(p.amount-COALESCE(r.amount,0)) FILTER(WHERE NOT pp.is_sandbox),0),0) AS real,
   GREATEST(COALESCE(sum(p.amount-COALESCE(r.amount,0)) FILTER(WHERE pp.is_sandbox),0),0) AS demo
  FROM public.contribution ct JOIN public.payment p ON p.contribution_id=ct.id JOIN public.payment_provider pp ON pp.id=p.provider_id
  LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM public.refund WHERE payment_id=p.id AND status='REFUNDED') r ON true
  WHERE ct.campaign_id=c.id AND p.currency_code=c.currency_code AND p.confirmed_at IS NOT NULL
 ) f ON true)`
const verification = (code: string, org = false) => `(SELECT CASE WHEN v.expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE v.status::text END FROM public.verification v JOIN public.verification_type t ON t.id=v.verification_type_id WHERE t.code='${code}' AND ${org ? 'v.organization_id=c.organization_id' : 'v.user_id=$1 AND v.organization_id IS NULL'} ORDER BY v.created_at DESC,v.id DESC LIMIT 1)`
@Injectable()
export class CreatorDashboardRepository {
  constructor(private readonly database: DatabaseService) {}
  async read(actor: string, page: number, scope: string) {
    return this.database.connection().transaction('REPEATABLE READ', async m => {
      const [summary] = await m.query(`${accessible} SELECT (SELECT count(*)::int FROM own) AS total,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('status',status,'count',n) ORDER BY status) FROM (SELECT status,count(*)::int AS n FROM own GROUP BY status) s),'[]') AS states,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('currencyCode',trim(currency_code),'amountRaised',real::text,'demoAmountRaised',demo::text) ORDER BY currency_code) FROM (SELECT currency_code,sum(real_amount)::numeric(16,2) AS real,sum(demo_amount)::numeric(16,2) AS demo FROM metrics WHERE currency_code IS NOT NULL GROUP BY currency_code) f),'[]') AS funding`, [actor, scope])
      const items = await m.query(`${accessible} SELECT c.id,c.title,c.status,c.currency_code AS "currencyCode",c.goal_amount::text AS "goalAmount",c.organization_id AS "organizationId",c.organization_name AS "organizationName",
       c.real_amount::text AS "amountRaised",c.demo_amount::text AS "demoAmountRaised",
       CASE WHEN c.goal_amount>0 THEN round(c.real_amount/c.goal_amount*100,2) ELSE 0 END::text AS "fundingPercent",
       CASE WHEN c.goal_amount>0 THEN round(c.demo_amount/c.goal_amount*100,2) ELSE 0 END::text AS "demoFundingPercent",
       (SELECT count(*)::int FROM public.campaign_update u LEFT JOIN brotar_extension.update_version uv ON uv.update_id=u.id WHERE u.campaign_id=c.id AND u.deleted_at IS NULL AND u.published_at IS NOT NULL AND u.visibility='PUBLIC' AND uv.withdrawn_at IS NULL AND NOT EXISTS(SELECT 1 FROM brotar_extension.publication_successor ps WHERE ps.supersedes_id=u.id)) AS "updateCount",
       (SELECT round(avg(a.progress_percent),1)::text FROM public.campaign_activity a WHERE a.campaign_id=c.id) AS "activityProgress",
       ((SELECT count(*)::int FROM public.campaign_activity WHERE campaign_id=c.id AND ${incompleteExecution})+
        (SELECT count(*)::int FROM public.milestone WHERE campaign_id=c.id AND ${incompleteExecution})) AS "pendingActivities",
       (SELECT count(*)::int FROM public.contribution ct WHERE ct.campaign_id=c.id AND ${incompleteReward.replace(/\bc\./g, 'ct.')}) AS "pendingRewards",
       (SELECT count(*)::int FROM public.support_case s WHERE s.campaign_id=c.id AND s.status NOT IN ('CLOSED','RESOLVED')) AS "pendingCases",
       (SELECT r.status::text FROM public.accountability_report r WHERE r.campaign_id=c.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) AS "reportStatus",
       ${verification('KYC_IDENTITY')} AS "verificationStatus",${verification('KYB_LEGAL', true)} AS "legalStatus",${verification('KYB_REPRESENTATIVE', true)} AS "representativeStatus"
       FROM metrics c ORDER BY c.updated_at DESC,c.id LIMIT 20 OFFSET $3`, [actor, scope, (page - 1) * 20])
      return { ...summary, items, page, pageSize: 20 }
    })
  }
}
