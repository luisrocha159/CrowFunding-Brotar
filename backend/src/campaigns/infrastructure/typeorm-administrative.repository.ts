import { Injectable, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { AdministrativeDetail, AdministrativeRepository, ReviewRound } from '../application/administrative-review'
import { SubmissionIncomplete } from '../application/submission'
import { ReviewConflict, ReviewMissing, type DecisionInput, type ObservationInput } from '../domain/administrative-review'
import { missingForSubmission } from '../domain/submission'
import { TypeormGeneralRepository } from './typeorm-general.repository'
import { TypeormSectionsRepository } from './typeorm-sections.repository'
import { TypeormSubmissionRepository } from './typeorm-submission.repository'
import { TypeormProjectRepository } from './typeorm-project.repository'
import type { DuplicateReviewInput } from '../domain/duplication'
import { identityForCampaign } from './initiative-identity'
import { recordAudit } from '../../shared/infrastructure/database/audit'
import {identityReady,independentActor} from '../../campaign-lifecycle/infrastructure/eligibility'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {isDemoEnabled} from '../../demo-payments/domain/demo'
import {ReviewInvalid} from '../domain/administrative-review'

@Injectable()
export class TypeormAdministrativeRepository implements AdministrativeRepository {
  constructor(private readonly database: DatabaseService, private readonly projects: TypeormProjectRepository,
    private readonly general: TypeormGeneralRepository, private readonly sections: TypeormSectionsRepository,
    private readonly submission: TypeormSubmissionRepository) {}

  detail(id: string): Promise<AdministrativeDetail | null> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const project = await this.projects.findAdministrative(id, manager)
      if (!project) return null
      const [metadata] = await manager.query(`SELECT c.campaign_type AS "campaignType",c.slug,o.legal_name AS "organizationName",
        f.id AS "fileId",COALESCE(a.caption,'') AS "altText" FROM public.campaign c
        LEFT JOIN public.organization o ON o.id=c.organization_id
        LEFT JOIN public.file_asset f ON f.id=c.cover_file_id AND f.scope='PUBLIC' AND f.deleted_at IS NULL
          AND f.storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%'
        LEFT JOIN public.file_attachment a ON a.campaign_id=c.id AND a.file_id=f.id AND a.attachment_role='COVER'
        WHERE c.id=$1`, [id]) as { campaignType: string; slug: string; organizationName: string | null; fileId: string | null; altText: string }[]
      // Un único cliente transaccional: consultas secuenciales, sin superponer query() de pg.
      const general = await this.general.readGeneral(id, manager)
      const story = await this.general.readStory(id, manager)
      const plan = await this.sections.readPlan(id, manager)
      const budget = await this.sections.readBudget(id, manager)
      const funding = await this.sections.readFunding(id, manager)
      const rewards = await this.sections.readRewards(id, manager)
      const snapshot = await this.submission.snapshot(id, manager)
      const rounds: ReviewRound[] = await manager.query(`SELECT r.id,r.round,r.decision,r.summary,r.decided_at AS "decidedAt",
        nullif(concat_ws(' ',p.first_name,p.last_name),'') AS "reviewerName"
        FROM public.campaign_review r LEFT JOIN public.user_profile p ON p.user_id=r.reviewer_user_id
        WHERE r.campaign_id=$1 ORDER BY r.round`, [id])
      for (const round of rounds) round.observations = await manager.query(`SELECT section,field_path AS "fieldPath",message
        FROM public.campaign_review_observation WHERE review_id=$1 ORDER BY created_at,id`, [round.id]) as ObservationInput[]
      return { project, campaignType: metadata!.campaignType, slug: metadata!.slug, organizationName: metadata!.organizationName,
        cover: metadata!.fileId ? { fileId: metadata!.fileId, altText: metadata!.altText } : null,
        general, story, plan, budget, funding, rewards: metadata!.campaignType === 'DONATION' ? [] : rewards,
        rounds, missing: missingForSubmission(snapshot), publicationEnabled: false, duplication: snapshot.duplication, initiative: await identityForCampaign(manager, id) }
    })
  }

  private async lock(manager: EntityManager, id: string, status: string, round: number, decision: string) {
    const campaigns: { status: string }[] = await manager.query('SELECT status FROM public.campaign WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [id])
    if (!campaigns[0]) throw new ReviewMissing()
    if (campaigns[0].status !== status) throw new ReviewConflict()
    const rounds: { id: string; round: number; decision: string }[] = await manager.query(`SELECT id,round,decision
      FROM public.campaign_review WHERE campaign_id=$1 ORDER BY round DESC LIMIT 1 FOR UPDATE`, [id])
    if (rounds[0]?.round !== round || rounds[0]?.decision !== decision) throw new ReviewConflict()
    return rounds[0]
  }
  private async complete(manager: EntityManager, id: string, actorId: string, round: number, operation: string, reviewed?: DuplicateReviewInput) {
    const snapshot = await this.submission.snapshot(id, manager)
    const missing = missingForSubmission(snapshot)
    if (missing.length) throw new SubmissionIncomplete(missing)
    const report = snapshot.duplication
    if (!report?.matches.length) return
    await manager.query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,entity_id,description,new_values)
      VALUES($1,(SELECT r.code FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id
        WHERE ur.user_id=$1 AND r.code IN ('ADMIN','REVIEWER') AND ur.revoked_at IS NULL AND ur.granted_at<=now()
        AND (ur.expires_at IS NULL OR ur.expires_at>now()) ORDER BY r.code LIMIT 1),
        'UPDATE','campaign',$2,'Revisión de coincidencias de campaña', $3::jsonb)`,
    [actorId, id, JSON.stringify({ operation, round, ruleVersion: 3, advisoryOnly: true, token: report.reviewToken,
      reason: reviewed?.token === report.reviewToken ? reviewed.reason : null,
      candidates: report.matches.map(match => ({ id: match.id, kind: match.kind, reasons: match.reasons })) })])
  }
  private async actor(manager: EntityManager, actorId: string) { await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', actorId]) }
  private async reason(manager: EntityManager, id: string, actorId: string, from: string, to: string, reason: string, round: number) {
    // Enriquecer la fila del trigger oficial, sin crear un segundo movimiento ficticio.
    await manager.query(`UPDATE public.status_history SET reason=$5,metadata=jsonb_build_object('reviewRound',$6::int)
      WHERE entity_type='CAMPAIGN' AND entity_id=$1 AND changed_by=$2 AND from_status=$3 AND to_status=$4 AND changed_at=now()`, [id, actorId, from, to, reason, round])
  }
  decide(actorId: string, id: string, input: DecisionInput) {
    return this.database.connection().transaction(async manager => {
      const round = await this.lock(manager, id, 'IN_REVIEW', input.expectedRound, 'PENDING')
      if (input.decision === 'APPROVED') await this.complete(manager, id, actorId, input.expectedRound, 'APPROVE', input.duplicateReview)
      await this.actor(manager, actorId)
      await manager.query(`UPDATE public.campaign_review SET reviewer_user_id=$2,decision=$3::review_decision,
        summary=$4,started_at=COALESCE(started_at,now()),decided_at=now() WHERE id=$1`, [round!.id, actorId, input.decision, input.comment || null])
      for (const item of input.observations) await manager.query(`INSERT INTO public.campaign_review_observation(review_id,section,field_path,message,created_by)
        VALUES($1,$2,$3,$4,$5)`, [round!.id, item.section, item.fieldPath, item.message, actorId])
      await manager.query(`UPDATE public.campaign SET status=$2::campaign_status,
        approved_at=CASE WHEN $2='APPROVED' THEN now() ELSE approved_at END,updated_at=now() WHERE id=$1`, [id, input.decision])
      await this.reason(manager, id, actorId, 'IN_REVIEW', input.decision, input.comment || 'Campaña aprobada por administración', input.expectedRound)
      await recordAudit(manager,actorId,input.decision==='APPROVED'?'APPROVE':input.decision==='REJECTED'?'REJECT':'STATUS_CHANGE','campaign',id)
      return { id, status: input.decision, round: input.expectedRound }
    })
  }
  publish(actorId: string, id: string, expectedRound: number, duplicateReview?: DuplicateReviewInput) {
    return this.database.connection().transaction(async manager => {
      await this.lock(manager, id, 'APPROVED', expectedRound, 'APPROVED')
      await this.complete(manager, id, actorId, expectedRound, 'PUBLISH', duplicateReview)
      // Los controles DEMO son adicionales al contrato S2; nunca habilitan publicación real.
      if(!isDemoEnabled(process.env))throw new ReviewInvalid('Publicación requiere el entorno DEMO explícito. Producción, correo y legal siguen pendientes.')
      {
        await transactionAccess(manager,actorId,'campaign.publish')
        const [c]=await manager.query('SELECT id,creator_user_id,organization_id,currency_code,status FROM public.campaign WHERE id=$1',[id])
        await independentActor(manager,actorId,c)
        try{await identityReady(manager,c)}catch(error){if(error instanceof ConflictException)throw error;if(error instanceof Error)throw new ReviewInvalid(error.message);throw error}
        await transactionAccess(manager,actorId,'campaign.publish')
      }
      await this.actor(manager, actorId)
      await manager.query("UPDATE public.campaign SET status='PUBLISHED',published_at=now(),updated_at=now() WHERE id=$1", [id])
      await this.reason(manager, id, actorId, 'APPROVED', 'PUBLISHED', 'Publicación administrativa explícita', expectedRound)
      await recordAudit(manager,actorId,'STATUS_CHANGE','campaign',id)
      return { id, status: 'PUBLISHED', round: expectedRound }
    })
  }
}
