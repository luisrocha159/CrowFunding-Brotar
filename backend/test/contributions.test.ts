import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Contributions, InvalidContributionQuery, ContributionUnavailable, ReceiptUnavailable, type ContributionDetail, type ContributionRepository } from '../src/contributions/application/contributions'

const detail: ContributionDetail = {
  id: 'contribution', reference: 'BRT-C-00000001', amount: '125.50', currency: 'BOB', status: 'CONFIRMED',
  createdAt: '2026-10-21T01:00:00.000Z', confirmedAt: '2026-10-21T01:01:00.000Z',
  campaign: { id: 'campaign', title: 'Campaña terminada', slug: null, status: 'CLOSED' }, reward: null,
  payments: [{ id: 'payment', amount: '125.50', currency: 'BOB', status: 'CONFIRMED', method: 'Método registrado', sandbox: false, createdAt: '2026-10-21T01:00:00.000Z', confirmedAt: '2026-10-21T01:01:00.000Z' }],
  refunds: [], disputes: [], supportCases: [], receiptAvailable: true
}
function repository(record: ContributionDetail | null = detail): ContributionRepository {
  return {
    list: async (user, query) => ({ items: user === 'owner' && query.page === 1 ? [detail] : [], total: user === 'owner' ? 1 : 0, page: query.page, pageSize: 20 }),
    detail: async (user, id) => user === 'owner' && id === 'contribution' ? record : null,
    summary: async () => ({ contributionCount: 0, campaignsSupported: 0, statusCounts: [], totals: [], sandboxPaymentCount: 0, favorites: 0, following: 0, openSupportCases: 0, openDisputes: 0, pendingRefunds: 0 })
  }
}
test('historial valida fecha calendario, orden de rango, estado de aporte y límites de página', async () => {
  const service = new Contributions(repository())
  for (const query of [{ page: 0 }, { page: 100001 }, { page: 1.2 }, { status: 'FAILED' }, { from: '2026-02-30' }, { from: '2026-1-01' }, { to: 'yesterday' }, { from: '2026-10-22', to: '2026-10-20' }]) {
    await assert.rejects(service.list('owner', query), InvalidContributionQuery)
  }
  assert.equal((await service.list('owner', { from: '2026-10-01', to: '2026-10-22', status: 'CONFIRMED' })).items[0]?.campaign.status, 'CLOSED')
  assert.equal((await service.list('other', {})).total, 0)
})
test('detalle y recibo ajenos o inexistentes no revelan si existe el aporte', async () => {
  const service = new Contributions(repository())
  await assert.rejects(service.detail('other', 'contribution'), ContributionUnavailable)
  await assert.rejects(service.receipt('other', 'contribution'), ContributionUnavailable)
  await assert.rejects(service.detail('owner', 'missing'), ContributionUnavailable)
})
test('comprobante exige confirmación coherente, conserva referencia y declara entorno', async () => {
  const receipt = await new Contributions(repository()).receipt('owner', 'contribution')
  assert.equal(receipt.paymentId, 'payment')
  assert.equal(receipt.reference, 'BRT-C-00000001')
  assert.equal(receipt.amount, '125.50')
  assert.equal(receipt.sandbox, false)
  assert.equal(receipt.kind, 'INFORMATIONAL_PAYMENT_RECORD')
  for (const payment of [
    { ...detail.payments[0]!, status: 'PENDING', confirmedAt: null },
    { ...detail.payments[0]!, status: 'FAILED', confirmedAt: null },
    { ...detail.payments[0]!, confirmedAt: null },
    { ...detail.payments[0]!, amount: '125.49' },
    { ...detail.payments[0]!, currency: 'USD' },
    { ...detail.payments[0]!, status: 'DISPUTED' }
  ]) await assert.rejects(new Contributions(repository({ ...detail, payments: [payment] })).receipt('owner', 'contribution'), ReceiptUnavailable)
  assert.equal((await new Contributions(repository({ ...detail, payments: [{ ...detail.payments[0]!, sandbox: true }] })).receipt('owner', 'contribution')).sandbox, true)
})
