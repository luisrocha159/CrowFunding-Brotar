import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common'
import {randomUUID} from 'node:crypto'
import type {EntityManager} from 'typeorm'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {identityReady} from '../../campaign-lifecycle/infrastructure/eligibility'
import {assertMutation,partyActor,partyHistory,partyVersion} from './party-mutations'
import {assertRepresentationSettled} from './representation-settlement'
import type {RepresentationActionDto,RepresentationProposalDto} from './representation.controller'
interface RequestRow {
 id:string;organizationId:string;organizationName:string;kind:'OWNERSHIP'|'REPRESENTATIVE';targetUserId:string;targetName:string;requestedBy:string;requesterName:string
 status:string;version:number;requestedAt:Date;acceptedAt:Date|null;acceptedBy:string|null;decidedAt:Date|null;decidedBy:string|null;reason:string;decisionReason:string|null
 organizationVersion:number
}
const projection=`r.id,r.organization_id AS "organizationId",o.legal_name AS "organizationName",r.kind,r.target_user_id AS "targetUserId",concat_ws(' ',target.first_name,target.last_name) AS "targetName",r.requested_by AS "requestedBy",concat_ws(' ',requester.first_name,requester.last_name) AS "requesterName",r.status,r.version,r.requested_at AS "requestedAt",r.accepted_at AS "acceptedAt",r.accepted_by AS "acceptedBy",r.decided_at AS "decidedAt",r.decided_by AS "decidedBy",r.reason,r.decision_reason AS "decisionReason",r.organization_version AS "organizationVersion"`
const joined=`FROM brotar_extension.representation_request r JOIN public.organization o ON o.id=r.organization_id JOIN public.user_profile target ON target.user_id=r.target_user_id JOIN public.user_profile requester ON requester.user_id=r.requested_by`
const owner=`EXISTS(SELECT 1 FROM public.organization_member mem WHERE mem.organization_id=r.organization_id AND mem.user_id=$1 AND mem.organization_role='OWNER' AND mem.joined_at<=clock_timestamp() AND (mem.left_at IS NULL OR mem.left_at>clock_timestamp()))`
const visible=`(r.target_user_id=$1 OR r.requested_by=$1 OR ${owner})`
const iso=(v:Date|string|null)=>v instanceof Date?v.toISOString():v
@Injectable()
export class RepresentationRequests {
 constructor(private readonly database:DatabaseService){}
 private enabled(){if(!['test','development'].includes(process.env.NODE_ENV??'development'))throw new ForbiddenException('La representación DEMO no está operativa en producción.')}
 private async accountLocks(m:EntityManager,ids:string[]){
  try{await m.query('SELECT id FROM public.app_user WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE NOWAIT',[[...new Set(ids)].sort()])}
  catch(error){if(error&&typeof error==='object'&&'code'in error&&error.code==='55P03')throw new ConflictException('Una cuenta está ocupada. Recarga y confirma de nuevo.');throw error}
 }
 private async isOwner(m:EntityManager,organizationId:string,userId:string){return (await m.query(`SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND organization_role='OWNER' AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())`,[organizationId,userId])).length>0}
 private async roles(m:EntityManager,id:string){return(await m.query(`SELECT r.code FROM public.app_user u JOIN public.user_role ur ON ur.user_id=u.id JOIN public.role r ON r.id=ur.role_id WHERE u.id=$1 AND u.deleted_at IS NULL AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp()) AND ur.granted_at<=clock_timestamp() AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())`,[id]) as{code:string}[]).map(r=>r.code)}
 private async independent(m:EntityManager,actor:string,r:RequestRow){return actor!==r.requestedBy&&actor!==r.targetUserId&&!(await m.query(`SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())`,[r.organizationId,actor])).length}
 private async actions(m:EntityManager,actor:string,r:RequestRow,admin:boolean){
  if(!['REQUESTED','ACCEPTED'].includes(r.status))return[]
  const roles=await this.roles(m,actor);if(roles.includes('AUDITOR'))return[]
  if(admin){if(!roles.includes('ADMIN'))return[];return ['REJECT',...(r.status==='ACCEPTED'&&await this.independent(m,actor,r)?['APPROVE']:[])]}
  if(!roles.includes('REGISTERED_USER'))return[]
  return [...(r.status==='REQUESTED'&&r.targetUserId===actor?['ACCEPT','DECLINE']:[]),...(r.requestedBy===actor&&await this.isOwner(m,r.organizationId,actor)?['CANCEL']:[])]
 }
 private async present(m:EntityManager,actor:string,row:RequestRow,admin:boolean){
  const {organizationVersion:_,...publicRow}=row;void _
  return{...publicRow,requestedAt:iso(row.requestedAt),acceptedAt:iso(row.acceptedAt),decidedAt:iso(row.decidedAt),allowedActions:await this.actions(m,actor,row,admin)}
 }
 private async read(m:EntityManager,actor:string,id:string,admin:boolean,authorizedMutation=false){
  await partyActor(m,actor,admin,false)
  const [row]:RequestRow[]=await m.query(`SELECT ${projection} ${joined} WHERE r.id=$2 AND ($3::boolean OR ${visible})`,[actor,id,admin||authorizedMutation]);if(!row)throw new NotFoundException('Solicitud no disponible.')
  const events:{version:number;action:string;actorId:string;reason:string;recordedAt:Date}[]=await m.query(`SELECT version,action,actor_id AS "actorId",reason,recorded_at AS "recordedAt" FROM brotar_extension.representation_event WHERE request_id=$1 ORDER BY version`,[id])
  return{...await this.present(m,actor,row,admin),events:events.map(e=>({...e,recordedAt:iso(e.recordedAt)}))}
 }
 async list(actor:string,admin:boolean,page=1){this.enabled();return this.database.connection().transaction('REPEATABLE READ',async m=>{
  await partyActor(m,actor,admin,false)
  const [count]=await m.query(`SELECT count(*)::int AS total FROM brotar_extension.representation_request r WHERE ($2::boolean OR ${visible})`,[actor,admin])
  const rows:RequestRow[]=await m.query(`SELECT ${projection} ${joined} WHERE ($2::boolean OR ${visible}) ORDER BY r.requested_at DESC,r.id DESC LIMIT 20 OFFSET $3`,[actor,admin,(page-1)*20])
  return{items:await Promise.all(rows.map(row=>this.present(m,actor,row,admin))),total:count.total,page,pageSize:20}
 })}
 async detail(actor:string,id:string,admin=false){this.enabled();return this.database.connection().transaction('REPEATABLE READ',m=>this.read(m,actor,id,admin))}
 async propose(actor:string,organizationId:string,input:RepresentationProposalDto){
  this.enabled();assertMutation(input)
  if(!['REPRESENTATIVE','OWNERSHIP'].includes(input.kind)||input.targetUserId===actor)throw new BadRequestException('Selecciona otra cuenta registrada para representar la organización.')
  return this.database.connection().transaction(async m=>{
   const [org]=await m.query(`SELECT id,status FROM public.organization WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,[organizationId]);if(!org)throw new NotFoundException('Organización no disponible.')
   await this.accountLocks(m,[actor,input.targetUserId]);await partyActor(m,actor,false);await partyActor(m,input.targetUserId,false)
   if(!await this.isOwner(m,organizationId,actor))throw new ForbiddenException('Solo un propietario vigente puede proponer representación.')
   if(['SUSPENDED','CLOSED'].includes(org.status))throw new ConflictException('La organización no está operativa.')
   await partyVersion(m,'ORGANIZATION',organizationId,input.expectedVersion)
   await assertRepresentationSettled(m,organizationId)
   if(await this.isOwner(m,organizationId,input.targetUserId))throw new ConflictException('La cuenta ya es propietaria. Selecciona otro destinatario.')
   const id=randomUUID();await setAuditActor(m,actor)
   await m.query(`INSERT INTO brotar_extension.representation_request(id,organization_id,kind,target_user_id,requested_by,organization_version,reason) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,organizationId,input.kind,input.targetUserId,actor,Number(input.expectedVersion),input.reason.trim()])
   await m.query(`INSERT INTO brotar_extension.representation_event(request_id,version,action,actor_id,reason) VALUES($1,1,'REQUEST',$2,$3)`,[id,actor,input.reason.trim()])
   await recordAudit(m,actor,'CREATE','organization',organizationId)
   return this.read(m,actor,id,false)
  })
 }
 private async apply(m:EntityManager,actor:string,r:RequestRow,why:string){
  // Canonical KYC checks validate approved policy, current review, private documents and expiry.
  await identityReady(m,{id:r.organizationId,creator_user_id:r.targetUserId,organization_id:null,status:'DRAFT',currency_code:''})
  const members:{id:string;userId:string;role:string}[]=await m.query(`SELECT id,user_id AS "userId",organization_role AS role FROM public.organization_member WHERE organization_id=$1 AND joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp()) ORDER BY user_id,id FOR UPDATE`,[r.organizationId])
  const requester=members.find(v=>v.userId===r.requestedBy),target=members.find(v=>v.userId===r.targetUserId)
  if(requester?.role!=='OWNER')throw new ConflictException('El solicitante ya no es propietario.')
  if(target?.role==='OWNER'||r.kind==='REPRESENTATIVE'&&target?.role==='LEGAL_REPRESENTATIVE')throw new ConflictException('El destinatario ya tiene la representación solicitada.')
  const terminate=async(member:{id:string})=>{await m.query('UPDATE public.organization_member SET left_at=clock_timestamp() WHERE id=$1',[member.id]);await recordAudit(m,actor,'UPDATE','organization_member',member.id)}
  const add=async(userId:string,role:string)=>{const id=randomUUID();await m.query('INSERT INTO public.organization_member(id,organization_id,user_id,organization_role,invited_by,joined_at) VALUES($1,$2,$3,$4,$5,clock_timestamp())',[id,r.organizationId,userId,role,actor]);await recordAudit(m,actor,'CREATE','organization_member',id)}
  if(target)await terminate(target)
  if(r.kind==='OWNERSHIP'){await terminate(requester);await add(r.requestedBy,'MEMBER')}
  await add(r.targetUserId,r.kind==='OWNERSHIP'?'OWNER':'LEGAL_REPRESENTATIVE')
  const cases:{id:string;status:string;submitted_data:unknown}[]=await m.query(`SELECT v.id,v.status,v.submitted_data FROM public.verification v JOIN public.verification_type t ON t.id=v.verification_type_id WHERE v.organization_id=$1 AND t.code IN ('KYB_LEGAL','KYB_REPRESENTATIVE') AND v.status<>'EXPIRED' ORDER BY v.id FOR UPDATE OF v`,[r.organizationId])
  for(const v of cases){
   await m.query(`INSERT INTO brotar_extension.verification_revision(id,verification_id,actor_user_id,operation,snapshot) VALUES($1,$2,$3,'REPRESENTATION_CHANGE',$4::jsonb)`,[randomUUID(),v.id,actor,JSON.stringify({status:v.status,submission:v.submitted_data,reason:why,requestId:r.id})])
   await m.query(`UPDATE public.verification SET status='EXPIRED',expires_at=clock_timestamp() WHERE id=$1`,[v.id]);await recordAudit(m,actor,'STATUS_CHANGE','verification',v.id)
  }
  await partyHistory(m,actor,'ORGANIZATION',r.organizationId,{expectedVersion:String(r.organizationVersion),reason:why,confirmed:true},'REPRESENTATION_APPROVE',{before:members,requestId:r.id,kind:r.kind,targetUserId:r.targetUserId,role:r.kind==='OWNERSHIP'?'OWNER':'LEGAL_REPRESENTATIVE',representationChanged:true})
 }
 async act(actor:string,id:string,input:RepresentationActionDto,admin:boolean){
  this.enabled();assertMutation({...input,expectedVersion:String(input.expectedVersion)})
  if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new BadRequestException('Confirma la versión actual de la solicitud.')
  const administrative=['APPROVE','REJECT'].includes(input.action)
  if(administrative!==admin||!['ACCEPT','DECLINE','CANCEL','APPROVE','REJECT'].includes(input.action))throw new ForbiddenException('Esta acción no corresponde a tu bandeja.')
  return this.database.connection().transaction(async m=>{
   const [subject]=await m.query('SELECT organization_id FROM brotar_extension.representation_request WHERE id=$1',[id]);if(!subject)throw new NotFoundException('Solicitud no disponible.')
   const [org]=await m.query('SELECT id,status,deleted_at FROM public.organization WHERE id=$1 FOR UPDATE',[subject.organization_id])
   const [r]:RequestRow[]=await m.query(`SELECT ${projection} ${joined} WHERE r.id=$1 FOR UPDATE OF r`,[id]);if(!r)throw new NotFoundException('Solicitud no disponible.')
   await this.accountLocks(m,[actor,r.requestedBy,r.targetUserId]);await partyActor(m,actor,admin)
   if(!admin&&actor!==r.targetUserId&&actor!==r.requestedBy)throw new ForbiddenException('Solo los participantes pueden responder esta solicitud.')
   if(!['REQUESTED','ACCEPTED'].includes(r.status)||r.version!==input.expectedVersion)throw new ConflictException('La solicitud cambió. Recarga antes de confirmar.')
   if(input.action==='ACCEPT'||input.action==='DECLINE'){
    if(actor!==r.targetUserId)throw new ForbiddenException('Solo el destinatario puede aceptar o declinar.')
    if(r.status!=='REQUESTED')throw new ConflictException('La solicitud ya fue respondida.')
   }
   if(input.action==='CANCEL'&&(actor!==r.requestedBy||!await this.isOwner(m,r.organizationId,actor)))throw new ForbiddenException('Solo el solicitante que conserva la propiedad puede cancelar.')
   if(input.action==='APPROVE'||input.action==='ACCEPT'){
    await partyActor(m,r.requestedBy,false);await partyActor(m,r.targetUserId,false)
    if(!org||org.deleted_at||['SUSPENDED','CLOSED'].includes(org.status)||!await this.isOwner(m,r.organizationId,r.requestedBy))throw new ConflictException('La organización o su solicitante ya no permiten aprobar esta representación.')
    await partyVersion(m,'ORGANIZATION',r.organizationId,String(r.organizationVersion))
   }
   if(input.action==='APPROVE'){
    if(!await this.independent(m,actor,r))throw new ForbiddenException('La aprobación requiere administración independiente, sin vínculo institucional ni participación en la solicitud.')
    if(r.status!=='ACCEPTED')throw new ConflictException('El destinatario debe aceptar antes de la aprobación.')
   }
   await setAuditActor(m,actor)
   if(input.action==='APPROVE')await this.apply(m,actor,r,input.reason.trim())
   // Locks do not freeze wall-clock role expiry; recheck participants after potentially blocking KYC/document/member reads.
   await partyActor(m,actor,admin)
   if(input.action==='APPROVE'||input.action==='ACCEPT'){await partyActor(m,r.requestedBy,false);await partyActor(m,r.targetUserId,false)}
   const status={ACCEPT:'ACCEPTED',DECLINE:'DECLINED',CANCEL:'CANCELLED',APPROVE:'APPROVED',REJECT:'REJECTED'}[input.action]
   await m.query(`UPDATE brotar_extension.representation_request SET status=$2,version=version+1,accepted_at=CASE WHEN $2='ACCEPTED' THEN clock_timestamp() ELSE accepted_at END,accepted_by=CASE WHEN $2='ACCEPTED' THEN $3::uuid ELSE accepted_by END,decided_at=CASE WHEN $2<>'ACCEPTED' THEN clock_timestamp() ELSE NULL END,decided_by=CASE WHEN $2<>'ACCEPTED' THEN $3::uuid ELSE NULL END,decision_reason=CASE WHEN $2<>'ACCEPTED' THEN $4 ELSE NULL END WHERE id=$1`,[id,status,actor,input.reason.trim()])
   await m.query(`INSERT INTO brotar_extension.representation_event(request_id,version,action,actor_id,reason) VALUES($1,$2,$3,$4,$5)`,[id,r.version+1,input.action,actor,input.reason.trim()])
   await recordAudit(m,actor,'UPDATE','organization',r.organizationId)
   return this.read(m,actor,id,admin,true)
  })
 }
}
