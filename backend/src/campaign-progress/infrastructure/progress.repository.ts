import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
import {ownerAccess} from '../../campaign-lifecycle/infrastructure/eligibility'
import {recordAudit} from '../../shared/infrastructure/database/audit'
import { validatePublicationChange, validateRewardChange, type PublicationChange, type ProgressInput, type RewardChange, type UpdateInput } from '../domain/progress'
import { rewardOwed } from '../../campaign-lifecycle/infrastructure/closure-integrity'
import { assertDemoEnabled, lockDemo } from '../../demo-payments/infrastructure/demo-payments'
import { fulfillCampaignReward, rewardHistorySnapshot } from './reward-tracking'
const currentOwner = `c.deleted_at IS NULL AND ((c.organization_id IS NULL AND c.creator_user_id=$2) OR EXISTS (
  SELECT 1 FROM public.organization_member om JOIN public.organization o ON o.id=om.organization_id WHERE om.organization_id=c.organization_id AND om.user_id=$2 AND (om.left_at IS NULL OR om.left_at>clock_timestamp()) AND om.joined_at<=clock_timestamp() AND o.deleted_at IS NULL AND o.status NOT IN ('SUSPENDED','CLOSED') AND om.organization_role IN ('OWNER','LEGAL_REPRESENTATIVE','ADMIN')))`
const editable = ['PUBLISHED', 'FUNDING_ENDED', 'IN_EXECUTION']
interface Campaign { id: string; title: string; status: string; currency: string | null }
interface ActualRow { id: string; name: string; responsibleName: string; status: string; progressPercent: number; plannedStartOn: string | null; plannedEndOn: string | null; actualStartOn: string | null; actualEndOn: string | null }
interface Indicator { id: string; name: string; unit: string | null; targetValue: string | null; achievedValue: string | null }
export interface ProgressState { revision: string; campaign: Campaign; editable: boolean; activities: ActualRow[]; milestones: ActualRow[]; indicators: Indicator[] }
interface UpdateRow { version: number; withdrawnAt: string | null; id: string; title: string; body: string; milestoneId: string | null; publishedAt: string | null; revision: string; images: { fileId: string; caption: string }[]; progress: unknown }
@Injectable()
export class ProgressRepository {
  constructor(private readonly database: DatabaseService) {}
  private async owner(manager: EntityManager, userId: string, id: string, lock = false): Promise<Campaign> {
    const rows = await manager.query(`SELECT c.id,c.title,c.status,c.currency_code AS currency FROM public.campaign c WHERE c.id=$1 AND ${currentOwner}${lock ? ' FOR UPDATE OF c' : ''}`, [id, userId]) as Campaign[]
    if (lock) {
      const [subject]=await manager.query('SELECT id,creator_user_id,organization_id,currency_code,status FROM public.campaign WHERE id=$1',[id])
      if(!subject)throw new NotFoundException('Proyecto no disponible.')
      await ownerAccess(manager,userId,subject)
      const actor = await manager.query(`SELECT r.code FROM public.app_user u JOIN public.user_role ur ON ur.user_id=u.id JOIN public.role r ON r.id=ur.role_id WHERE u.id=$1 AND u.status::text=ANY($2::text[]) AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until<=now()) AND ur.granted_at<=clock_timestamp() AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()) FOR SHARE OF u`, [userId, BASIC_ACCESS_STATUSES]) as {code:string}[]
      if (!actor.some(r => r.code==='CREATOR') || actor.some(r => r.code==='AUDITOR')) throw new ForbiddenException('Tu acceso cambió. Actualiza la sesión.')
      const access = await manager.query(`SELECT c.id FROM public.campaign c WHERE c.id=$1 AND ${currentOwner}`, [id,userId]) as unknown[]
      if (!access.length) throw new NotFoundException('La representación cambió. Actualiza la sesión.')
    }
    if (!rows[0]) throw new NotFoundException('Proyecto no disponible para esta cuenta.')
    return rows[0]
  }
  private async state(manager: EntityManager, campaign: Campaign): Promise<ProgressState> {
    const rows = async (table: 'campaign_activity' | 'milestone') => manager.query(`SELECT id,name,COALESCE(responsible_name,'') AS "responsibleName",status,progress_percent AS "progressPercent", planned_start_on::text AS "plannedStartOn",planned_end_on::text AS "plannedEndOn",actual_start_on::text AS "actualStartOn",actual_end_on::text AS "actualEndOn" FROM public.${table} WHERE campaign_id=$1 ORDER BY display_order,id`, [campaign.id]) as Promise<ActualRow[]>
    const activities = await rows('campaign_activity'); const milestones = await rows('milestone')
    const indicators = await manager.query(`SELECT id,name,unit,target_value::text AS "targetValue",achieved_value::text AS "achievedValue" FROM public.campaign_impact_indicator WHERE campaign_id=$1 ORDER BY display_order,id`, [campaign.id]) as Indicator[]
    const revisions = await manager.query('SELECT md5($1) AS revision', [JSON.stringify({ activities, milestones, indicators })]) as { revision: string }[]
    return { revision: revisions[0]!.revision, campaign, editable: editable.includes(campaign.status), activities, milestones, indicators }
  }
  private async writableActor(m: EntityManager,userId:string) {
    const [access]=await m.query(`SELECT NOT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code='AUDITOR' AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())) AS writable`,[userId])
    return access.writable as boolean
  }
  async read(userId: string, id: string) { return this.database.connection().transaction('REPEATABLE READ', async m => {
    const state=await this.state(m,await this.owner(m,userId,id));return {...state,editable:state.editable&&await this.writableActor(m,userId)}
  }) }
  async save(userId: string, id: string, input: ProgressInput) {
    return this.database.connection().transaction(async m => {
      const campaign = await this.owner(m, userId, id, true)
      if (!editable.includes(campaign.status)) throw new ConflictException('Este estado del proyecto no permite registrar avances.')
      const before = await this.state(m, campaign)
      if (before.revision !== input.revision) throw new ConflictException('Los avances cambiaron. Actualiza antes de guardar.')
      for (const key of ['activities', 'milestones', 'indicators'] as const) if (input[key].some(row => !before[key].some(known => known.id === row.id))) throw new BadRequestException('Un elemento no pertenece a este proyecto.')
      await m.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', userId])
      for (const key of ['activities', 'milestones'] as const) for (const row of input[key]) await m.query(`UPDATE public.${key === 'activities' ? 'campaign_activity' : 'milestone'} SET responsible_name=$3,status=$4,progress_percent=$5,actual_start_on=$6,actual_end_on=$7,updated_at=clock_timestamp() WHERE campaign_id=$1 AND id=$2`, [id, row.id, row.responsibleName.trim(), row.status, row.progressPercent, row.actualStartOn, row.actualEndOn])
      for (const row of input.indicators) await m.query('UPDATE public.campaign_impact_indicator SET achieved_value=$3 WHERE campaign_id=$1 AND id=$2', [id, row.id, row.achievedValue])
      const after = await this.state(m, campaign)
      await recordAudit(m,userId,'UPDATE','campaign_progress',id)
      return after
    })
  }
  private async updateRows(m: EntityManager, id: string, publicOnly: boolean, updateId: string | null = null, page = 1): Promise<UpdateRow[]> {
    return m.query(`SELECT u.id,u.title,u.body,u.milestone_id AS "milestoneId",u.published_at::text AS "publishedAt",CASE WHEN u.published_at IS NULL THEN u.updated_at::text ELSE u.updated_at::text||':'||COALESCE(v.version,1)::text END AS revision,COALESCE(v.version,1) AS version,v.withdrawn_at::text AS "withdrawnAt",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('fileId',a.file_id,'caption',a.caption) ORDER BY a.display_order,a.id) FROM public.file_attachment a JOIN public.file_asset f ON f.id=a.file_id WHERE a.campaign_update_id=u.id AND a.attachment_role='UPDATE_EVIDENCE' AND f.deleted_at IS NULL AND f.scope='PUBLIC' AND f.storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%'),'[]') AS images,
      s.data AS progress FROM public.campaign_update u LEFT JOIN brotar_extension.update_progress s ON s.update_id=u.id LEFT JOIN brotar_extension.update_version v ON v.update_id=u.id
      WHERE u.campaign_id=$1 AND ($2::uuid IS NULL OR u.id=$2) AND u.deleted_at IS NULL ${publicOnly ? "AND u.visibility='PUBLIC' AND u.published_at IS NOT NULL AND u.published_at<=now() AND v.withdrawn_at IS NULL" : ''} ORDER BY u.created_at DESC,u.id DESC LIMIT 20 OFFSET $3`, [id, updateId, (page - 1) * 20])
  }
  private async updatePage(m: EntityManager, id: string, publicOnly: boolean, page: number) {
    if (!Number.isSafeInteger(page) || page<1 || page>100000) throw new BadRequestException('Página inválida.')
    const count = await m.query(`SELECT count(*)::int AS total FROM public.campaign_update u LEFT JOIN brotar_extension.update_version v ON v.update_id=u.id WHERE campaign_id=$1 AND deleted_at IS NULL ${publicOnly ? "AND visibility='PUBLIC' AND published_at IS NOT NULL AND published_at<=now() AND v.withdrawn_at IS NULL" : ''}`, [id]) as {total:number}[]
    return {items:await this.updateRows(m,id,publicOnly,null,page),total:count[0]!.total,page,pageSize:20}
  }
  async updates(userId: string, id: string, page=1) { return this.database.connection().transaction('REPEATABLE READ', async m => { await this.owner(m, userId, id); return this.updatePage(m,id,false,page) }) }
  async update(userId: string, id: string, updateId: string) { return this.database.connection().transaction('REPEATABLE READ', async m => {
    await this.owner(m,userId,id)
    const row=(await this.updateRows(m,id,false,updateId))[0]
    if (!row) throw new NotFoundException('Novedad no encontrada.')
    return row
  }) }
  async publicUpdates(id: string, page=1) { return this.database.connection().transaction('REPEATABLE READ', async m => {
    const rows = await m.query(`SELECT id FROM public.campaign WHERE id=$1 AND deleted_at IS NULL AND published_at IS NOT NULL AND status IN ('PUBLISHED','FUNDING_ENDED','IN_EXECUTION','CLOSED','CANCELLED')`, [id]) as unknown[]
    if (!rows.length) throw new NotFoundException('Proyecto no disponible.')
    const result=await this.updatePage(m,id,true,page)
    return { ...result, items: result.items.map(row => ({ id: row.id, title: row.title, body: row.body, milestoneId: row.milestoneId, publishedAt: row.publishedAt, images: row.images, progress: row.progress })) }
  }) }
  async saveUpdate(userId: string, id: string, updateId: string, input: UpdateInput) { return this.database.connection().transaction(async m => {
    const campaign = await this.owner(m, userId, id, true)
    if (!editable.includes(campaign.status)) throw new ConflictException('Este estado del proyecto no permite novedades.')
    const currentRows = await m.query('SELECT id,campaign_id,author_user_id,updated_at::text AS revision,published_at FROM public.campaign_update WHERE id=$1 FOR UPDATE', [updateId]) as { id: string; campaign_id: string; author_user_id: string; revision: string; published_at: string | null }[]
    const current = currentRows[0]
    if (current && (current.campaign_id !== id || current.author_user_id !== userId || current.revision !== input.revision)) throw new ConflictException('La novedad cambió. Recarga antes de guardar.')
    if (current?.published_at) throw new ConflictException('La novedad ya está publicada y se conserva como evidencia histórica.')
    if (!current && input.revision !== null) throw new ConflictException('La novedad no corresponde a la versión actual.')
    if (input.milestoneId && !(await m.query('SELECT id FROM public.milestone WHERE id=$1 AND campaign_id=$2', [input.milestoneId, id]) as unknown[]).length) throw new BadRequestException('El hito no pertenece a este proyecto.')
    if (input.images.length) {
      const files = await m.query(`SELECT id FROM public.file_asset WHERE id=ANY($1::uuid[]) AND uploaded_by=$2 AND scope='PUBLIC' AND storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%' AND deleted_at IS NULL ORDER BY id FOR UPDATE`, [input.images.map(i => i.fileId), userId]) as unknown[]
      if (files.length !== input.images.length) throw new BadRequestException('Una evidencia no está disponible.')
    }
    // Los archivos pueden haber esperado a otra transacción; un rol puede vencer durante esa espera.
    await this.owner(m, userId, id, true)
    await m.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', userId])
    const values = [updateId, id, userId, input.title.trim(), input.body.trim(), input.milestoneId, input.publish ? 'PUBLIC' : 'PRIVATE', input.publish]
    if (current) await m.query(`UPDATE public.campaign_update SET title=$4,body=$5,milestone_id=$6,visibility=$7,published_at=CASE WHEN $8 THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp() WHERE id=$1 AND campaign_id=$2 AND author_user_id=$3 AND published_at IS NULL`, values)
    else {
      const inserted = await m.query(`INSERT INTO public.campaign_update(id,campaign_id,author_user_id,title,body,milestone_id,visibility,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $8 THEN clock_timestamp() ELSE NULL END) ON CONFLICT(id) DO NOTHING RETURNING id`, values) as unknown[]
      if (!inserted.length) throw new ConflictException('El identificador de la novedad ya está en uso. Recarga antes de guardar.')
    }
    await m.query(`UPDATE public.file_attachment SET attachment_role='UPDATE_EVIDENCE_ARCHIVED' WHERE campaign_update_id=$1 AND attachment_role='UPDATE_EVIDENCE'`, [updateId])
    for (const [index, row] of input.images.entries()) await m.query(`INSERT INTO public.file_attachment(file_id,campaign_update_id,attachment_role,caption,display_order) VALUES($1,$2,'UPDATE_EVIDENCE',$3,$4)`, [row.fileId, updateId, row.caption.trim(), index])
    if (input.publish) {
      await m.query('INSERT INTO brotar_extension.update_progress(update_id,data) VALUES($1,$2::jsonb)', [updateId, JSON.stringify(await this.state(m, campaign))])
      await m.query('INSERT INTO brotar_extension.update_version(update_id) VALUES($1)',[updateId])
      await this.archiveUpdate(m,userId,(await this.updateRows(m,id,false,updateId))[0]!, 'PUBLISHED','Publicación inicial.')
    }
    await recordAudit(m,userId,current?'UPDATE':'CREATE','campaign_update',updateId)
    return (await this.updateRows(m, id, false, updateId))[0]
  }) }
  private async archiveUpdate(m: EntityManager, actor: string, row: UpdateRow, action: string, reason: string) {
    await m.query(`INSERT INTO brotar_extension.update_history(update_id,version,action,actor_id,reason,snapshot) VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(update_id,version) DO NOTHING`,[row.id,row.version,action,actor,reason,JSON.stringify(row)])
  }
  async updateHistory(userId: string, id: string, updateId: string, page=1) { return this.database.connection().transaction('REPEATABLE READ',async m=>{
    await this.owner(m,userId,id)
    if(!Number.isSafeInteger(page)||page<1||page>100000)throw new BadRequestException('Página inválida.')
    const row=(await this.updateRows(m,id,false,updateId))[0]
    if(!row)throw new NotFoundException('Novedad no encontrada.')
    const [count]=await m.query('SELECT count(*)::int AS total FROM brotar_extension.update_history WHERE update_id=$1',[updateId])
    const items=await m.query('SELECT version,action,reason,actor_id AS "actorId",recorded_at::text AS "recordedAt",snapshot FROM brotar_extension.update_history WHERE update_id=$1 ORDER BY version DESC LIMIT 20 OFFSET $2',[updateId,(page-1)*20])
    return {items,total:count.total,page,pageSize:20}
  }) }
  async changePublication(userId: string, id: string, updateId: string, input: PublicationChange) {
    const errors=validatePublicationChange(input);if(Object.keys(errors).length)throw new BadRequestException({message:'Revisa el cambio de publicación.',errors})
    return this.database.connection().transaction(async m=>{
      const campaign=await this.owner(m,userId,id,true)
      if(!editable.includes(campaign.status))throw new ConflictException('Este estado del proyecto no permite corregir ni retirar novedades.')
      const [current]=await m.query('SELECT author_user_id FROM public.campaign_update WHERE id=$1 AND campaign_id=$2 AND deleted_at IS NULL FOR UPDATE',[updateId,id])
      if(!current)throw new NotFoundException('Novedad no encontrada.')
      if(current.author_user_id!==userId)throw new ForbiddenException('Solo el autor puede corregir o retirar su publicación.')
      const before=(await this.updateRows(m,id,false,updateId))[0]!
      if(!before.publishedAt||before.withdrawnAt||before.revision!==input.revision)throw new ConflictException('La publicación cambió o fue retirada. Actualiza antes de continuar.')
      if(input.action==='CORRECT') {
        if(input.milestoneId&&!(await m.query('SELECT id FROM public.milestone WHERE id=$1 AND campaign_id=$2',[input.milestoneId,id])).length)throw new BadRequestException('El hito no pertenece a este proyecto.')
        if(input.images.length){
          const files=await m.query(`SELECT id FROM public.file_asset WHERE id=ANY($1::uuid[]) AND uploaded_by=$2 AND scope='PUBLIC' AND storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%' AND deleted_at IS NULL ORDER BY id FOR UPDATE`,[input.images.map(i=>i.fileId),userId])
          if(files.length!==input.images.length)throw new BadRequestException('Una evidencia no está disponible.')
        }
      }
      await this.owner(m,userId,id,true)
      await m.query('SELECT set_config($1,$2,true)',['brotar.actor_id',userId])
      // Importaciones históricas se archivan antes de la primera corrección; su instantánea nunca se recalcula.
      await this.archiveUpdate(m,current.author_user_id,before,'PUBLISHED','Publicación inicial conservada.')
      await m.query(`INSERT INTO brotar_extension.update_version(update_id,version,withdrawn_at) VALUES($1,$2,CASE WHEN $3 THEN clock_timestamp() ELSE NULL END) ON CONFLICT(update_id) DO UPDATE SET version=EXCLUDED.version,withdrawn_at=EXCLUDED.withdrawn_at`,[updateId,before.version+1,input.action==='WITHDRAW'])
      if(input.action==='CORRECT'){
        await m.query('UPDATE public.campaign_update SET title=$2,body=$3,milestone_id=$4,updated_at=clock_timestamp() WHERE id=$1',[updateId,input.title.trim(),input.body.trim(),input.milestoneId])
        await m.query(`UPDATE public.file_attachment SET attachment_role='UPDATE_EVIDENCE_ARCHIVED' WHERE campaign_update_id=$1 AND attachment_role='UPDATE_EVIDENCE'`,[updateId])
        for(const [i,image]of input.images.entries())await m.query(`INSERT INTO public.file_attachment(file_id,campaign_update_id,attachment_role,caption,display_order) VALUES($1,$2,'UPDATE_EVIDENCE',$3,$4)`,[image.fileId,updateId,image.caption.trim(),i])
      }else await m.query('UPDATE public.campaign_update SET updated_at=clock_timestamp() WHERE id=$1',[updateId])
      const after=(await this.updateRows(m,id,false,updateId))[0]!
      await this.archiveUpdate(m,userId,after,input.action==='CORRECT'?'CORRECTED':'WITHDRAWN',input.reason.trim())
      await recordAudit(m,userId,'UPDATE','campaign_update',updateId)
      return after
    })
  }
  private async rewardRows(m: EntityManager,id: string,contributionId: string|null=null,page=1) {
    return m.query(`SELECT c.id,c.reference_code AS reference,r.title,r.description AS promise,r.estimated_delivery_on::text AS "promisedOn",
      COALESCE(f.status::text,'PENDING') AS status,f.notes,(f.fulfilled_at AT TIME ZONE 'America/La_Paz')::date::text AS "fulfilledOn",e.file_id AS "fileId",
      md5(jsonb_build_array(f.id,f.status,f.updated_at,e.file_id,e.recorded_at)::text) AS revision
      FROM public.contribution c JOIN public.reward r ON r.id=c.reward_id LEFT JOIN public.reward_fulfillment f ON f.contribution_id=c.id LEFT JOIN brotar_extension.campaign_reward_evidence e ON e.contribution_id=c.id
      WHERE c.campaign_id=$1 AND ($2::uuid IS NULL OR c.id=$2) AND ${rewardOwed} ORDER BY c.id LIMIT 20 OFFSET $3`,[id,contributionId,(page-1)*20])
  }
  async rewards(userId: string,id: string,page=1) {
    assertDemoEnabled()
    if(!Number.isSafeInteger(page)||page<1||page>100000)throw new BadRequestException('Página inválida.')
    return this.database.connection().transaction('REPEATABLE READ',async m=>{
      const campaign=await this.owner(m,userId,id)
      const [total]=await m.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE f.status='FULFILLED')::int AS fulfilled FROM public.contribution c LEFT JOIN public.reward_fulfillment f ON f.contribution_id=c.id WHERE c.campaign_id=$1 AND ${rewardOwed}`,[id])
      return {mode:'DEMO',campaign,editable:campaign.status==='IN_EXECUTION'&&await this.writableActor(m,userId),items:await this.rewardRows(m,id,null,page),total:total.total,fulfilled:total.fulfilled,page,pageSize:20}
    })
  }
  async rewardHistory(userId: string,id: string,contributionId: string,page=1) {
    assertDemoEnabled()
    if(!Number.isSafeInteger(page)||page<1||page>100000)throw new BadRequestException('Página inválida.')
    return this.database.connection().transaction('REPEATABLE READ',async m=>{
      await this.owner(m,userId,id)
      if(!(await m.query('SELECT id FROM public.contribution WHERE id=$1 AND campaign_id=$2 AND reward_id IS NOT NULL',[contributionId,id])).length)throw new NotFoundException('Recompensa no encontrada.')
      const [count]=await m.query('SELECT count(*)::int AS total FROM brotar_extension.reward_history WHERE contribution_id=$1',[contributionId])
      return {items:await m.query('SELECT id,actor_id AS "actorId",reason,snapshot,recorded_at::text AS "recordedAt" FROM brotar_extension.reward_history WHERE contribution_id=$1 ORDER BY recorded_at DESC,id DESC LIMIT 20 OFFSET $2',[contributionId,(page-1)*20]),total:count.total,page,pageSize:20}
    })
  }
  async changeReward(userId: string,id: string,contributionId: string,input: RewardChange) {
    assertDemoEnabled()
    const errors=validateRewardChange(input);if(Object.keys(errors).length)throw new BadRequestException({message:'Revisa la recompensa.',errors})
    await this.database.connection().transaction(async m=>{
      await lockDemo(m)
      const campaign=await this.owner(m,userId,id,true)
      if(campaign.status!=='IN_EXECUTION')throw new ConflictException('El seguimiento se registra durante la ejecución.')
      await m.query('SELECT id FROM public.contribution WHERE id=$1 AND campaign_id=$2 FOR UPDATE',[contributionId,id])
      const before=(await this.rewardRows(m,id,contributionId))[0]
      if(!before)throw new NotFoundException('No hay una recompensa exigible en este aporte.')
      if(before.revision!==input.revision)throw new ConflictException('El seguimiento cambió. Actualiza antes de guardar.')
      if(before.status==='FULFILLED'&&before.fileId)throw new ConflictException('El cumplimiento y su evidencia se conservan sin modificación.')
      if(before.status==='FULFILLED'&&input.status!=='FULFILLED')throw new ConflictException('No se revierte un cumplimiento registrado.')
      await m.query('SELECT set_config($1,$2,true)',['brotar.actor_id',userId])
      if(input.status==='FULFILLED')await fulfillCampaignReward(m,userId,id,contributionId,input.fulfilledOn!,input.fileId!,input.reason.trim())
      else{
        if(before.status===input.status)throw new ConflictException('Selecciona un estado distinto del actual.')
        await m.query(`INSERT INTO public.reward_fulfillment(contribution_id,status,notes) VALUES($1,$2::reward_fulfillment_status,$3) ON CONFLICT(contribution_id) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes,updated_at=clock_timestamp()`,[contributionId,input.status,input.reason.trim()])
        await rewardHistorySnapshot(m,userId,contributionId,input.reason.trim())
        const [f]=await m.query('SELECT id FROM public.reward_fulfillment WHERE contribution_id=$1',[contributionId])
        await recordAudit(m,userId,'UPDATE','reward_fulfillment',f.id)
      }
      // Evidencias privadas pueden esperar por otra transacción: vuelve a validar rol y representación.
      await this.owner(m,userId,id,true)
    })
    return this.rewards(userId,id)
  }
  async dashboard(userId: string) {
    return { items: await this.database.connection().query(`SELECT c.id,c.title,c.status,c.currency_code AS "currencyCode",c.goal_amount::text AS "goalAmount",c.organization_id AS "organizationId",o.legal_name AS "organizationName",
      f.amount_raised::text AS "amountRaised",f.funding_percent::text AS "fundingPercent",
      (SELECT count(*)::int FROM public.campaign_update u WHERE u.campaign_id=c.id AND u.deleted_at IS NULL AND u.published_at IS NOT NULL AND u.visibility='PUBLIC') AS "updateCount",
      (SELECT round(avg(a.progress_percent),1)::text FROM public.campaign_activity a WHERE a.campaign_id=c.id) AS "activityProgress"
      FROM public.campaign c LEFT JOIN public.organization o ON o.id=c.organization_id LEFT JOIN LATERAL (SELECT GREATEST(COALESCE(sum(p.amount-COALESCE(r.amount,0)),0),0)::numeric(16,2) AS amount_raised, CASE WHEN c.goal_amount>0 THEN round(GREATEST(COALESCE(sum(p.amount-COALESCE(r.amount,0)),0),0)/c.goal_amount*100,2) ELSE 0 END AS funding_percent FROM public.contribution ct JOIN public.payment p ON p.contribution_id=ct.id JOIN public.payment_provider pp ON pp.id=p.provider_id LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM public.refund WHERE payment_id=p.id AND status='REFUNDED') r ON true WHERE ct.campaign_id=c.id AND p.confirmed_at IS NOT NULL AND NOT pp.is_sandbox) f ON true WHERE ${currentOwner.replaceAll('$2', '$1')} ORDER BY c.updated_at DESC,c.id LIMIT 100`, [userId]) as unknown[] }
  }
  async accountability(userId: string, id: string) { return this.database.connection().transaction('REPEATABLE READ', async m => {
    const campaign = await this.owner(m, userId, id)
    const budget = await m.query(`SELECT b.id,b.description,b.planned_amount::text AS "plannedAmount",ec.name AS category FROM public.budget_item b JOIN public.expense_category ec ON ec.id=b.expense_category_id WHERE b.campaign_id=$1 ORDER BY b.display_order,b.id`, [id]) as unknown[]
    const reports = await m.query(`SELECT r.id,r.period_label AS "periodLabel",r.period_start::text AS "periodStart",r.period_end::text AS "periodEnd",r.is_final AS "isFinal",r.status,r.funds_received::text AS "fundsReceived",r.funds_spent::text AS "fundsSpent",CASE WHEN r.funds_received IS NULL OR r.funds_spent IS NULL THEN NULL ELSE r.balance::text END AS balance,r.currency_code AS currency,r.variance_explanation AS "varianceExplanation",r.narrative,r.published_at::text AS "publishedAt",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'budgetItemId',e.budget_item_id,'description',e.description,'spentAmount',e.spent_amount::text,'currency',e.currency_code,'spentOn',e.spent_on,'evidenceCount',(SELECT count(*)::int FROM public.file_attachment a WHERE a.accountability_expense_id=e.id)) ORDER BY e.spent_on,e.id) FROM public.accountability_expense e WHERE e.report_id=r.id),'[]') AS expenses
      FROM public.accountability_report r WHERE r.campaign_id=$1 ORDER BY r.created_at DESC,r.id LIMIT 100`, [id]) as unknown[]
    return { campaign, budget, reports, captureAvailable: false }
  }) }
}
