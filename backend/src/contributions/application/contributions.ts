export const contributionStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] as const
export type ContributionStatus = typeof contributionStatuses[number]
export interface ContributionQuery { page: number; status?: ContributionStatus; from?: string; to?: string }
export interface ContributionItem {
  id: string; reference: string; amount: string; currency: string; status: ContributionStatus; createdAt: string; confirmedAt: string | null
  campaign: { id: string; title: string; slug: string | null; status: string }
  payments: PaymentRecord[]; receiptAvailable: boolean
}
export interface PaymentRecord {
  id: string; amount: string; currency: string; status: string; method: string | null; sandbox: boolean; createdAt: string; confirmedAt: string | null
}
export interface ContributionDetail extends ContributionItem {
  reward: { id: string; title: string } | null
  refunds: { id: string; paymentId: string; amount: string; currency: string; status: string; requestedAt: string; completedAt: string | null }[]
  disputes: { id: string; reference: string; status: string; createdAt: string }[]
  supportCases: { id: string; reference: string; subject: string; status: string; createdAt: string }[]
}
export interface ContributionPage { items: ContributionItem[]; total: number; page: number; pageSize: 20 }
export interface SponsorSummary {
  contributionCount: number; campaignsSupported: number; statusCounts: { status: ContributionStatus; count: number }[]
  totals: { currency: string; grossConfirmed: string; refunded: string; disputed: string }[]
  sandboxPaymentCount: number; favorites: number; following: number; openSupportCases: number; openDisputes: number; pendingRefunds: number
}
export interface ContributionRepository {
  list(userId: string, query: ContributionQuery): Promise<ContributionPage>
  detail(userId: string, id: string): Promise<ContributionDetail | null>
  summary(userId: string): Promise<SponsorSummary>
}
export class InvalidContributionQuery extends Error {}
export class ContributionUnavailable extends Error {}
export class ReceiptUnavailable extends Error {}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value >= '0001-01-01'
}
export function confirmedPayment(detail: Pick<ContributionItem, 'payments' | 'amount' | 'currency'>) {
  return detail.payments.find(payment => payment.status === 'CONFIRMED' && payment.confirmedAt !== null && payment.amount === detail.amount && payment.currency === detail.currency)
}
export class Contributions {
  constructor(private readonly repository: ContributionRepository) {}
  async list(userId: string, input: { page?: number; status?: string; from?: string; to?: string }) {
    const page = input.page ?? 1
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 ||
      (input.status !== undefined && !contributionStatuses.includes(input.status as ContributionStatus)) ||
      (input.from !== undefined && !validDate(input.from)) || (input.to !== undefined && !validDate(input.to)) ||
      (input.from && input.to && input.from > input.to)) throw new InvalidContributionQuery()
    return this.repository.list(userId, { ...input, status: input.status as ContributionStatus | undefined, page })
  }
  async detail(userId: string, id: string) {
    const detail = await this.repository.detail(userId, id)
    if (!detail) throw new ContributionUnavailable()
    return detail
  }
  summary(userId: string) { return this.repository.summary(userId) }
  async receipt(userId: string, id: string) {
    const detail = await this.detail(userId, id)
    const payment = confirmedPayment(detail)
    if (!payment) throw new ReceiptUnavailable()
    return {
      kind: 'INFORMATIONAL_PAYMENT_RECORD' as const, contributionId: detail.id, reference: detail.reference,
      paymentId: payment.id, campaignTitle: detail.campaign.title, amount: payment.amount, currency: payment.currency,
      confirmedAt: payment.confirmedAt!, method: payment.method, sandbox: payment.sandbox,
      verificationPath: `/api/me/contributions/${detail.id}/receipt`
    }
  }
}
