import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
export const contributionStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] as const
export type ContributionStatus = typeof contributionStatuses[number]
export interface ContributionFilters { page: number; status?: string; from?: string; to?: string }
export interface PaymentRecord { id: string; amount: string; currency: string; status: string; method: string | null; sandbox: boolean; demo?:boolean; createdAt: string; confirmedAt: string | null }
export interface ContributionItem {
  id: string; reference: string; amount: string; currency: string; status: ContributionStatus; createdAt: string; confirmedAt: string | null
  campaign: { id: string; title: string; slug: string | null; status: string }; payments: PaymentRecord[]; receiptAvailable: boolean
}
export interface ContributionPage { items: ContributionItem[]; total: number; page: number; pageSize: 20 }
export interface ContributionDetail extends ContributionItem {
  reward: { id: string; title: string } | null
  refunds: { id: string; paymentId: string; amount: string; currency: string; status: string; requestedAt: string; completedAt: string | null }[]
  disputes: { id: string; reference: string; status: string; createdAt: string }[]
  supportCases: { id: string; reference: string; subject: string; status: string; createdAt: string }[]
}
export interface SponsorSummary {
  contributionCount: number; campaignsSupported: number; statusCounts: { status: ContributionStatus; count: number }[]
  totals: { currency: string; grossConfirmed: string; refunded: string; disputed: string }[]
  demoTotals?: { currency: string; grossConfirmed: string; refunded: string; disputed: string }[]
  sandboxPaymentCount: number; favorites: number; following: number; openSupportCases: number; openDisputes: number; pendingRefunds: number
}
export interface Receipt {
  kind: 'INFORMATIONAL_PAYMENT_RECORD'; contributionId: string; reference: string; paymentId: string; campaignTitle: string
  amount: string; currency: string; confirmedAt: string; method: string | null; sandbox: boolean; verificationPath: string
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const decimal = (v: unknown): v is string => typeof v === 'string' && /^\d{1,20}\.\d{2}$/.test(v)
const currency = (v: unknown) => typeof v === 'string' && /^[A-Z]{3}$/.test(v)
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v))
const nullableDate = (v: unknown) => v === null || date(v)
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0
const oneOf = (v: unknown, options: readonly string[]) => typeof v === 'string' && options.includes(v)
function payment(v: unknown): v is PaymentRecord {
  return object(v) && text(v.id) && decimal(v.amount) && currency(v.currency) && oneOf(v.status, ['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'REFUNDED', 'DISPUTED']) &&
    (v.method === null || text(v.method)) && typeof v.sandbox === 'boolean' && (v.demo===undefined || typeof v.demo==='boolean') && date(v.createdAt) && nullableDate(v.confirmedAt)
}
function contribution(v: unknown): v is ContributionItem {
  if (!object(v) || !text(v.id) || !text(v.reference) || !decimal(v.amount) || !currency(v.currency) || !oneOf(v.status, contributionStatuses) || !date(v.createdAt) || !nullableDate(v.confirmedAt) ||
    !object(v.campaign) || !['id', 'title', 'status'].every(key => text(v.campaign && (v.campaign as Record<string, unknown>)[key])) || !(v.campaign.slug === null || text(v.campaign.slug)) ||
    !Array.isArray(v.payments) || !v.payments.every(payment) || typeof v.receiptAvailable !== 'boolean') return false
  return v.receiptAvailable === v.payments.some(p => p.status === 'CONFIRMED' && p.confirmedAt !== null && p.amount === v.amount && p.currency === v.currency)
}
export function contributionPageFrom(v: unknown): ContributionPage {
  if (!object(v) || !Array.isArray(v.items) || v.items.length > 20 || !v.items.every(contribution) || !count(v.total) || !count(v.page) || Number(v.page) < 1 || v.pageSize !== 20) throw new SessionError(0)
  return v as unknown as ContributionPage
}
export function contributionDetailFrom(v: unknown): ContributionDetail {
  if (!contribution(v) || !object(v) || !(v.reward === null || (object(v.reward) && text(v.reward.id) && text(v.reward.title))) ||
    !Array.isArray(v.refunds) || !v.refunds.every(r => object(r) && text(r.id) && text(r.paymentId) && decimal(r.amount) && currency(r.currency) && oneOf(r.status, ['REQUESTED', 'PROCESSING', 'REFUNDED', 'FAILED']) && date(r.requestedAt) && nullableDate(r.completedAt)) ||
    !Array.isArray(v.disputes) || !v.disputes.every(d => object(d) && text(d.id) && text(d.reference) && oneOf(d.status, ['OPEN', 'UNDER_REVIEW', 'AWAITING_RESPONSE', 'RESOLVED', 'ESCALATED', 'CLOSED']) && date(d.createdAt)) ||
    !Array.isArray(v.supportCases) || !v.supportCases.every(s => object(s) && text(s.id) && text(s.reference) && text(s.subject) && oneOf(s.status, ['OPEN', 'IN_PROGRESS', 'AWAITING_RESPONSE', 'RESOLVED', 'CLOSED']) && date(s.createdAt))) throw new SessionError(0)
  return v as unknown as ContributionDetail
}
export function sponsorSummaryFrom(v: unknown): SponsorSummary {
  if (!object(v) || !['contributionCount', 'campaignsSupported', 'sandboxPaymentCount', 'favorites', 'following', 'openSupportCases', 'openDisputes', 'pendingRefunds'].every(key => count(v[key])) ||
    !Array.isArray(v.statusCounts) || !v.statusCounts.every(row => object(row) && oneOf(row.status, contributionStatuses) && count(row.count)) ||
    !Array.isArray(v.totals) || !v.totals.every(row => object(row) && currency(row.currency) && decimal(row.grossConfirmed) && decimal(row.refunded) && decimal(row.disputed))) throw new SessionError(0)
  if(v.demoTotals!==undefined && (!Array.isArray(v.demoTotals) || !v.demoTotals.every(row=>object(row) && currency(row.currency) && decimal(row.grossConfirmed) && decimal(row.refunded) && decimal(row.disputed))))throw new SessionError(0)
  return v as unknown as SponsorSummary
}
export function receiptFrom(v: unknown): Receipt {
  if (!object(v) || v.kind !== 'INFORMATIONAL_PAYMENT_RECORD' || !['contributionId', 'reference', 'paymentId', 'campaignTitle'].every(key => text(v[key])) ||
    !decimal(v.amount) || !currency(v.currency) || !date(v.confirmedAt) || typeof v.sandbox !== 'boolean' || !(v.method === null || text(v.method)) ||
    v.verificationPath !== `/api/me/contributions/${v.contributionId}/receipt`) throw new SessionError(0)
  return v as unknown as Receipt
}
export async function readContributions(filters: ContributionFilters, signal?: AbortSignal, send?: typeof fetch) {
  const params = new URLSearchParams({ page: String(filters.page) })
  for (const key of ['status', 'from', 'to'] as const) if (filters[key]) params.set(key, filters[key]!)
  return contributionPageFrom(await readJson(await requestApi(`/api/me/contributions?${params}`, { signal }, send)))
}
export async function readContribution(id: string, signal?: AbortSignal) { return contributionDetailFrom(await readJson(await requestApi(`/api/me/contributions/${encodeURIComponent(id)}`, { signal }))) }
export async function readReceipt(id: string, signal?: AbortSignal) { return receiptFrom(await readJson(await requestApi(`/api/me/contributions/${encodeURIComponent(id)}/receipt`, { signal }))) }
export async function readSponsorSummary(signal?: AbortSignal) { return sponsorSummaryFrom(await readJson(await requestApi('/api/me/sponsor-summary', { signal }))) }
