import {textError} from '../../campaigns/domain/input-policy'
import {BadRequestException,ConflictException,ForbiddenException} from '@nestjs/common'
import {Equals,IsBoolean,IsString,Length} from 'class-validator'
import type {EntityManager} from 'typeorm'
export class PartyMutationDto {
 @IsString() @Length(1,100) expectedVersion!:string
 @IsString() @Length(10,1000) reason!:string
 @IsBoolean() @Equals(true) confirmed!:boolean
}
export function assertMutation(input:PartyMutationDto){if(input.confirmed!==true || typeof input.reason!=='string'||textError(input.reason,10,1000))throw new BadRequestException('Confirma el cambio y explica su motivo (10 a 1000 caracteres de texto, sin HTML ni controles).')}
export async function partyVersion(m:EntityManager,kind:string,id:string,expected:string){
 await m.query('INSERT INTO brotar_extension.party_state(kind,subject_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[kind,id])
 const [state]=await m.query('SELECT version::text,restore_status FROM brotar_extension.party_state WHERE kind=$1 AND subject_id=$2 FOR UPDATE',[kind,id])
 if(state.version!==expected)throw new ConflictException('Los datos cambiaron. Recarga y confirma de nuevo antes de guardar.')
 return state as {version:string;restore_status:string|null}
}
export async function partyHistory(m:EntityManager,actor:string,kind:string,id:string,input:PartyMutationDto,action:string,snapshot:unknown){
 await m.query('UPDATE brotar_extension.party_state SET version=version+1 WHERE kind=$1 AND subject_id=$2',[kind,id])
 const [state]=await m.query('SELECT version FROM brotar_extension.party_state WHERE kind=$1 AND subject_id=$2',[kind,id])
 await m.query('INSERT INTO brotar_extension.party_history(kind,subject_id,version,actor_id,action,reason,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[kind,id,state.version,actor,action,input.reason.trim(),JSON.stringify(snapshot)])
}
export async function partyActor(m:EntityManager,id:string,admin:boolean,write=true){
 const roles:{code:string}[]=await m.query(`SELECT r.code FROM public.app_user u JOIN public.user_role ur ON ur.user_id=u.id JOIN public.role r ON r.id=ur.role_id
 WHERE u.id=$1 AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
 AND ur.granted_at<=clock_timestamp() AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())`,[id])
 if((admin ? !roles.some(r=>r.code==='ADMIN'||!write&&r.code==='AUDITOR') : !roles.some(r=>r.code==='REGISTERED_USER'))||write&&roles.some(r=>r.code==='AUDITOR'))throw new ForbiddenException('Tus permisos vigentes no permiten este cambio; auditoría conserva solo lectura.')
}

export async function partyEvents(m:EntityManager,kind:string,id:string){
 const rows:{action:string;reason:string;version:number;recordedAt:string;actorId:string;snapshot:{before?:Record<string,unknown>|{userId:string;role:string}[];after?:Record<string,unknown>;targetUserId?:string;role?:string}}[]=await m.query(`SELECT action,reason,version,recorded_at AS "recordedAt",actor_id AS "actorId",snapshot FROM brotar_extension.party_history WHERE kind=$1 AND subject_id=$2 ORDER BY version DESC LIMIT 100`,[kind,id])
 const labels:Record<string,string>={firstName:'Nombre',lastName:'Apellido',displayName:'Nombre público',city:'Ciudad de contacto',websiteUrl:'Sitio de contacto',status:'Estado'}
 return rows.map(({snapshot,...event})=>{
  const changes:string[]=[]
  if(kind==='USER'&&snapshot.after&&snapshot.before&&!Array.isArray(snapshot.before)){
   for(const [key,label] of Object.entries(labels))if(key in snapshot.after&&snapshot.after[key]!==snapshot.before[key])changes.push(`${label}: ${String(snapshot.before[key]??'—')} → ${String(snapshot.after[key]??'—')}`)
  }else if(kind==='ORGANIZATION'){
   const previous=Array.isArray(snapshot.before)?snapshot.before.find(row=>row.userId===snapshot.targetUserId)?.role:undefined
   changes.push(`Cuenta: ${snapshot.targetUserId??''}. Rol: ${previous??'sin vínculo vigente'} → ${event.action==='REMOVE'?'membresía finalizada':event.action==='TRANSFER'?'OWNER':snapshot.role??''}`)
   if(event.action==='TRANSFER')changes.push('El propietario que transfiere pasa a MEMBER.')
  }
  return {...event,changes}
 })
}
