import { normalizeSupportInput, supportId, supportPage, SupportInvalid, type SupportInput, type SupportStatus } from '../domain/support-case'
import {textError} from '../../campaigns/domain/input-policy'
export class SupportMissing extends Error {}
export class SupportForbidden extends Error {}
export class SupportCampaignClosed extends Error {}
export interface SupportContext { campaignId: string; campaignTitle: string; contributionId: string | null; contributionReference: string | null; publicReport: boolean }
export interface SupportSummary { id: string; reference: string; category: string | null; subject: string; status: SupportStatus; createdAt: string; updatedAt: string; campaignId: string | null; contributionId: string | null }
export interface SupportDetail extends SupportSummary { description: string; evidence: { fileId: string; name: string; mimeType: string }[]; messages: { id: string; body: string; createdAt: string; from: 'you' | 'support' }[] }
export interface SupportPage { items: SupportSummary[]; total: number; page: number; pageSize: 20 }
export interface SupportAdminPage { items: (SupportSummary & { assignedTo: string | null })[]; total: number; page: number; pageSize: 20; assignees: { id: string; label: string }[] }
export interface SupportAdminDetail extends SupportSummary { description: string; messages: { id: string; body: string; createdAt: string }[]; events: { previousStatus: SupportStatus; status: SupportStatus; reason: string; recordedAt: string }[]; evidence: { fileId: string; name: string; mimeType: string }[] }
export interface SupportReceipt { id: string; reference: string; status: SupportStatus; createdAt: string }
export interface SupportRepository {
  list(userId: string, page: number): Promise<SupportPage>
  detail(userId: string, id: string): Promise<SupportDetail | null>
  context(userId: string, campaignId: string | null, contributionId: string | null): Promise<SupportContext | null>
  create(userId: string, input: SupportInput): Promise<SupportReceipt>
  adminList(page: number): Promise<SupportAdminPage>
  adminDetail(id: string): Promise<SupportAdminDetail | null>
  adminMessage(actor: string, id: string, body: string): Promise<void>
  adminTransition(actor: string, id: string, status: SupportStatus, reason: string): Promise<void>
  adminAssign(actor: string, id: string, assignee: string | null): Promise<void>
  adminEvidenceOwner(actor: string, id: string, fileId: string): Promise<string>
}
export class SupportCases {
  constructor(private readonly repository: SupportRepository) {}
  list(userId: string, page: unknown) { return this.repository.list(userId, supportPage(page)) }
  async detail(userId: string, id: string): Promise<SupportDetail> {
    if (!supportId(id)) throw new SupportInvalid()
    const result = await this.repository.detail(userId, id)
    if (!result) throw new SupportMissing()
    return result
  }
  async context(userId: string, campaignId?: string, contributionId?: string): Promise<SupportContext> {
    if ((!campaignId && !contributionId) || (campaignId && !supportId(campaignId)) || (contributionId && !supportId(contributionId))) throw new SupportInvalid()
    const result = await this.repository.context(userId, campaignId ?? null, contributionId ?? null)
    if (!result) throw new SupportMissing()
    return result
  }
  async create(userId: string, input: unknown) { return this.repository.create(userId, normalizeSupportInput(input)) }
  adminList(page: unknown) { return this.repository.adminList(supportPage(page)) }
  adminDetail(id: string) { return this.repository.adminDetail(id) }
  adminMessage(actor: string, id: string, body: unknown) {
    if (typeof body !== 'string' || textError(body,1,5000)) throw new SupportInvalid()
    return this.repository.adminMessage(actor, id, body.trim())
  }
  adminTransition(actor: string, id: string, status: unknown, reason: unknown) {
    if (!['IN_PROGRESS','AWAITING_RESPONSE','RESOLVED','CLOSED'].includes(status as string) || typeof reason !== 'string' || textError(reason,10,500)) throw new SupportInvalid()
    return this.repository.adminTransition(actor, id, status as SupportStatus, reason.trim())
  }
  adminAssign(actor: string, id: string, assignee: unknown) {
    if (assignee !== null && (typeof assignee !== 'string' || !supportId(assignee))) throw new SupportInvalid()
    return this.repository.adminAssign(actor, id, assignee)
  }
  adminEvidenceOwner(actor: string, id: string, fileId: string) { return this.repository.adminEvidenceOwner(actor, id, fileId) }
}
