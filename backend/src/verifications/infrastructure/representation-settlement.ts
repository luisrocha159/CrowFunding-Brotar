import {ConflictException} from '@nestjs/common'
import type {EntityManager} from 'typeorm'
/** Hold the organization parent before reading requests: proposal/decision takes FOR UPDATE. */
export async function assertRepresentationSettled(m:EntityManager,organizationId:string){
 await m.query('SELECT id FROM public.organization WHERE id=$1 FOR SHARE',[organizationId])
 if((await m.query(`SELECT id FROM brotar_extension.representation_request WHERE organization_id=$1 AND status IN ('REQUESTED','ACCEPTED') LIMIT 1`,[organizationId])).length)throw new ConflictException('La organización tiene una solicitud de representación pendiente. Resuélvela antes de continuar.')
}
