import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
import { SupportCampaignClosed, SupportForbidden, SupportMissing, type SupportAdminDetail, type SupportAdminPage, type SupportContext, type SupportDetail, type SupportPage, type SupportReceipt, type SupportRepository, type SupportSummary } from '../application/support-cases'
import { transactionAccess } from '../../roles/infrastructure/transaction-access'
import { recordAudit, setAuditActor } from '../../shared/infrastructure/database/audit'
import type { SupportStatus } from '../domain/support-case'
import { SupportConflict, supportFingerprint, type SupportInput } from '../domain/support-case'

type SummaryRow = Omit<SupportSummary, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }
const projection = `s.id,s.case_number AS reference,s.category,s.subject,s.status,s.created_at AS "createdAt",s.updated_at AS "updatedAt",s.campaign_id AS "campaignId",x.contribution_id AS "contributionId"`
const summary = (row: SummaryRow): SupportSummary => ({ ...row, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString() })
const managed = `((c.organization_id IS NULL AND c.creator_user_id=$1) OR EXISTS(SELECT 1 FROM public.organization_member m JOIN public.organization o ON o.id=m.organization_id
  WHERE m.organization_id=c.organization_id AND m.user_id=$1 AND m.organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN')
  AND m.joined_at<=now() AND (m.left_at IS NULL OR m.left_at>now()) AND o.deleted_at IS NULL))`
const availableSupport = `u.deleted_at IS NULL AND u.status IN ('ACTIVE','PENDING_VERIFICATION')
 AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
 AND EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='SUPPORT'
  AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()))
 AND NOT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='AUDITOR'
  AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()))`
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
        a.id AS "contributionId",a.reference_code AS "contributionReference",false AS "publicReport" FROM public.contribution a JOIN public.campaign c ON c.id=a.campaign_id
        WHERE a.user_id=$1 AND a.id=$2 AND ($3::uuid IS NULL OR c.id=$3)`, [userId, contributionId, campaignId])
      return rows[0] ?? null
    }
    const rows: SupportContext[] = await manager.query(`SELECT c.id AS "campaignId",c.title AS "campaignTitle",NULL AS "contributionId",NULL AS "contributionReference",
        NOT (${managed}) AS "publicReport"
      FROM public.campaign c WHERE c.id=$2 AND c.deleted_at IS NULL AND (${managed} OR c.status='PUBLISHED')`, [userId, campaignId])
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
      if (context.publicReport && !['INCORRECT_INFORMATION','PROJECT_NOT_EXECUTED'].includes(input.category)) throw new SupportMissing()
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
      const currentContext = await this.authorizedContext(manager, userId, input.campaignId, input.contributionId)
      if (!currentContext || currentContext.publicReport !== context.publicReport || (currentContext.publicReport && !['INCORRECT_INFORMATION','PROJECT_NOT_EXECUTED'].includes(input.category))) throw new SupportMissing()
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

  async adminList(page: number): Promise<SupportAdminPage> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const where = `NOT EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id)`
      const rows: (SummaryRow & { assignedTo: string | null })[] = await manager.query(`SELECT ${projection},s.assigned_to AS "assignedTo" FROM public.support_case s
        LEFT JOIN brotar_extension.support_case_context x ON x.case_id=s.id WHERE ${where} AND s.user_id IS NOT NULL
        ORDER BY CASE WHEN s.status NOT IN ('RESOLVED','CLOSED') THEN 0 ELSE 1 END,s.created_at,s.id LIMIT 20 OFFSET $1`, [(page - 1) * 20])
      const total: { total: number }[] = await manager.query(`SELECT count(*)::int AS total FROM public.support_case s WHERE ${where} AND s.user_id IS NOT NULL`)
      const assignees = await manager.query(`SELECT u.id,COALESCE(NULLIF(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Agente de soporte') AS label
        FROM public.app_user u LEFT JOIN public.user_profile p ON p.user_id=u.id WHERE ${availableSupport} ORDER BY label,u.id`)
      return { items: rows.map(row => ({ ...summary(row), assignedTo: row.assignedTo })), total: total[0]!.total, page, pageSize: 20, assignees }
    })
  }
  async adminDetail(id: string): Promise<SupportAdminDetail | null> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const rows: (SummaryRow & { description: string })[] = await manager.query(`SELECT ${projection},s.description FROM public.support_case s
        LEFT JOIN brotar_extension.support_case_context x ON x.case_id=s.id WHERE s.id=$1
        AND NOT EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id)`, [id])
      const row = rows[0]
      if (!row) return null
      const messages: (Omit<SupportAdminDetail['messages'][number], 'createdAt'> & { createdAt: Date })[] = await manager.query(`SELECT id,body,created_at AS "createdAt"
        FROM public.support_case_message WHERE support_case_id=$1 AND NOT is_internal ORDER BY created_at,id`, [id])
      const events: (Omit<SupportAdminDetail['events'][number], 'recordedAt'> & { recordedAt: Date })[] = await manager.query(`SELECT previous_status AS "previousStatus",status,reason,recorded_at AS "recordedAt"
        FROM brotar_extension.support_case_event WHERE case_id=$1 ORDER BY recorded_at,id`, [id])
      const evidence = await manager.query(`SELECT f.id AS "fileId",f.file_name AS name,f.mime_type AS "mimeType"
        FROM brotar_extension.support_case_evidence e JOIN public.file_asset f ON f.id=e.file_id
        WHERE e.case_id=$1 AND f.uploaded_by=(SELECT user_id FROM public.support_case WHERE id=$1)
          AND f.scope='PRIVATE' AND f.storage_key LIKE 'SUPPORT_EVIDENCE/%' AND f.deleted_at IS NULL ORDER BY e.display_order,e.file_id`, [id]) as SupportAdminDetail['evidence']
      return { ...summary(row), description: row.description, messages: messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString() })), events: events.map(event => ({ ...event, recordedAt: event.recordedAt.toISOString() })), evidence }
    })
  }
  async adminMessage(actor: string, id: string, body: string): Promise<void> {
    await this.database.connection().transaction(async manager => {
      await transactionAccess(manager, actor, 'support.resolve')
      const rows = await manager.query(`SELECT s.id,s.status FROM public.support_case s WHERE s.id=$1 AND s.status NOT IN ('RESOLVED','CLOSED')
        AND NOT EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id) FOR UPDATE`, [id]) as { id: string; status: SupportStatus }[]
      const row = rows[0]
      if (!row) throw new SupportMissing()
      await manager.query('INSERT INTO public.support_case_message(support_case_id,author_user_id,body,is_internal) VALUES($1,$2,$3,false)', [id, actor, body])
      if (row.status === 'OPEN' || row.status === 'AWAITING_RESPONSE') {
        await manager.query(`UPDATE public.support_case SET status='IN_PROGRESS',updated_at=clock_timestamp() WHERE id=$1`, [id])
        await manager.query(`INSERT INTO brotar_extension.support_case_event(case_id,actor_user_id,previous_status,status,reason)
          VALUES($1,$2,$3::support_case_status,'IN_PROGRESS','Se envió una respuesta compartida al titular.')`, [id,actor,row.status])
      }
      await setAuditActor(manager, actor)
      await recordAudit(manager, actor, 'UPDATE', 'support_case', id)
      await transactionAccess(manager, actor, 'support.resolve')
    })
  }
  async adminTransition(actor: string, id: string, status: SupportStatus, reason: string): Promise<void> {
    await this.database.connection().transaction(async manager => {
      await transactionAccess(manager, actor, 'support.resolve')
      const rows = await manager.query(`SELECT s.status FROM public.support_case s WHERE s.id=$1 AND NOT EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id) FOR UPDATE`, [id]) as { status: SupportStatus }[]
      const current = rows[0]?.status
      const allowed: Record<SupportStatus, SupportStatus[]> = {
        OPEN: ['IN_PROGRESS'], IN_PROGRESS: ['AWAITING_RESPONSE','RESOLVED'], AWAITING_RESPONSE: ['IN_PROGRESS','RESOLVED'], RESOLVED: ['CLOSED'], CLOSED: []
      }
      if (!current) throw new SupportMissing()
      if (!allowed[current].includes(status)) throw new SupportConflict()
      await manager.query(`UPDATE public.support_case SET status=$2::support_case_status,updated_at=clock_timestamp(),
        resolved_at=CASE WHEN $2='RESOLVED' THEN clock_timestamp() ELSE resolved_at END,
        closed_at=CASE WHEN $2='CLOSED' THEN clock_timestamp() ELSE closed_at END WHERE id=$1`, [id,status])
      await manager.query(`INSERT INTO brotar_extension.support_case_event(case_id,actor_user_id,previous_status,status,reason)
        VALUES($1,$2,$3::support_case_status,$4::support_case_status,$5)`, [id,actor,current,status,reason])
      await setAuditActor(manager, actor)
      await recordAudit(manager, actor, 'STATUS_CHANGE', 'support_case', id)
      await transactionAccess(manager, actor, 'support.resolve')
    })
  }
  async adminAssign(actor: string, id: string, assignee: string | null): Promise<void> {
    await this.database.connection().transaction(async manager => {
      await transactionAccess(manager, actor, 'support.resolve')
      const cases = await manager.query(`SELECT s.assigned_to AS "assignedTo" FROM public.support_case s WHERE s.id=$1
        AND s.status NOT IN ('RESOLVED','CLOSED') AND NOT EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id) FOR UPDATE`, [id]) as { assignedTo: string | null }[]
      const target = cases[0]
      if (!target) throw new SupportMissing()
      if (assignee && !(await manager.query(`SELECT u.id FROM public.app_user u WHERE u.id=$1 AND ${availableSupport} FOR SHARE OF u`, [assignee])).length) throw new SupportMissing()
      await manager.query('UPDATE public.support_case SET assigned_to=$2,updated_at=clock_timestamp() WHERE id=$1', [id,assignee])
      await setAuditActor(manager, actor)
      await recordAudit(manager, actor, 'UPDATE', 'support_case', id)
      await transactionAccess(manager, actor, 'support.resolve')
    })
  }
  async adminEvidenceOwner(actor: string, id: string, fileId: string): Promise<string> {
    return this.database.connection().transaction(async manager => {
      await transactionAccess(manager, actor, 'support.read')
      const rows: { uploadedBy: string }[] = await manager.query(`SELECT f.uploaded_by AS "uploadedBy" FROM public.support_case s
        JOIN brotar_extension.support_case_evidence e ON e.case_id=s.id JOIN public.file_asset f ON f.id=e.file_id
        WHERE s.id=$1 AND f.id=$2 AND f.uploaded_by=s.user_id AND f.scope='PRIVATE' AND f.storage_key LIKE 'SUPPORT_EVIDENCE/%' AND f.deleted_at IS NULL
          AND NOT EXISTS(SELECT 1 FROM public.dispute d WHERE d.support_case_id=s.id)`, [id,fileId])
      if (!rows[0]) throw new SupportMissing()
      return rows[0].uploadedBy
    })
  }
}
