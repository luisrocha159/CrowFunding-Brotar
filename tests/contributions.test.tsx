import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { contributionPageFrom, contributionDetailFrom, receiptFrom, readContributions } from '../src/features/contributions/contributionsClient'
import { ContributionRecord } from '../src/features/contributions/ContributionRecord'
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
  assert.match(html, /Aporte: Pendiente/); assert.match(html, /Pago: Fallido/); assert.match(html, /SANDBOX/)
  assert.match(html, /Campaña cerrada/); assert.ok(!html.includes('/proyectos/')); assert.ok(!html.includes('/comprobante'))
})
