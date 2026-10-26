import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { uploadFile, FILE_LIMITS } from '../files/fileClient'
import {textError} from '../../../backend/src/campaigns/domain/input-policy'
export const SUPPORT_TYPES = [
  ['UNRECOGNIZED_PAYMENT', 'Pago no reconocido'], ['REFUND_REQUEST', 'Consulta sobre devolución'], ['INCORRECT_INFORMATION', 'Información incorrecta'],
  ['REWARD_NOT_RECEIVED', 'Recompensa no recibida'], ['PROJECT_NOT_EXECUTED', 'Proyecto aparentemente no ejecutado'], ['OTHER', 'Otra incidencia']
] as const
const CONTRIBUTION_CATEGORIES = new Set(['UNRECOGNIZED_PAYMENT', 'REFUND_REQUEST', 'REWARD_NOT_RECEIVED'])
export const SUPPORT_STATES = { OPEN: 'Abierta', IN_PROGRESS: 'En atención', AWAITING_RESPONSE: 'Esperando respuesta', RESOLVED: 'Resuelta', CLOSED: 'Cerrada' } as const
export interface SupportContext { campaignId: string; campaignTitle: string; contributionId: string | null; contributionReference: string | null; publicReport: boolean }
export interface SupportSummary { id: string; reference: string; category: string | null; subject: string; status: keyof typeof SUPPORT_STATES; createdAt: string; updatedAt: string; campaignId: string | null; contributionId: string | null }
export interface SupportDetail extends SupportSummary { replyAllowed: boolean; description: string; evidence: { fileId: string; name: string; mimeType: string }[]; messages: { id: string; body: string; createdAt: string; from: 'you' | 'support' }[] }
export interface SupportReceipt { id: string; reference: string; status: keyof typeof SUPPORT_STATES; createdAt: string }
export interface SupportPage { items: SupportSummary[]; total: number; page: number; pageSize: 20 }
export interface SupportDraft { category: string; subject: string; description: string; confirmed: boolean }
export interface SupportInput extends SupportDraft { requestId: string; campaignId: string; contributionId: string | null; evidenceFileIds: string[] }
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
function receipt(value: unknown): SupportReceipt {
  if (!object(value) || !uuid(value.id) || typeof value.reference !== 'string' || !value.reference || !date(value.createdAt) || typeof value.status !== 'string' || !Object.hasOwn(SUPPORT_STATES, value.status)) throw new SessionError(0)
  return { id: value.id, reference: value.reference, status: value.status as keyof typeof SUPPORT_STATES, createdAt: value.createdAt }
}
function summary(value: unknown): SupportSummary {
  const base = receipt(value)
  if (!object(value) || typeof value.subject !== 'string' || !(value.category === null || typeof value.category === 'string') || !date(value.updatedAt)
    || !(value.campaignId === null || uuid(value.campaignId)) || !(value.contributionId === null || uuid(value.contributionId))) throw new SessionError(0)
  return { ...base, subject: value.subject, category: value.category, updatedAt: value.updatedAt, campaignId: value.campaignId, contributionId: value.contributionId }
}
export function supportDetailFrom(value: unknown): SupportDetail {
  const base = summary(value)
  if (!object(value) || typeof value.replyAllowed!=='boolean' || typeof value.description !== 'string' || !Array.isArray(value.evidence) || !Array.isArray(value.messages)) throw new SessionError(0)
  const evidence = value.evidence.map((file: unknown) => {
    if (!object(file) || !uuid(file.fileId) || typeof file.name !== 'string' || typeof file.mimeType !== 'string') throw new SessionError(0)
    return { fileId: file.fileId, name: file.name, mimeType: file.mimeType }
  })
  const messages = value.messages.map((message: unknown) => {
    if (!object(message) || !uuid(message.id) || typeof message.body !== 'string' || !date(message.createdAt) || (message.from !== 'you' && message.from !== 'support')) throw new SessionError(0)
    return { id: message.id, body: message.body, createdAt: message.createdAt, from: message.from as 'you' | 'support' }
  })
  return { ...base, replyAllowed:value.replyAllowed, description: value.description, evidence, messages }
}
export function supportInput(draft: SupportDraft, context: SupportContext, requestId: string, evidenceFileIds: string[]) {
  const errors: Partial<Record<keyof SupportDraft, string>> = {}
  if (!SUPPORT_TYPES.some(([key]) => key === draft.category)) errors.category = 'Elige el tipo de incidencia.'
  if (CONTRIBUTION_CATEGORIES.has(draft.category) && !context.contributionId) errors.category = 'Para reportar pagos, devoluciones o recompensas, vincula uno de tus aportes.'
  if (textError(draft.subject,5,200)) errors.subject = 'Escribe un asunto de 5 a 200 caracteres válidos.'
  if (textError(draft.description,20,10000)) errors.description = 'Describe el problema en 20 a 10000 caracteres válidos.'
  if (context.publicReport && !['INCORRECT_INFORMATION', 'PROJECT_NOT_EXECUTED'].includes(draft.category)) errors.category = 'Para reportar una campaña pública sin aporte, elige información incorrecta o problema de ejecución.'
  if (!draft.confirmed) errors.confirmed = 'Confirma los datos y la privacidad de los adjuntos.'
  return { errors, input: { ...draft, subject: draft.subject.trim(), description: draft.description.trim(), requestId, campaignId: context.campaignId, contributionId: context.contributionId, evidenceFileIds } }
}
export async function readSupportCases(page = 1, signal?: AbortSignal, send: typeof fetch = fetch): Promise<SupportPage> {
  const data = await readJson(await requestApi(`/api/me/support-cases?page=${page}`, { signal }, send))
  if (!object(data) || !Array.isArray(data.items) || !Number.isInteger(data.total) || Number(data.total) < 0 || !Number.isInteger(data.page) || Number(data.page) < 1 || data.pageSize !== 20) throw new SessionError(0)
  return { items: data.items.map(summary), total: data.total as number, page: data.page as number, pageSize: 20 }
}
export async function readSupportCase(id: string, signal?: AbortSignal, send: typeof fetch = fetch): Promise<SupportDetail> {
  return supportDetailFrom(await readJson(await requestApi(`/api/me/support-cases/${encodeURIComponent(id)}`, { signal }, send)))
}
export async function supportContext(campaignId: string | null, contributionId: string | null, signal?: AbortSignal, send: typeof fetch = fetch): Promise<SupportContext> {
  const params = new URLSearchParams()
  if (campaignId) params.set('campaignId', campaignId)
  if (contributionId) params.set('contributionId', contributionId)
  const data = await readJson(await requestApi(`/api/me/support-cases/context?${params}`, { signal }, send))
  if (!object(data) || !uuid(data.campaignId) || typeof data.campaignTitle !== 'string' || !(data.contributionId === null || uuid(data.contributionId))
    || !(data.contributionReference === null || typeof data.contributionReference === 'string') || typeof data.publicReport !== 'boolean') throw new SessionError(0)
  return { campaignId: data.campaignId, campaignTitle: data.campaignTitle, contributionId: data.contributionId, contributionReference: data.contributionReference, publicReport: data.publicReport }
}
export async function createSupportCase(input: SupportInput, signal?: AbortSignal, send: typeof fetch = fetch): Promise<SupportReceipt> {
  return receipt(await readJson(await requestApi('/api/me/support-cases', { method: 'POST', body: input, signal }, send)))
}
export const supportReplyError=(body:string)=>textError(body,20,5000)
export async function replySupportCase(id:string,requestId:string,body:string,signal?:AbortSignal,send:typeof fetch=fetch):Promise<void>{
  if(!uuid(id)||!uuid(requestId)||supportReplyError(body))throw new SessionError(400)
  const data=await readJson(await requestApi(`/api/me/support-cases/${encodeURIComponent(id)}/messages`,{method:'POST',body:{requestId,body:body.trim()},signal},send))
  if(!object(data)||data.ok!==true)throw new SessionError(0)
}
export async function uploadSupportEvidence(file: File, signal?: AbortSignal, send: typeof fetch = fetch) {
  if (!file.size || file.size > FILE_LIMITS.privateDocumentBytes || !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new SessionError(400)
  const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return uploadFile({ visibility: 'PRIVATE', purpose: 'SUPPORT_EVIDENCE', originalName: file.name, mimeType: file.type, contentBase64: btoa(binary) }, signal, send)
}
export function supportError(error: unknown): string {
  const status = error instanceof SessionError ? error.status : 0
  if (status === 400) return 'Revisa el tipo, la descripción, los archivos permitidos y la confirmación.'
  if (status === 403) return 'Tu cuenta no permite esta acción. Auditor conserva solo lectura.'
  if (status === 404) return 'El caso, la campaña, el aporte o una evidencia no está disponible para tu cuenta.'
  if (status === 409) return 'El caso cambió, está resuelto o la clave identifica otro contenido. Actualiza tus incidencias antes de repetir.'
  if (status === 429) return 'Alcanzaste el límite de solicitudes. Espera un minuto antes de reintentar.'
  return 'No se pudo confirmar la operación. Conserva los datos y reintenta; una misma solicitud no se registra dos veces.'
}
