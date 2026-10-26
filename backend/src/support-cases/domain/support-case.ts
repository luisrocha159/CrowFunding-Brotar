import { createHash } from 'node:crypto'
import {textError} from '../../campaigns/domain/input-policy'

export const SUPPORT_CATEGORIES = ['UNRECOGNIZED_PAYMENT', 'REFUND_REQUEST', 'INCORRECT_INFORMATION', 'REWARD_NOT_RECEIVED', 'PROJECT_NOT_EXECUTED', 'OTHER'] as const
export type SupportCategory = typeof SUPPORT_CATEGORIES[number]
/** A financial or reward claim must identify the reporter's own contribution. */
export const SUPPORT_CATEGORIES_REQUIRING_CONTRIBUTION: readonly SupportCategory[] = ['UNRECOGNIZED_PAYMENT', 'REFUND_REQUEST', 'REWARD_NOT_RECEIVED']
export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_RESPONSE' | 'RESOLVED' | 'CLOSED'
export class SupportInvalid extends Error {}
export class SupportConflict extends Error {}
export interface SupportInput { requestId: string; campaignId: string | null; contributionId: string | null; category: SupportCategory; subject: string; description: string; evidenceFileIds: string[]; confirmed: true }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function supportId(value: unknown): value is string { return typeof value === 'string' && uuid.test(value) }
export function normalizeSupportInput(value: unknown): SupportInput {
  if (!value || typeof value !== 'object') throw new SupportInvalid()
  const input = value as Record<string, unknown>
  const campaignId = input.campaignId ?? null; const contributionId = input.contributionId ?? null
  if (!supportId(input.requestId) || (!campaignId && !contributionId) || (campaignId !== null && !supportId(campaignId)) || (contributionId !== null && !supportId(contributionId))
    || !SUPPORT_CATEGORIES.includes(input.category as SupportCategory) || input.confirmed !== true) throw new SupportInvalid()
  if (SUPPORT_CATEGORIES_REQUIRING_CONTRIBUTION.includes(input.category as SupportCategory) && contributionId === null) throw new SupportInvalid()
  if (typeof input.subject !== 'string' || textError(input.subject,5,200)
    || typeof input.description !== 'string' || textError(input.description,20,10000)) throw new SupportInvalid()
  if (!Array.isArray(input.evidenceFileIds) || input.evidenceFileIds.length > 10 || !input.evidenceFileIds.every(supportId) || new Set(input.evidenceFileIds).size !== input.evidenceFileIds.length) throw new SupportInvalid()
  return { requestId: input.requestId, campaignId: campaignId as string | null, contributionId: contributionId as string | null, category: input.category as SupportCategory,
    subject: input.subject.trim(), description: input.description.trim(), evidenceFileIds: input.evidenceFileIds as string[], confirmed: true }
}
export function supportFingerprint(input: SupportInput): string {
  return createHash('sha256').update(JSON.stringify({ campaignId: input.campaignId, contributionId: input.contributionId, category: input.category, subject: input.subject, description: input.description, evidenceFileIds: input.evidenceFileIds })).digest('hex')
}
export function supportPage(value: unknown): number {
  if (value === undefined) return 1
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,4}$/.test(value) || Number(value) > 10000) throw new SupportInvalid()
  return Number(value)
}
