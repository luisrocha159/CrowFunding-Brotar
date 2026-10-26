import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { confirmedPayment, type ContributionDetail, type ContributionItem, type ContributionPage, type ContributionQuery, type ContributionRepository, type SponsorSummary } from '../application/contributions'

// No se filtra por estado público: la relación del aporte conserva el historial del titular.
const publicHistory = "ca.deleted_at IS NULL AND (ca.status='PUBLISHED' OR (ca.published_at IS NOT NULL AND ca.status IN ('FUNDING_ENDED','IN_EXECUTION','CLOSED','CANCELLED')))"
const projection = `c.id,c.reference_code AS reference,c.amount::text,c.currency_code AS currency,c.status,c.created_at AS "createdAt",c.confirmed_at AS "confirmedAt",
  jsonb_build_object('id',ca.id,'title',CASE WHEN ${publicHistory} THEN ca.title ELSE 'Campaña no disponible' END,
    'slug',CASE WHEN ca.deleted_at IS NULL AND ca.status='PUBLISHED' THEN ca.slug ELSE NULL END,
    'status',CASE WHEN ${publicHistory} THEN ca.status::text ELSE 'UNAVAILABLE' END) AS campaign,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'amount',p.amount::text,'currency',p.currency_code,
    'status',p.status,'method',pm.name,'sandbox',pp.is_sandbox,'demo',pp.code='BROTAR_INTERNAL_DEMO' AND pp.is_sandbox,'createdAt',p.created_at,'confirmedAt',p.confirmed_at)
    ORDER BY p.attempt_number,p.id) FROM public.payment p JOIN public.payment_provider pp ON pp.id=p.provider_id
    LEFT JOIN public.payment_method pm ON pm.id=p.payment_method_id WHERE p.contribution_id=c.id),'[]'::jsonb) AS payments`
type ItemRow = Omit<ContributionItem, 'createdAt' | 'confirmedAt' | 'receiptAvailable'> & { createdAt: Date; confirmedAt: Date | null }
const itemFrom = (row: ItemRow): ContributionItem => ({ ...row, createdAt: row.createdAt.toISOString(), confirmedAt: row.confirmedAt?.toISOString() ?? null, receiptAvailable: Boolean(confirmedPayment(row)) })
@Injectable()
export class TypeormContributionRepository implements ContributionRepository {
  constructor(private readonly database: DatabaseService) {}
  async list(userId: string, query: ContributionQuery): Promise<ContributionPage> {
    const where = `c.user_id=$1 AND ($2::text IS NULL OR c.status::text=$2)
      AND ($3::date IS NULL OR c.created_at>=($3::date::timestamp AT TIME ZONE 'America/La_Paz'))
      AND ($4::date IS NULL OR c.created_at<(($4::date+1)::timestamp AT TIME ZONE 'America/La_Paz'))`
    const parameters = [userId, query.status ?? null, query.from ?? null, query.to ?? null]
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const count = await manager.query(`SELECT count(*)::int AS total FROM public.contribution c WHERE ${where}`, parameters) as { total: number }[]
      const rows = await manager.query(`SELECT ${projection} FROM public.contribution c JOIN public.campaign ca ON ca.id=c.campaign_id
        WHERE ${where} ORDER BY c.created_at DESC,c.id DESC LIMIT 20 OFFSET $5`, [...parameters, (query.page - 1) * 20]) as ItemRow[]
      return { items: rows.map(itemFrom), total: count[0]!.total, page: query.page, pageSize: 20 }
    })
  }
  async detail(userId: string, id: string): Promise<ContributionDetail | null> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const rows = await manager.query(`SELECT ${projection}, CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object('id',r.id,'title',CASE WHEN ${publicHistory} THEN r.title ELSE 'Recompensa no disponible' END) END AS reward
        FROM public.contribution c JOIN public.campaign ca ON ca.id=c.campaign_id LEFT JOIN public.reward r ON r.id=c.reward_id
        WHERE c.user_id=$1 AND c.id=$2`, [userId, id]) as (ItemRow & Pick<ContributionDetail, 'reward'>)[]
      const row = rows[0]
      if (!row) return null
      const refunds = await manager.query(`SELECT r.id,r.payment_id AS "paymentId",r.amount::text,r.currency_code AS currency,r.status,
        r.requested_at AS "requestedAt",r.completed_at AS "completedAt" FROM public.refund r
        JOIN public.contribution c ON c.id=r.contribution_id WHERE c.user_id=$1 AND c.id=$2 ORDER BY r.requested_at DESC,r.id`, [userId, id]) as (Omit<ContributionDetail['refunds'][number], 'requestedAt' | 'completedAt'> & { requestedAt: Date; completedAt: Date | null })[]
      const disputes = await manager.query(`SELECT d.id,d.dispute_number AS reference,d.status,d.opened_at AS "createdAt" FROM public.dispute d
        JOIN public.contribution c ON c.id=d.contribution_id WHERE c.user_id=$1 AND c.id=$2 ORDER BY d.opened_at DESC,d.id`, [userId, id]) as (Omit<ContributionDetail['disputes'][number], 'createdAt'> & { createdAt: Date })[]
      // support_case no tiene contribution_id en el SQL oficial. Solo se muestran casos del titular para la campaña, sin asumir vínculo financiero.
      const supportCases = await manager.query(`SELECT s.id,s.case_number AS reference,s.subject,s.status,s.created_at AS "createdAt" FROM public.support_case s
        JOIN public.contribution c ON c.campaign_id=s.campaign_id WHERE s.user_id=$1 AND c.user_id=$1 AND c.id=$2 ORDER BY s.created_at DESC,s.id`, [userId, id]) as (Omit<ContributionDetail['supportCases'][number], 'createdAt'> & { createdAt: Date })[]
      return { ...itemFrom(row), reward: row.reward, refunds: refunds.map(refund => ({ ...refund, requestedAt: refund.requestedAt.toISOString(), completedAt: refund.completedAt?.toISOString() ?? null })),
        disputes: disputes.map(dispute => ({ ...dispute, createdAt: dispute.createdAt.toISOString() })), supportCases: supportCases.map(support => ({ ...support, createdAt: support.createdAt.toISOString() })) }
    })
  }
  async summary(userId: string): Promise<SponsorSummary> {
    return this.database.connection().transaction('REPEATABLE READ', manager => this.readSummary(manager, userId))
  }
  private async readSummary(manager: EntityManager, userId: string): Promise<SponsorSummary> {
    const counts = await manager.query(`SELECT count(*)::int AS "contributionCount",count(DISTINCT campaign_id)::int AS "campaignsSupported"
      FROM public.contribution WHERE user_id=$1`, [userId]) as Pick<SponsorSummary, 'contributionCount' | 'campaignsSupported'>[]
    const statusCounts = await manager.query('SELECT status,count(*)::int AS count FROM public.contribution WHERE user_id=$1 GROUP BY status ORDER BY status', [userId]) as SponsorSummary['statusCounts']
    const totals = await manager.query(`SELECT p.currency_code AS currency,sum(p.amount)::text AS "grossConfirmed",
      sum(COALESCE(r.amount,0))::numeric(18,2)::text AS refunded,
      COALESCE(sum(p.amount) FILTER(WHERE p.status='DISPUTED'),0)::numeric(18,2)::text AS disputed
      FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.payment_provider pp ON pp.id=p.provider_id
      LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM public.refund WHERE payment_id=p.id AND status='REFUNDED') r ON true
      WHERE c.user_id=$1 AND p.confirmed_at IS NOT NULL AND NOT pp.is_sandbox GROUP BY p.currency_code ORDER BY p.currency_code`, [userId]) as SponsorSummary['totals']
    const activity = await manager.query(`SELECT
      (SELECT count(*)::int FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.payment_provider pp ON pp.id=p.provider_id WHERE c.user_id=$1 AND pp.is_sandbox) AS "sandboxPaymentCount",
      (SELECT count(*)::int FROM public.campaign_bookmark WHERE user_id=$1 AND kind='FAVORITE') AS favorites,
      (SELECT count(*)::int FROM public.campaign_bookmark WHERE user_id=$1 AND kind='FOLLOW') AS following,
      (SELECT count(*)::int FROM public.support_case WHERE user_id=$1 AND status NOT IN ('RESOLVED','CLOSED')) AS "openSupportCases",
      (SELECT count(*)::int FROM public.dispute d JOIN public.contribution c ON c.id=d.contribution_id WHERE c.user_id=$1 AND d.status NOT IN ('RESOLVED','CLOSED')) AS "openDisputes",
      (SELECT count(*)::int FROM public.refund r JOIN public.contribution c ON c.id=r.contribution_id WHERE c.user_id=$1 AND r.status IN ('REQUESTED','PROCESSING')) AS "pendingRefunds"`, [userId]) as Pick<SponsorSummary, 'sandboxPaymentCount' | 'favorites' | 'following' | 'openSupportCases' | 'openDisputes' | 'pendingRefunds'>[]
    const demoTotals=await manager.query(`SELECT p.currency_code AS currency,sum(p.amount)::numeric(18,2)::text AS "grossConfirmed",
      sum(COALESCE(r.amount,0))::numeric(18,2)::text AS refunded,
      COALESCE(sum(p.amount) FILTER(WHERE p.status='DISPUTED'),0)::numeric(18,2)::text AS disputed
      FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.payment_provider pp ON pp.id=p.provider_id
      LEFT JOIN LATERAL(SELECT sum(amount) AS amount FROM public.refund WHERE payment_id=p.id AND status='REFUNDED')r ON true
      WHERE c.user_id=$1 AND p.confirmed_at IS NOT NULL AND pp.code='BROTAR_INTERNAL_DEMO' AND pp.is_sandbox
      GROUP BY p.currency_code ORDER BY p.currency_code`,[userId]) as SponsorSummary['totals']
    return { ...counts[0]!, statusCounts, totals, demoTotals, ...activity[0]! }
  }
}
