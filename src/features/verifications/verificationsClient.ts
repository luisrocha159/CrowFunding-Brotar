import {LEGAL_VERSION} from '../legal/legalClient'
import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../access/session/sessionClient'
import { approvedPolicy } from '../../../backend/src/verifications/domain/verification'
import type { VerificationDetail, VerificationSummary, VerificationType, PayoutSummary, VerificationDocument } from '../../../backend/src/verifications/application/verifications'
import type { VerificationSubmission } from '../../../backend/src/verifications/domain/verification'
import type { Organization, OrganizationInput } from '../organizations/organizationsClient'
export type { VerificationDetail, VerificationSummary, VerificationType, PayoutSummary, VerificationSubmission }
export interface ManagedOrganization extends Organization { version: string; canEdit: boolean }
const object = (value: unknown): value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value)
const strings = (value: Record<string,unknown>, keys: string[]) => keys.every(key => typeof value[key]==='string')
function summary(value: unknown): VerificationSummary {
  if (!object(value) || !strings(value,['id','typeName','typeCode','status','updatedAt']) || !(value.organizationId===null || typeof value.organizationId==='string') || !(value.organizationName===null || typeof value.organizationName==='string')) throw new SessionError(0)
  return value as unknown as VerificationSummary
}
function documents(value: unknown): value is VerificationDocument[] { return Array.isArray(value) && value.every(doc => object(doc) && strings(doc,['fileId','documentTypeId','label','originalName']) && (doc.reviewNotes===null || typeof doc.reviewNotes==='string') && (doc.isValid===null || typeof doc.isValid==='boolean')) }
function receipt(value:unknown){return value===undefined||value===null||object(value)&&typeof value.id==='string'&&/^[a-f0-9-]{36}$/i.test(value.id)&&typeof value.version==='string'&&typeof value.hash==='string'&&/^[a-f0-9]{64}$/.test(value.hash)}
function stringMap(value: unknown): boolean { return object(value) && Object.values(value).every(item => typeof item==='string') }
export function verificationDetailFrom(value: unknown): VerificationDetail {
  summary(value)
  if (!object(value) || typeof value.version!=='string' || !stringMap(value.fields) || !documents(value.documents) || !Array.isArray(value.history) || !Array.isArray(value.revisions)
    || !value.history.every(event => object(event) && strings(event,['status','at']) && (event.reason===null || typeof event.reason==='string'))
    || !value.revisions.every(revision => object(revision) && strings(revision,['id','operation','recordedAt','policyVersion']) && stringMap(revision.fields) && documents(revision.documents) && receipt(revision.legalReceipt))
    || !['resultNotes','rejectionReason','submittedAt'].every(key => value[key]===null || typeof value[key]==='string')
    || !(value.policy===null || (object(value.policy) && approvedPolicy(value.policy as unknown as VerificationType['policy'])))) throw new SessionError(0)
  return value as unknown as VerificationDetail
}
const detail=verificationDetailFrom
async function read(path: string, signal?: AbortSignal) { return readJson(await requestApi(path,{ signal })) }
function array<T>(value: unknown, parse: (value: unknown) => T): T[] { if (!Array.isArray(value)) throw new SessionError(0); return value.map(parse) }
export async function verificationTypes(signal?: AbortSignal): Promise<VerificationType[]> {
  return array(await read('/api/me/verifications/types',signal), value => {
    if (!object(value) || !strings(value,['id','code','name']) || !['USER','ORGANIZATION'].includes(value.appliesTo as string) || !(value.policy===null || (object(value.policy) && approvedPolicy(value.policy as unknown as VerificationType['policy'])))) throw new SessionError(0)
    return value as unknown as VerificationType
  })
}
export async function myVerifications(signal?: AbortSignal) { return array(await read('/api/me/verifications',signal),summary) }
export async function verificationDetail(id: string, signal?: AbortSignal) { return detail(await read(`/api/me/verifications/${encodeURIComponent(id)}`,signal)) }
export async function startVerification(verificationTypeId: string, organizationId: string | null) { return detail(await readJson(await requestApi('/api/me/verifications',{ method:'POST',body:{ verificationTypeId,...(organizationId ? { organizationId } : {}) } }))) }
export async function saveVerification(id: string, expectedVersion: string, input: VerificationSubmission, submit: boolean) { return detail(await readJson(await requestApi(`/api/me/verifications/${encodeURIComponent(id)}`,{ method:'PUT',body:{ expectedVersion,...input,legalVersion:LEGAL_VERSION,submit } }))) }
export async function payoutAccounts(signal?: AbortSignal): Promise<PayoutSummary[]> {
  return array(await read('/api/me/verifications/payout-accounts',signal), value => {
    if (!object(value) || !strings(value,['id','accountHolderName','currency','status']) || !['organizationId','bankName','last4'].every(key => value[key]===null || typeof value[key]==='string')) throw new SessionError(0)
    return value as unknown as PayoutSummary
  })
}
function organization(value: unknown): ManagedOrganization {
  if (!object(value) || !strings(value,['id','legalName','tradeName','organizationTypeId','contactEmail','contactPhone','status','typeName','membershipRole','version']) || typeof value.canEdit!=='boolean') throw new SessionError(0)
  return value as unknown as ManagedOrganization
}
export async function managedOrganizations(signal?: AbortSignal) { return array(await read('/api/me/organizations',signal),organization) }
export async function saveOrganization(id: string, expectedVersion: string, input: OrganizationInput) { return organization(await readJson(await requestApi(`/api/me/organizations/${encodeURIComponent(id)}`,{ method:'PUT',body:{ ...input,expectedVersion } }))) }
export function verificationDocumentUrl(caseId: string, fileId: string) { return `/api/me/verifications/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(fileId)}` }
export function verificationStatus(status: string) { return ({NOT_STARTED:'Sin enviar',PENDING:'Enviada',IN_REVIEW:'En revisión',REQUIRES_INFO:'Requiere información',APPROVED:'Aprobada',REJECTED:'Rechazada',EXPIRED:'Vencida'} as Record<string,string>)[status] ?? status }
