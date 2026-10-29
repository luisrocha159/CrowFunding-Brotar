import {ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
import {DatabaseService} from '../../shared/infrastructure/database/database.service'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import {assertMutation,partyActor,partyHistory,type PartyMutationDto} from './party-mutations'
import {assertRepresentationSettled} from './representation-settlement'
import {assertInvitationPending} from '../domain/organization-invitation'
import {randomUUID} from 'node:crypto'
export async function expireInvitations(m:EntityManager,org:string){
 const rows=await m.query(`WITH expired AS (UPDATE brotar_extension.organization_invitation SET status='EXPIRED',version=version+1,resolved_at=clock_timestamp() WHERE organization_id=$1 AND status='PENDING' AND expires_at<=clock_timestamp() RETURNING id,version,invited_by) SELECT * FROM expired`,[org])
 for(const row of rows)await m.query(`INSERT INTO brotar_extension.organization_invitation_event(invitation_id,version,action,actor_id,reason) VALUES($1,$2,'EXPIRE',$3,'Venció el plazo de siete días sin aceptación.')`,[row.id,row.version,row.invited_by])
}
export async function invalidateMembershipVerification(m:EntityManager,actor:string,id:string,why:string){
 const cases=await m.query(`SELECT v.id,v.status,v.submitted_data FROM public.verification v JOIN public.verification_type t ON t.id=v.verification_type_id WHERE v.organization_id=$1 AND t.code IN ('KYB_LEGAL','KYB_REPRESENTATIVE') AND v.status IN ('PENDING','IN_REVIEW','APPROVED') FOR UPDATE OF v`,[id])
 for(const row of cases){await m.query(`INSERT INTO brotar_extension.verification_revision(id,verification_id,actor_user_id,operation,snapshot) VALUES($1,$2,$3,'REPRESENTATION_CHANGE',$4::jsonb)`,[randomUUID(),row.id,actor,JSON.stringify({status:row.status,submission:row.submitted_data,reason:why})]);await m.query(`UPDATE public.verification SET status='EXPIRED',expires_at=clock_timestamp() WHERE id=$1`,[row.id]);await recordAudit(m,actor,'STATUS_CHANGE','verification',row.id)}
}
const current=`joined_at<=clock_timestamp() AND (left_at IS NULL OR left_at>clock_timestamp())`
const visible=`(i.target_user_id=$1 OR i.invited_by=$1 OR EXISTS(SELECT 1 FROM public.organization_member om WHERE om.organization_id=i.organization_id AND om.user_id=$1 AND om.organization_role IN ('OWNER','ADMIN','LEGAL_REPRESENTATIVE') AND om.${current.replace(' AND (left_at',' AND (om.left_at').replace(' OR left_at',' OR om.left_at')}))`
const selection=`i.id,i.organization_id AS "organizationId",o.legal_name AS "organizationName",i.target_user_id AS "targetUserId",i.invited_by AS "invitedBy",i.role,i.version,i.reason,i.created_at::text AS "createdAt",i.expires_at::text AS "expiresAt",i.resolved_at::text AS "resolvedAt",CASE WHEN i.status='PENDING' AND i.expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE i.status END AS status,i.status='PENDING' AND i.expires_at<=clock_timestamp() AS expired`
@Injectable()
export class OrganizationInvitations {
 constructor(private readonly database:DatabaseService){}
 private async actions(m:EntityManager,actor:string,row:{status:string;targetUserId:string;invitedBy:string;organizationId:string}){
  if(row.status!=='PENDING')return[]
  try{await partyActor(m,actor,false)}catch(e){if(e instanceof ForbiddenException)return[];throw e}
  if(row.targetUserId===actor)return ['ACCEPT','DECLINE']
  const [manager]=await m.query(`SELECT organization_role AS role FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND ${current}`,[row.organizationId,actor])
  return actor===row.invitedBy||manager&&['OWNER','ADMIN','LEGAL_REPRESENTATIVE'].includes(manager.role)?['CANCEL']:[]
 }
 async list(actor:string,page:number,org?:string){return this.database.connection().transaction('REPEATABLE READ',async m=>{
  await partyActor(m,actor,false,false)
  if(org){const [manager]=await m.query(`SELECT id FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND organization_role IN ('OWNER','ADMIN','LEGAL_REPRESENTATIVE') AND ${current}`,[org,actor]);if(!manager)throw new NotFoundException('Organización no disponible.')}
  const where=`${visible} AND o.deleted_at IS NULL AND ($2::uuid IS NULL OR i.organization_id=$2)`,params=[actor,org??null],count=await m.query(`SELECT count(*)::int AS total FROM brotar_extension.organization_invitation i JOIN public.organization o ON o.id=i.organization_id WHERE ${where}`,params)
  const rows=await m.query(`SELECT ${selection} FROM brotar_extension.organization_invitation i JOIN public.organization o ON o.id=i.organization_id WHERE ${where} ORDER BY i.created_at DESC,i.id LIMIT 20 OFFSET $3`,[...params,(page-1)*20])
  const items=[];for(const row of rows){const events=await m.query(`SELECT version,action,actor_id AS "actorId",reason,recorded_at::text AS "recordedAt" FROM brotar_extension.organization_invitation_event WHERE invitation_id=$1 ORDER BY version`,[row.id]);items.push({...row,allowedActions:await this.actions(m,actor,row),events})}
  return{items,total:count[0].total,page,pageSize:20}
 })}
 async act(actor:string,id:string,input:PartyMutationDto&{action:'ACCEPT'|'DECLINE'|'CANCEL'}){
  assertMutation(input)
  const result=await this.database.connection().transaction(async m=>{
   const [found]=await m.query('SELECT organization_id FROM brotar_extension.organization_invitation WHERE id=$1',[id]);if(!found)throw new NotFoundException('Invitación no disponible.')
   const [org]=await m.query('SELECT id,status FROM public.organization WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[found.organization_id]);if(!org)throw new NotFoundException('Organización no disponible.')
   const [i]=await m.query(`SELECT ${selection},i.current_member_id AS "currentMemberId" FROM brotar_extension.organization_invitation i JOIN public.organization o ON o.id=i.organization_id WHERE i.id=$2 AND ${visible} FOR UPDATE OF i`,[actor,id]);if(!i)throw new NotFoundException('Invitación no disponible.')
   try{await m.query('SELECT id FROM public.app_user WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE NOWAIT',[[...new Set([actor,i.invitedBy,i.targetUserId])].sort()])}catch(e){if(e&&typeof e==='object'&&'code'in e&&e.code==='55P03')throw new ConflictException('Una cuenta está ocupada. Actualiza antes de continuar.');throw e}
   await partyActor(m,actor,false)
   if(i.expired){await expireInvitations(m,org.id);return{expired:true}}
   assertInvitationPending(i,input.expectedVersion)
   if(!(await this.actions(m,actor,i)).includes(input.action))throw new ForbiddenException('Solo el destinatario acepta o rechaza; el remitente o la gestión cancela.')
   if(['SUSPENDED','CLOSED'].includes(org.status)&&input.action==='ACCEPT')throw new ConflictException('La organización no permite incorporar colaboradores.')
   await setAuditActor(m,actor)
   if(input.action==='ACCEPT'){
    await assertRepresentationSettled(m,org.id);await partyActor(m,i.invitedBy,false);await partyActor(m,i.targetUserId,false)
    const [inviter]=await m.query(`SELECT organization_role AS role FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND ${current}`,[org.id,i.invitedBy])
    if(!inviter||!(i.role==='ADMIN'?['OWNER']:['OWNER','ADMIN','LEGAL_REPRESENTATIVE']).includes(inviter.role))throw new ConflictException('El remitente ya no tiene autoridad para conceder ese rol. Solicita una nueva invitación.')
    const targets=await m.query(`SELECT id,organization_role AS role FROM public.organization_member WHERE organization_id=$1 AND user_id=$2 AND ${current} FOR UPDATE`,[org.id,actor]),target=targets[0]
    if(targets.length>1||(i.currentMemberId?target?.id!==i.currentMemberId||target.role!=='MEMBER':Boolean(target)))throw new ConflictException('La membresía cambió desde la invitación. Cancélala y solicita una nueva.')
    // Recheck after the membership lock; an expired account must not acquire authority.
    await partyActor(m,actor,false);await partyActor(m,i.invitedBy,false)
    if(target){await m.query('UPDATE public.organization_member SET left_at=clock_timestamp() WHERE id=$1',[target.id]);await recordAudit(m,actor,'UPDATE','organization_member',target.id)}
    const member=randomUUID();await m.query('INSERT INTO public.organization_member(id,organization_id,user_id,organization_role,invited_by,joined_at) VALUES($1,$2,$3,$4,$5,clock_timestamp())',[member,org.id,actor,i.role,i.invitedBy]);await recordAudit(m,actor,'CREATE','organization_member',member)
    if(target)await invalidateMembershipVerification(m,actor,org.id,input.reason)
    await m.query(`INSERT INTO brotar_extension.party_state(kind,subject_id) VALUES('ORGANIZATION',$1) ON CONFLICT DO NOTHING`,[org.id]);await partyHistory(m,actor,'ORGANIZATION',org.id,input,'ACCEPT_INVITATION',{before:targets,targetUserId:actor,role:i.role,invitationId:id})
   }
   await partyActor(m,actor,false);if(input.action==='ACCEPT')await partyActor(m,i.invitedBy,false)
   const status=input.action==='ACCEPT'?'ACCEPTED':input.action==='DECLINE'?'DECLINED':'CANCELLED'
   await m.query('UPDATE brotar_extension.organization_invitation SET status=$2,version=version+1,resolved_at=clock_timestamp() WHERE id=$1',[id,status])
   await m.query('INSERT INTO brotar_extension.organization_invitation_event(invitation_id,version,action,actor_id,reason) VALUES($1,$2,$3,$4,$5)',[id,i.version+1,input.action,actor,input.reason.trim()]);await recordAudit(m,actor,'UPDATE','organization',org.id)
   return{id,status,version:i.version+1}
  })
  if('expired'in result)throw new ConflictException('La invitación venció tras siete días. Solicita una nueva.')
  return result
 }
}
