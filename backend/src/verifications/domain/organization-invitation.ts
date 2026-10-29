import {ConflictException} from '@nestjs/common'
export function requiresInvitation(action:string,role?:string){return action==='ADD'||action==='CHANGE'&&role==='ADMIN'}
export function assertInvitationPending(row:{status:string;version:number;expired:boolean},expected:string){if(row.status!=='PENDING'||row.expired||String(row.version)!==expected)throw new ConflictException('La invitación venció, cambió o ya fue resuelta. Actualiza antes de continuar.')}
