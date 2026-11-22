import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { contributionPageFrom, contributionDetailFrom, receiptFrom, readContributions } from '../src/features/contributions/contributionsClient'
import { ContributionRecord } from '../src/features/contributions/ContributionRecord'
import { SponsorOverview } from '../src/features/contributions/SponsorOverview'
const item = {
  id: 'a', reference: 'BRT-C-00000001', amount: '999999999999.99', currency: 'BOB', status: 'PENDING', createdAt: '2026-10-22T01:00:00Z', confirmedAt: null,
  campaign: { id: 'c', title: 'Campaña cerrada', slug: null, status: 'CLOSED' },
  payments: [{ id: 'p', amount: '999999999999.99', currency: 'BOB', status: 'FAILED', method: 'Prueba', sandbox: true, createdAt: '2026-10-22T01:00:00Z', confirmedAt: null }], receiptAvailable: false
}
test('contrato conserva precisión y rechaza importes numéricos, estados mezclados y recibos imposibles', () => {
  const page = { items: [item], page: 1, pageSize: 20, total: 1 }
  assert.equal(contributionPageFrom(page).items[0]?.amount, '999999999999.99')
  for (const invalid of [{ ...item, amount: 1.25 }, { ...item, status: 'FAILED' }, { ...item, receiptAvailable: true }]) assert.throws(() => contributionPageFrom({ ...page, items: [invalid] }))
  assert.throws(() => contributionDetailFrom({ ...item, refunds: [], disputes: [] }))
  assert.throws(() => receiptFrom({ kind: 'INFORMATIONAL_PAYMENT_RECORD', amount: '1.00', verificationPath: 'https://untrusted.invalid' }))
})
test('cliente usa filtros codificados y transporte autenticado sin caché', async () => {
  const result = await readContributions({ page: 2, status: 'PENDING', from: '2026-10-01', to: '2026-10-22' }, undefined, (async (url, init) => {
    assert.equal(String(url), '/api/me/contributions?page=2&status=PENDING&from=2026-10-01&to=2026-10-22')
    assert.equal(init?.credentials, 'same-origin'); assert.equal(init?.cache, 'no-store')
    return Response.json({ items: [], page: 2, pageSize: 20, total: 1 })
  }) as typeof fetch)
  assert.equal(result.items.length, 0)
})
test('historial presenta aporte y pago por separado, sin enlace público roto ni comprobante para fallo', () => {
  const html = renderToStaticMarkup(<MemoryRouter><ContributionRecord item={contributionPageFrom({ items: [item], page: 1, pageSize: 20, total: 1 }).items[0]!} /></MemoryRouter>)
  assert.match(html, /Aporte: Pendiente/); assert.match(html, /Pago: Fallido/); assert.match(html, /Sin dinero real/)
  assert.match(html, /Campaña cerrada/); assert.ok(!html.includes('/proyectos/')); assert.ok(!html.includes('/comprobante'))
})

test('un aporte pendiente permite retomar únicamente su último pago interno', () => {
  const pending = contributionPageFrom({ items: [{ ...item, payments: [
    { ...item.payments[0], id: 'anterior', demo: true },
    { ...item.payments[0], id: 'vigente', status: 'PENDING', demo: true },
  ] }], page: 1, pageSize: 20, total: 1 }).items[0]!
  const html = renderToStaticMarkup(<MemoryRouter><ContributionRecord item={pending} /></MemoryRouter>)
  assert.match(html, /apoyo-demo\?pago=vigente/)
  assert.doesNotMatch(html, /apoyo-demo\?pago=anterior/)
})

test('el panel del patrocinador conserva el filtro de pendientes y los importes de cada moneda', () => {
  const summary = {
    contributionCount: 3, campaignsSupported: 2, statusCounts: [{ status: 'PENDING' as const, count: 1 }],
    totals: [], demoTotals: [
      { currency: 'BOB', grossConfirmed: '20.00', refunded: '5.00', disputed: '0.00' },
      { currency: 'USD', grossConfirmed: '11.00', refunded: '0.00', disputed: '1.00' },
    ],
    sandboxPaymentCount: 3, favorites: 1, following: 2, openSupportCases: 1, openDisputes: 1, pendingRefunds: 1,
  }
  const html = renderToStaticMarkup(<MemoryRouter><SponsorOverview summary={summary} /></MemoryRouter>)
  assert.match(html, /mis-aportes\?status=PENDING/)
  assert.match(html, /20,00 BOB/)
  assert.match(html, /11,00 USD/)
  assert.match(html, /mis-incidencias/)
  assert.match(html, /mis-disputas/)
})
