import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'

export const auditActions={CREATE:'Creación',UPDATE:'Actualización',DELETE:'Baja',READ:'Consulta',LOGIN:'Ingreso',LOGOUT:'Salida',STATUS_CHANGE:'Cambio de estado',APPROVE:'Aprobación',REJECT:'Rechazo',PAYMENT_EVENT:'Evento de pago',EXPORT:'Exportación'} as const
export type AuditSource='AUDIT' | 'STATUS'
export interface AuditFilters {source:AuditSource;actorId:string;entityId:string;entity:string;action:string;from:string;to:string}
export const emptyAuditFilters:AuditFilters={source:'AUDIT',actorId:'',entityId:'',entity:'',action:'',from:'',to:''}
export interface AuditEntry {id:string;actorId:string | null;actorRole:string | null;action:keyof typeof auditActions;entity:string;entityId:string | null;occurredAt:string;result:'APPLIED'|'UNSPECIFIED'|'RECORDED';fromStatus:string | null;toStatus:string | null}
export interface AuditPage {source:AuditSource;items:AuditEntry[];nextCursor:string | null}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const nullable=(value:unknown,pattern:RegExp)=>value===null || (typeof value==='string' && pattern.test(value))
const identifier=(value:unknown):value is string=>typeof value==='string' && /^[1-9]\d{0,18}$/.test(value) && BigInt(value)<=9223372036854775807n
export function auditPageFrom(value:unknown,source:AuditSource):AuditPage {
  if (!value || typeof value!=='object' || !('source' in value) || value.source!==source || !('items' in value) || !Array.isArray(value.items) || value.items.length>50 || !('nextCursor' in value)) throw new SessionError(0)
  for (const item of value.items as unknown[]) {
    if (!item || typeof item!=='object' || !('id' in item) || !identifier(item.id) || !('actorId' in item) || !nullable(item.actorId,uuid) || !('entityId' in item) || !nullable(item.entityId,uuid) ||
      !('actorRole' in item) || !nullable(item.actorRole,/^[A-Z][A-Z_]{0,59}$/) || !('action' in item) || typeof item.action!=='string' || !Object.hasOwn(auditActions,item.action) ||
      !('entity' in item) || typeof item.entity!=='string' || !/^[a-z][a-z_]{0,79}$/.test(item.entity) || !('occurredAt' in item) || typeof item.occurredAt!=='string' || !/^\d{4}-\d{2}-\d{2}T/.test(item.occurredAt) || !Number.isFinite(Date.parse(item.occurredAt)) ||
      !('result' in item) || typeof item.result!=='string' || !['APPLIED','UNSPECIFIED','RECORDED'].includes(item.result) || !('fromStatus' in item) || !nullable(item.fromStatus,/^[A-Z][A-Z_]{0,39}$/) || !('toStatus' in item) || !nullable(item.toStatus,/^[A-Z][A-Z_]{0,39}$/)) throw new SessionError(0)
  }
  const items=value.items as AuditEntry[]
  if (new Set(items.map(item=>item.id)).size!==items.length || items.some((item,index)=>index>0 && BigInt(item.id)>=BigInt(items[index-1]!.id)) ||
    !(value.nextCursor===null || (identifier(value.nextCursor) && value.nextCursor===items.at(-1)?.id))) throw new SessionError(0)
  return {source,items,nextCursor:value.nextCursor}
}
export function auditQuery(filters:AuditFilters,cursor?:string):string {
  const query=new URLSearchParams({source:filters.source})
  for (const key of ['actorId','entityId','entity','action','from','to'] as const) if (filters[key]) query.set(key,filters[key])
  if (cursor) query.set('cursor',cursor)
  return query.toString()
}
export async function auditPage(filters:AuditFilters,cursor?:string,signal?:AbortSignal):Promise<AuditPage> {
  return auditPageFrom(await readJson(await requestApi(`/api/admin/audit?${auditQuery(filters,cursor)}`,{signal})),filters.source)
}
