import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
import { SupportCampaignClosed, SupportForbidden, SupportMissing, type SupportContext, type SupportDetail, type SupportPage, type SupportReceipt, type SupportRepository, type SupportSummary } from '../application/support-cases'
import { SupportConflict, supportFingerprint, type SupportInput } from '../domain/support-case'

type SummaryRow = Omit<SupportSummary, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }
const projection = `s.id,s.case_number AS reference,s.category,s.subject,s.status,s.created_at AS "createdAt",s.updated_at AS "updatedAt",s.campaign_id AS "campaignId",x.contribution_id AS "contributionId"`
const summary = (row: SummaryRow): SupportSummary => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })
const managed = `((c.organization_id IS NULL AND c.creator_user_id=$1) OR EXISTS(SELECT 1 FROM public.organization_member m JOIN public.organization o ON o.id=m.organization_id
  WHERE m.organization_id=c.organization_id AND m.user_id=$1 AND m.organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN')
  AND m.joined_at<=now() AND (m.left_at IS NULL OR m.left_at>now()) AND o.deleted_at IS NULL))`
@Injectable()
export class SupportCaseRepository implements SupportRepository {
  constructor(private readonly database: DatabaseService) {}
  async list(userId: string, page: number): Promise<SupportPage> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const rows: SummaryRow[] = await manager.query(`SELECT ${projection} FROM public.support_case s
        LEFT JOIN brotar_extension.support_case_context x ON x.case_id=s.id
        WHERE s.user_id=$1 ORDER BY s.created_at DESC,s.id DESC LIMIT 20 OFFSET $2`, [userId, (page - 1) * 20])
      const total: { total: number }[] = await manager.query('SELECT count(*)::int AS total FROM public.support_case WHERE user_id=$1', [userId])
      return { items: rows.map(summary), total: total[0]!.total, page, pageSize: 20 }
    })
  }
  async detail(userId: string, id: string): Promise<SupportDetail | null> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const rows: (SummaryRow & { description: string })[] = await manager.query(`SELECT ${projection},s.description FROM public.support_case s
        LEFT JOIN brotar_extension.support_case_context x ON x.case_id=s.id WHERE s.user_id=$1 AND s.id=$2`, [userId, id])
      const row = rows[0]
      if (!row) return null
      const evidence: SupportDetail['evidence'] = await manager.query(`SELECT f.id AS "fileId",f.file_name AS name,f.mime_type AS "mimeType"
        FROM brotar_extension.support_case_evidence e JOIN public.file_asset f ON f.id=e.file_id JOIN public.support_case s ON s.id=e.case_id
        WHERE s.id=$2 AND s.user_id=$1 AND f.uploaded_by=$1 AND f.scope='PRIVATE' AND f.deleted_at IS NULL AND f.storage_key LIKE 'SUPPORT_EVIDENCE/%'
        ORDER BY e.display_order,e.file_id`, [userId, id])
      const messages: (Omit<SupportDetail['messages'][number], 'createdAt'> & { createdAt: Date })[] = await manager.query(`SELECT m.id,m.body,m.created_at AS "createdAt",
        CASE WHEN m.author_user_id=$1 THEN 'you' ELSE 'support' END AS "from" FROM public.support_case_message m
        JOIN public.support_case s ON s.id=m.support_case_id WHERE s.user_id=$1 AND s.id=$2 AND m.is_internal=false ORDER BY m.created_at,m.id`, [userId, id])
      return { ...summary(row), description: row.description, evidence, messages: messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString() })) }
    })
  }
  context(userId: string, campaignId: string | null, contributionId: string | null): Promise<SupportContext | null> {
    return this.database.connection().transaction('REPEATABLE READ', manager => this.authorizedContext(manager, userId, campaignId, contributionId))
  }
  private async authorizedContext(manager: EntityManager, userId: string, campaignId: string | null, contributionId: string | null): Promise<SupportContext | null> {
    if (contributionId) {
      const rows: SupportContext[] = await manager.query(`SELECT c.id AS "campaignId",
        CASE WHEN c.deleted_at IS NULL AND (${managed} OR c.status='PUBLISHED' OR (c.published_at IS NOT NULL AND c.status IN ('FUNDING_ENDED','IN_EXECUTION','CLOSED','CANCELLED'))) THEN c.title ELSE 'Campaña no disponible' END AS "campaignTitle",
        a.id AS "contributionId",a.reference_code AS "contributionReference" FROM public.contribution a JOIN public.campaign c ON c.id=a.campaign_id
        WHERE a.user_id=$1 AND a.id=$2 AND ($3::uuid IS NULL OR c.id=$3)`, [userId, contributionId, campaignId])
      return rows[0] ?? null
    }
    const rows: SupportContext[] = await manager.query(`SELECT c.id AS "campaignId",c.title AS "campaignTitle",NULL AS "contributionId",NULL AS "contributionReference"
      FROM public.campaign c WHERE c.id=$2 AND c.deleted_at IS NULL AND ${managed}`, [userId, campaignId])
    return rows[0] ?? null
  }
  private async assertWriter(manager: EntityManager, userId: string): Promise<void> {
    const roles: { code: string }[] = await manager.query(`SELECT r.code FROM public.app_user u JOIN public.user_role ur ON ur.user_id=u.id JOIN public.role r ON r.id=ur.role_id
      WHERE u.id=$1 AND u.status::text=ANY($2::text[]) AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
      AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()) FOR SHARE OF u`, [userId, BASIC_ACCESS_STATUSES])
    if (!roles.some(role => role.code === 'REGISTERED_USER') || roles.some(role => role.code === 'AUDITOR')) throw new SupportForbidden()
  }
  async create(userId: string, input: SupportInput): Promise<SupportReceipt> {
    return this.database.connection().transaction(async manager => {
      // Mismo actor+clave se serializa sin bloquear reportes de otras cuentas.
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`support:${userId}:${input.requestId}`])
      await this.assertWriter(manager, userId)
      const fingerprint = supportFingerprint(input)
      const existing: (Omit<SupportReceipt, 'createdAt'> & { createdAt: Date; requestHash: string })[] = await manager.query(`SELECT s.id,s.case_number AS reference,s.status,s.created_at AS "createdAt",x.request_hash AS "requestHash"
        FROM brotar_extension.support_case_context x JOIN public.support_case s ON s.id=x.case_id WHERE x.user_id=$1 AND x.request_id=$2 AND s.user_id=$1`, [userId, input.requestId])
      if (existing[0]) {
        if (existing[0].requestHash !== fingerprint) throw new SupportConflict()
        const { requestHash: ignored, createdAt, ...receipt } = existing[0]
        void ignored
        return { ...receipt, createdAt: createdAt.toISOString() }
      }
      const context = await this.authorizedContext(manager, userId, input.campaignId, input.contributionId)
      if (!context) throw new SupportMissing()
      // Serialize with campaign closure; do not introduce an unresolved obligation after terminal close.
      const [campaign]=await manager.query('SELECT id,status FROM public.campaign WHERE id=$1 FOR UPDATE',[context.campaignId])
      if(!campaign)throw new SupportMissing()
      if(campaign.status==='CLOSED')throw new SupportCampaignClosed()
      if (input.evidenceFileIds.length) {
        const files: { id: string }[] = await manager.query(`SELECT id FROM public.file_asset WHERE id=ANY($1::uuid[]) AND uploaded_by=$2 AND scope='PRIVATE'
          AND storage_key LIKE 'SUPPORT_EVIDENCE/%' AND deleted_at IS NULL ORDER BY id FOR UPDATE`, [input.evidenceFileIds, userId])
        if (files.length !== input.evidenceFileIds.length) throw new SupportMissing()
      }
      await this.assertWriter(manager, userId)
      if (!await this.authorizedContext(manager, userId, input.campaignId, input.contributionId)) throw new SupportMissing()
      await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', userId])
      const rows: (Omit<SupportReceipt, 'createdAt'> & { createdAt: Date })[] = await manager.query(`INSERT INTO public.support_case(user_id,campaign_id,subject,description,category)
        VALUES($1,$2,$3,$4,$5) RETURNING id,case_number AS reference,status,created_at AS "createdAt"`, [userId, context.campaignId, input.subject, input.description, input.category])
      const created = rows[0]!
      await manager.query(`INSERT INTO brotar_extension.support_case_context(case_id,user_id,contribution_id,request_id,request_hash)
        VALUES($1,$2,$3,$4,$5)`, [created.id, userId, context.contributionId, input.requestId, fingerprint])
      for (const [index, fileId] of input.evidenceFileIds.entries()) await manager.query(`INSERT INTO brotar_extension.support_case_evidence(case_id,file_id,display_order) VALUES($1,$2,$3)`, [created.id, fileId, index])
      await manager.query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,entity_id,new_values)
        VALUES($1,'REGISTERED_USER','CREATE','support_case',$2,$3::jsonb)`, [userId, created.id, JSON.stringify({ source:'APPLICATION',result:'APPLIED',status: created.status, category: input.category, campaignId: context.campaignId, contributionId: context.contributionId, evidenceCount: input.evidenceFileIds.length })])
      return { ...created, createdAt: created.createdAt.toISOString() }
    })
  }
}
