import {LEGAL_HASH,recordLegalAcceptance} from '../../legal/legal-record'
import {assertLegalAcceptance} from '../../legal/domain/legal-agreement'
import {assertRepresentationSettled} from './representation-settlement'
import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { ORGANIZATION_MANAGERS } from '../../organizations/domain/membership'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {reviewPlan,type ReviewInput} from '../domain/review'
import type { PayoutSummary, VerificationDetail, VerificationDocument, VerificationRepository, VerificationSummary, VerificationType } from '../application/verifications'
import { approvedPolicy, assertEditableVerification, CAPTURE_TYPES, InvalidVerification, validateSubmission, VerificationConflict, VerificationForbidden, VerificationPolicyUnavailable, VerificationUnavailable, type VerificationPolicy, type VerificationSubmission } from '../domain/verification'

const subject = `((v.organization_id IS NULL AND v.user_id=$1) OR EXISTS(SELECT 1 FROM public.organization_member m JOIN public.organization o ON o.id=m.organization_id
  WHERE m.organization_id=v.organization_id AND m.user_id=$1 AND (m.left_at IS NULL OR m.left_at>clock_timestamp()) AND m.joined_at<=clock_timestamp()
  AND m.organization_role::text=ANY($3::text[]) AND o.deleted_at IS NULL))`
const summary = `v.id,t.name AS "typeName",t.code AS "typeCode",v.organization_id AS "organizationId",o.legal_name AS "organizationName",
 v.status,v.updated_at AS "updatedAt"`
const joined = `FROM public.verification v JOIN public.verification_type t ON t.id=v.verification_type_id LEFT JOIN public.organization o ON o.id=v.organization_id`
const iso = (value: Date | string | null): string | null => value instanceof Date ? value.toISOString() : value
interface CaseRow extends Omit<VerificationDetail, 'history' | 'revisions' | 'documents' | 'policy' | 'fields'> { verificationTypeId: string; submittedData: Partial<VerificationSubmission> & {acceptedBy?: string | null;acceptedAt?: string | null;legalReceiptId?:string;legalHash?:string} }
@Injectable()
export class TypeormVerificationRepository implements VerificationRepository {
  constructor(private readonly database: DatabaseService) {}
  private async actor(manager: EntityManager, userId: string, write = false) {
    const rows: { code: string }[] = await manager.query(`SELECT r.code FROM public.app_user u JOIN public.user_role ur ON ur.user_id=u.id JOIN public.role r ON r.id=ur.role_id
      WHERE u.id=$1 AND u.status::text=ANY($2::text[]) AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
      AND ur.granted_at<=clock_timestamp() AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()) ${write ? 'FOR SHARE OF u' : ''}`, [userId, BASIC_ACCESS_STATUSES])
    if (!rows.some(row => row.code === 'REGISTERED_USER') || (write && rows.some(row => row.code === 'AUDITOR'))) throw new VerificationForbidden()
  }
  private async organization(manager: EntityManager, userId: string, id: string) {
    await manager.query('SELECT id FROM public.organization WHERE id=$1 FOR SHARE',[id])
    const rows: { id: string }[] = await manager.query(`SELECT o.id FROM public.organization o JOIN public.organization_member m ON m.organization_id=o.id
      WHERE o.id=$1 AND o.deleted_at IS NULL AND m.user_id=$2 AND (m.left_at IS NULL OR m.left_at>clock_timestamp()) AND m.joined_at<=clock_timestamp()
      AND m.organization_role::text=ANY($3::text[]) FOR SHARE OF o`, [id, userId, ORGANIZATION_MANAGERS])
    if (!rows.length) throw new VerificationUnavailable()
  }
  private async policy(manager: EntityManager, typeId: string): Promise<VerificationPolicy | null> {
    const rows: { version: string; definition: VerificationPolicy }[] = await manager.query(`SELECT p.version,p.definition FROM brotar_extension.verification_policy p
      JOIN public.verification_type t ON t.id=p.verification_type_id WHERE p.verification_type_id=$1 AND p.is_active AND t.is_active AND t.code=ANY($2::text[])`, [typeId, [...CAPTURE_TYPES]])
    const row = rows[0]
    if (!row || !approvedPolicy(row.definition) || row.definition.version !== row.version) return null
    if(row.version.startsWith('mvp-demo-') && process.env.NODE_ENV==='production')return null
    // La activación de un catálogo no implica que un documento sea un requisito; aquí solo se comprueban referencias explícitas de la política.
    const docs: { id: string }[] = await manager.query(`SELECT d.id FROM public.document_type d JOIN public.verification_type t ON t.id=$1
      WHERE d.is_active AND NOT d.requires_number AND NOT d.requires_expiry AND d.id=ANY($2::uuid[]) AND d.applies_to=t.applies_to`, [typeId, row.definition.documents.map(doc => doc.documentTypeId)])
    return docs.length === row.definition.documents.length ? row.definition : null
  }
  async types(userId: string): Promise<VerificationType[]> {
    const manager = this.database.connection().manager
    await this.actor(manager, userId)
    const types: Omit<VerificationType, 'policy'>[] = await manager.query(`SELECT id,code,name,applies_to AS "appliesTo" FROM public.verification_type WHERE is_active AND code=ANY($1::text[]) ORDER BY name`, [[...CAPTURE_TYPES]])
    return Promise.all(types.map(async type => ({ ...type, policy: await this.policy(manager, type.id) })))
  }
  async list(userId: string): Promise<VerificationSummary[]> {
    const manager = this.database.connection().manager
    await this.actor(manager, userId)
    const rows: VerificationSummary[] = await manager.query(`SELECT ${summary} ${joined} WHERE ${subject} AND $2::uuid IS NULL ORDER BY v.updated_at DESC,v.id LIMIT 100`, [userId, null, ORGANIZATION_MANAGERS])
    return rows.map(row => ({ ...row, updatedAt: iso(row.updatedAt)! }))
  }
  private async row(manager: EntityManager, userId: string, id: string, lock = false, administrative=false): Promise<CaseRow> {
    if(lock){
      const [subject]=await manager.query('SELECT organization_id FROM public.verification WHERE id=$1',[id])
      if(subject?.organization_id)await manager.query('SELECT id FROM public.organization WHERE id=$1 FOR SHARE',[subject.organization_id])
    }
    const rows: CaseRow[] = await manager.query(`SELECT ${summary},v.verification_type_id AS "verificationTypeId",v.updated_at::text AS version,
      v.result_notes AS "resultNotes",v.rejection_reason AS "rejectionReason",v.submitted_at AS "submittedAt",v.submitted_data AS "submittedData"
      ${joined} WHERE v.id=$2 AND (${administrative?'$1::uuid IS NOT NULL AND $3::text[] IS NOT NULL':subject}) ${lock ? 'FOR UPDATE OF v' : ''}`, [userId, id, ORGANIZATION_MANAGERS])
    if (!rows[0]) throw new VerificationUnavailable()
    if (lock && rows[0].organizationId && !administrative) await this.organization(manager, userId, rows[0].organizationId)
    return rows[0]
  }
  private async documents(manager: EntityManager, id: string): Promise<VerificationDocument[]> {
    return manager.query(`SELECT d.file_id AS "fileId",d.document_type_id AS "documentTypeId",t.name AS label,f.file_name AS "originalName",d.review_notes AS "reviewNotes",d.is_valid AS "isValid"
      FROM public.verification_document d JOIN public.document_type t ON t.id=d.document_type_id JOIN public.file_asset f ON f.id=d.file_id
      WHERE d.verification_id=$1 AND f.scope='PRIVATE' AND f.deleted_at IS NULL ORDER BY d.uploaded_at,d.id`, [id])
  }
  private async detailWith(manager: EntityManager, userId: string, id: string, administrative=false): Promise<VerificationDetail> {
    const row = await this.row(manager, userId, id,false,administrative)
    const allDocuments = await this.documents(manager, id)
    const documents = Array.isArray(row.submittedData.documents) ? allDocuments.filter(doc => row.submittedData.documents!.some(ref => ref.fileId === doc.fileId)) : allDocuments
    const history: VerificationDetail['history'] = await manager.query(`SELECT to_status AS status,changed_at AS at,reason FROM public.status_history WHERE entity_type='VERIFICATION' AND entity_id=$1 ORDER BY changed_at,id`, [id])
    const revisions: { id: string; operation: string; recordedAt: string; snapshot: { policyVersion?: string; fields?: Record<string, string>; documents?: VerificationDocument[]; legalVersion?:string;legalReceiptId?:string;legalHash?:string; resultNotes?: string | null; rejectionReason?: string | null } }[] = await manager.query(`SELECT id,operation,recorded_at AS "recordedAt",snapshot FROM brotar_extension.verification_revision WHERE verification_id=$1 ORDER BY recorded_at,id`, [id])
    return { id: row.id, typeName: row.typeName, typeCode: row.typeCode, organizationId: row.organizationId, organizationName: row.organizationName, status: row.status, updatedAt: iso(row.updatedAt)!, version: row.version,
      resultNotes: row.resultNotes, rejectionReason: row.rejectionReason, submittedAt: iso(row.submittedAt), policy: await this.policy(manager, row.verificationTypeId),
      fields: this.fields(row.submittedData.fields), documents, history: history.map(event => ({ ...event, at: iso(event.at)! })),
      revisions: revisions.map(revision => ({ id: revision.id, operation: revision.operation, recordedAt: iso(revision.recordedAt)!, policyVersion: revision.snapshot.policyVersion ?? '', legalReceipt:revision.snapshot.legalReceiptId&&revision.snapshot.legalVersion&&revision.snapshot.legalHash?{id:revision.snapshot.legalReceiptId,version:revision.snapshot.legalVersion,hash:revision.snapshot.legalHash}:null, fields: this.fields(revision.snapshot.fields), documents: revision.snapshot.documents ?? [], resultNotes: revision.snapshot.resultNotes ?? null, rejectionReason: revision.snapshot.rejectionReason ?? null })) }
  }
  private fields(data: unknown): Record<string, string> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    return Object.fromEntries(Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  }
  async detail(userId: string, id: string) {
    const manager = this.database.connection().manager
    await this.actor(manager, userId)
    return this.detailWith(manager, userId, id)
  }
  async start(userId: string, typeId: string, organizationId: string | null) {
    return this.database.connection().transaction(async manager => {
      await this.actor(manager, userId, true)
      await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id',userId])
      const types: { appliesTo: string; code: string }[] = await manager.query(`SELECT applies_to AS "appliesTo",code FROM public.verification_type WHERE id=$1 AND is_active AND code=ANY($2::text[])`, [typeId, [...CAPTURE_TYPES]])
      const type = types[0]
      if (!type || (type.appliesTo === 'ORGANIZATION') !== Boolean(organizationId)) throw new InvalidVerification()
      if (organizationId) await this.organization(manager, userId, organizationId)
      const policy = await this.policy(manager, typeId)
      if (!policy) throw new VerificationPolicyUnavailable()
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`verification:${organizationId ?? userId}:${typeId}`])
      const existing: { id: string; status:string }[] = await manager.query(`SELECT id,status FROM public.verification WHERE verification_type_id=$1
        AND (($2::uuid IS NOT NULL AND organization_id=$2) OR ($2::uuid IS NULL AND user_id=$3)) ORDER BY created_at DESC,id LIMIT 1`, [typeId, organizationId, userId])
      // Un reintento recupera el caso existente; una representación caducada inicia otra ronda conservando el expediente anterior.
      if (existing[0] && existing[0].status!=='EXPIRED') return this.detailWith(manager, userId, existing[0].id)
      await this.actor(manager, userId, true)
      if (organizationId) await this.organization(manager, userId, organizationId)
      const id = randomUUID()
      await manager.query(`INSERT INTO public.verification(id,verification_type_id,user_id,organization_id,submitted_data) VALUES($1,$2,$3,$4,$5::jsonb)`, [id, typeId, organizationId ? null : userId, organizationId, JSON.stringify({ policyVersion: policy.version, fields: {}, documents: [], accepted: false })])
      await recordAudit(manager,userId,'CREATE','verification',id)
      return this.detailWith(manager, userId, id)
    })
  }
  async save(userId: string, id: string, expectedVersion: string, input: VerificationSubmission, submit: boolean) {
    return this.database.connection().transaction(async manager => {
      await this.actor(manager, userId, true)
      await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id',userId])
      const row = await this.row(manager, userId, id, true)
      if (row.version !== expectedVersion) throw new VerificationConflict()
      assertEditableVerification(row.status)
      if(submit)assertLegalAcceptance(input.legalVersion,input.accepted)
      const value = validateSubmission(await this.policy(manager, row.verificationTypeId), input, submit)
      for (const doc of [...value.documents].sort((a,b) => a.fileId.localeCompare(b.fileId))) {
        const files: { id: string }[] = await manager.query(`SELECT f.id FROM public.file_asset f WHERE f.id=$1 AND f.scope='PRIVATE' AND f.deleted_at IS NULL
          AND f.storage_key LIKE 'VERIFICATION_DOCUMENT/%' AND (f.uploaded_by=$2 OR EXISTS(SELECT 1 FROM public.verification_document d WHERE d.verification_id=$3 AND d.file_id=f.id AND d.document_type_id=$4)) FOR UPDATE OF f`, [doc.fileId, userId, id, doc.documentTypeId])
        if (!files.length) throw new InvalidVerification('El documento no está disponible para este caso.')
        // Se consulta después del bloqueo del archivo: otro caso puede haberlo vinculado mientras esperábamos.
        // Una carga ya entregada a un expediente no se recupera por la sola condición de uploader.
        const existing: { verificationId: string; documentTypeId: string }[] = await manager.query(`SELECT verification_id AS "verificationId",document_type_id AS "documentTypeId" FROM public.verification_document WHERE file_id=$1`, [doc.fileId])
        if (existing.some(link => link.verificationId !== id || link.documentTypeId !== doc.documentTypeId)) throw new InvalidVerification('El documento ya pertenece a otro expediente.')
      }
      await this.actor(manager, userId, true)
      if (row.organizationId) await this.organization(manager, userId, row.organizationId)
      const before = await this.detailWith(manager, userId, id)
      await this.record(manager, userId, id, 'BEFORE_CHANGE', { legalVersion:row.submittedData.legalVersion??null,legalReceiptId:row.submittedData.legalReceiptId??null,legalHash:row.submittedData.legalHash??null,policyVersion: row.submittedData.policyVersion ?? '', fields: before.fields, documents: before.documents, accepted: row.submittedData.accepted ?? false, acceptedBy: row.submittedData.acceptedBy ?? null, acceptedAt: row.submittedData.acceptedAt ?? null, resultNotes: row.resultNotes, rejectionReason: row.rejectionReason })
      for (const doc of value.documents) await manager.query(`INSERT INTO public.verification_document(verification_id,document_type_id,file_id) VALUES($1,$2,$3) ON CONFLICT(verification_id,file_id) DO NOTHING`, [id, doc.documentTypeId, doc.fileId])
      const submission = { ...value, legalVersion:input.legalVersion, ...(submit?{legalReceiptId:await recordLegalAcceptance(manager,userId,input.legalVersion!,'VERIFICATION',id,value.policyVersion,row.version),legalHash:LEGAL_HASH}:{}), acceptedBy: value.accepted ? userId : null, acceptedAt: value.accepted ? new Date().toISOString() : null }
      if(submit)await manager.query('UPDATE public.verification_document SET is_valid=NULL,review_notes=NULL WHERE verification_id=$1 AND file_id=ANY($2::uuid[])',[id,value.documents.map(d=>d.fileId)])
      await manager.query(`UPDATE public.verification SET submitted_data=$2::jsonb, status=CASE WHEN $3 THEN 'PENDING'::verification_status ELSE status END,
        reviewed_by=CASE WHEN $3 THEN NULL ELSE reviewed_by END,reviewed_at=CASE WHEN $3 THEN NULL ELSE reviewed_at END,
        result_notes=CASE WHEN $3 THEN NULL ELSE result_notes END,rejection_reason=CASE WHEN $3 THEN NULL ELSE rejection_reason END,
        submitted_at=CASE WHEN $3 THEN clock_timestamp() ELSE submitted_at END WHERE id=$1`, [id, JSON.stringify(submission), submit])
      const after = await this.detailWith(manager, userId, id)
      await this.record(manager, userId, id, submit ? 'SUBMIT' : 'SAVE', { ...submission, documents: after.documents, resultNotes: row.resultNotes, rejectionReason: row.rejectionReason })
      await recordAudit(manager,userId,submit?'STATUS_CHANGE':'UPDATE','verification',id)
      return this.detailWith(manager, userId, id)
    })
  }
  private record(manager: EntityManager, userId: string, id: string, operation: string, snapshot: unknown) {
    return manager.query(`INSERT INTO brotar_extension.verification_revision(id,verification_id,actor_user_id,operation,snapshot) VALUES($1,$2,$3,$4,$5::jsonb)`, [randomUUID(), id, userId, operation, JSON.stringify(snapshot)])
  }
  async documentOwner(userId: string, id: string, fileId: string) {
    const manager = this.database.connection().manager
    await this.actor(manager, userId); await this.row(manager, userId, id)
    const rows: { owner: string }[] = await manager.query(`SELECT f.uploaded_by AS owner FROM public.verification_document d JOIN public.file_asset f ON f.id=d.file_id
      WHERE d.verification_id=$1 AND f.id=$2 AND f.scope='PRIVATE' AND f.deleted_at IS NULL AND f.uploaded_by IS NOT NULL`, [id, fileId])
    if (!rows[0]) throw new VerificationUnavailable()
    return rows[0].owner
  }
  async payouts(userId: string): Promise<PayoutSummary[]> {
    const manager = this.database.connection().manager
    await this.actor(manager, userId)
    return manager.query(`SELECT p.id,p.organization_id AS "organizationId",p.account_holder_name AS "accountHolderName",p.bank_name AS "bankName",
      right(p.account_number_last4,4) AS last4,p.currency_code AS currency,p.status FROM public.payout_account p
      WHERE p.deleted_at IS NULL AND ((p.organization_id IS NULL AND p.user_id=$1) OR EXISTS(SELECT 1 FROM public.organization_member m JOIN public.organization o ON o.id=m.organization_id
        WHERE m.organization_id=p.organization_id AND m.user_id=$1 AND (m.left_at IS NULL OR m.left_at>clock_timestamp()) AND m.joined_at<=clock_timestamp() AND o.deleted_at IS NULL AND m.organization_role::text=ANY($2::text[]))) ORDER BY p.created_at DESC,p.id`, [userId, ORGANIZATION_MANAGERS])
  }

  async reviewList(actor:string,kind:string,status:string,page:number){
    if(!['USER','ORGANIZATION'].includes(kind) || !['NOT_STARTED','PENDING','IN_REVIEW','REQUIRES_INFO','APPROVED','REJECTED','EXPIRED'].includes(status) || !Number.isSafeInteger(page) || page<1 || page>10000)throw new InvalidVerification()
    return this.database.connection().transaction('REPEATABLE READ',async m=>{
      await transactionAccess(m,actor,'verification.read')
      const args=[kind,status,[...CAPTURE_TYPES]]
      const [count]=await m.query(`SELECT count(*)::int AS total ${joined} WHERE t.applies_to::text=$1 AND v.status::text=$2 AND t.code=ANY($3::text[])`,args)
      const rows:VerificationSummary[]=await m.query(`SELECT ${summary} ${joined} WHERE t.applies_to::text=$1 AND v.status::text=$2 AND t.code=ANY($3::text[]) ORDER BY v.updated_at,v.id LIMIT 20 OFFSET $4`,[...args,(page-1)*20])
      return{items:rows.map(r=>({...r,updatedAt:iso(r.updatedAt)!})),total:count.total,page,pageSize:20}
    })
  }
  async reviewDetail(actor:string,id:string){return this.database.connection().transaction(async m=>{
    await transactionAccess(m,actor,'verification.read')
    const detail=await this.detailWith(m,actor,id,true)
    const [review]=await m.query('SELECT user_id AS "subjectUserId",reviewed_by AS "reviewedBy",reviewed_at AS "reviewedAt" FROM public.verification WHERE id=$1',[id])
    return{...detail,...review,reviewedAt:iso(review.reviewedAt)}
  })}
  async decide(actor:string,id:string,version:string,input:ReviewInput){
    if(!['test','development'].includes(process.env.NODE_ENV??'development'))throw new VerificationForbidden()
    await this.database.connection().transaction(async m=>{
      await transactionAccess(m,actor,'verification.review')
      const row=await this.row(m,actor,id,true,true)
      await transactionAccess(m,actor,'verification.review')
      if(row.version!==version)throw new VerificationConflict()
      const [conflict]=await m.query(`SELECT v.id FROM public.verification v WHERE v.id=$1 AND (v.user_id=$2 OR v.submitted_data->>'acceptedBy'=$2::text OR
        EXISTS(SELECT 1 FROM public.organization_member mem WHERE mem.organization_id=v.organization_id AND mem.user_id=$2 AND mem.joined_at<=clock_timestamp() AND (mem.left_at IS NULL OR mem.left_at>clock_timestamp())) OR
        EXISTS(SELECT 1 FROM public.verification_document d JOIN public.file_asset f ON f.id=d.file_id WHERE d.verification_id=v.id AND f.uploaded_by=$2))`,[id,actor])
      if(conflict)throw new VerificationForbidden()
      const before=await this.detailWith(m,actor,id,true),policy=await this.policy(m,row.verificationTypeId)
      if(!policy?.version.startsWith('mvp-demo-'))throw new VerificationPolicyUnavailable()
      const plan=reviewPlan(row.status,input,before.documents.map(d=>d.fileId))
      if(plan.decision==='APPROVED'){
        if(row.organizationId)await assertRepresentationSettled(m,row.organizationId)
        const submitted=validateSubmission(policy,{policyVersion:row.submittedData.policyVersion??'',fields:row.submittedData.fields??{},documents:row.submittedData.documents??[],accepted:row.submittedData.accepted??false})
        if(!row.submittedData.acceptedBy || !row.submittedData.acceptedAt || submitted.documents.length!==before.documents.length)throw new InvalidVerification()
        if(row.organizationId){
          const [representative]=await m.query(`SELECT mem.id FROM public.organization_member mem JOIN public.organization o ON o.id=mem.organization_id
            WHERE mem.organization_id=$1 AND mem.user_id::text=$2 AND (mem.left_at IS NULL OR mem.left_at>clock_timestamp()) AND mem.joined_at<=clock_timestamp() AND mem.organization_role::text=ANY($3::text[]) AND o.deleted_at IS NULL
            AND EXISTS(SELECT 1 FROM public.verification k JOIN public.verification_type t ON t.id=k.verification_type_id JOIN brotar_extension.verification_policy p ON p.verification_type_id=t.id AND p.is_active AND p.version=k.submitted_data->>'policyVersion'
              WHERE k.user_id=mem.user_id AND t.code='KYC_IDENTITY' AND k.status='APPROVED' AND (k.expires_at IS NULL OR k.expires_at>clock_timestamp())) FOR SHARE OF o`,[row.organizationId,row.submittedData.acceptedBy,ORGANIZATION_MANAGERS])
          if(!representative)throw new InvalidVerification('Se requiere un representante vigente con KYC DEMO aprobado.')
        }
      }
      await setAuditActor(m,actor)
      await this.record(m,actor,id,'BEFORE_CHANGE',{policyVersion:row.submittedData.policyVersion??'',fields:before.fields,documents:before.documents,resultNotes:row.resultNotes,rejectionReason:row.rejectionReason})
      for(const doc of plan.documents)await m.query('UPDATE public.verification_document SET is_valid=$3,review_notes=$4 WHERE verification_id=$1 AND file_id=$2',[id,doc.fileId,doc.isValid,doc.notes||null])
      await m.query(`UPDATE public.verification SET status=$2::verification_status,reviewed_by=$3,reviewed_at=clock_timestamp(),result_notes=$4,
        rejection_reason=CASE WHEN $2='REJECTED' THEN $4 ELSE NULL END WHERE id=$1`,[id,plan.decision,actor,plan.reason])
      const after=await this.detailWith(m,actor,id,true)
      await this.record(m,actor,id,'REVIEW',{policyVersion:policy.version,fields:after.fields,documents:after.documents,resultNotes:plan.reason,rejectionReason:after.rejectionReason,decision:plan.decision,reviewedBy:actor})
      await recordAudit(m,actor,plan.decision==='APPROVED'?'APPROVE':plan.decision==='REJECTED'?'REJECT':'STATUS_CHANGE','verification',id)
    })
    return this.reviewDetail(actor,id)
  }
  async reviewDocumentOwner(actor:string,id:string,fileId:string){return this.database.connection().transaction(async m=>{
    await transactionAccess(m,actor,'verification.read');await this.row(m,actor,id,false,true)
    const [file]=await m.query(`SELECT f.uploaded_by AS owner FROM public.verification_document d JOIN public.file_asset f ON f.id=d.file_id
      WHERE d.verification_id=$1 AND d.file_id=$2 AND f.scope='PRIVATE' AND f.deleted_at IS NULL AND f.storage_key LIKE 'VERIFICATION_DOCUMENT/%'`,[id,fileId])
    if(!file?.owner)throw new VerificationUnavailable();return file.owner as string
  })}
  async badges(campaignId:string){
    if(process.env.NODE_ENV==='production')return{mode:'DEMO',items:[],notice:'Verificaciones DEMO no operativas en producción.'}
    const rows:{code:string;reviewedAt:Date}[]=await this.database.connection().query(`SELECT DISTINCT ON (t.code) t.code,v.reviewed_at AS "reviewedAt"
      FROM public.campaign c JOIN public.verification v ON (c.organization_id IS NULL AND v.user_id=c.creator_user_id OR c.organization_id IS NOT NULL AND v.organization_id=c.organization_id)
      JOIN public.verification_type t ON t.id=v.verification_type_id JOIN brotar_extension.verification_policy p ON p.verification_type_id=t.id AND p.version=v.submitted_data->>'policyVersion' AND p.is_active
      WHERE c.id=$1 AND c.deleted_at IS NULL AND c.published_at IS NOT NULL AND c.status IN ('PUBLISHED','FUNDING_ENDED','IN_EXECUTION','CLOSED','CANCELLED')
      AND v.status='APPROVED' AND v.reviewed_at IS NOT NULL AND (v.expires_at IS NULL OR v.expires_at>clock_timestamp()) AND p.version LIKE 'mvp-demo-%'
      AND (t.code<>'KYB_REPRESENTATIVE' OR EXISTS(SELECT 1 FROM public.organization_member mem WHERE mem.organization_id=c.organization_id AND mem.user_id::text=v.submitted_data->>'acceptedBy' AND (mem.left_at IS NULL OR mem.left_at>clock_timestamp()) AND mem.joined_at<=clock_timestamp())) ORDER BY t.code,v.reviewed_at DESC,v.id`,[campaignId])
    const names:Record<string,string>={KYC_IDENTITY:'Identidad documental DEMO revisada',KYB_LEGAL:'Registro de organización DEMO revisado',KYB_REPRESENTATIVE:'Representación documental DEMO revisada'}
    return{mode:'DEMO',items:rows.filter(r=>names[r.code]).map(r=>({code:r.code,label:names[r.code]!,reviewedAt:r.reviewedAt.toISOString()})),notice:'Revisión de documentos sintéticos, no identidad real, solvencia ni garantía del proyecto.'}
  }
}
