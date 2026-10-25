import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { administrativeDetailFrom, decisionErrors, decideCampaign, publishCampaign, readAdministrativeDetail, type AdministrativeDetail, type DecisionInput } from '../src/features/campaigns/administrativeClient'
import { AdministrativeInformation } from '../src/features/campaigns/AdministrativeCampaignPanel'
import { SessionError } from '../src/features/access/session/sessionClient'
import { validateDecision, type DecisionInput as ServerDecision } from '../backend/src/campaigns/domain/administrative-review'

const id = '11111111-1111-4111-8111-111111111111'
const input: DecisionInput = { decision: 'APPROVED', comment: '', expectedRound: 1, observations: [] }
const fixture: AdministrativeDetail = {
  project: { id, title: 'Campaña de ensayo', summary: 'Resumen', status: 'IN_REVIEW', categoryName: 'Ambiente', goalAmount: '1000.00', currencyCode: 'BOB', creatorName: 'Ana', updatedAt: '2026-10-05T12:00:00Z', submittedAt: '2026-10-05T11:00:00Z', location: null, story: null, history: [] },
  campaignType: 'REWARD', organizationName: 'Organización de ensayo', slug: 'campana-ensayo', publicationEnabled: true,
  general: { title: 'Campaña de ensayo', summary: 'Resumen', categoryId: id, location: { countryCode: 'BO', locality: 'La Paz', addressLine: 'Dirección administrativa', reference: 'Referencia interna' } },
  story: { story: { problem: 'Problema', solution: 'Solución', beneficiaries: 'Familias', expectedResults: 'Resultado esperado' }, indicators: [{ name: 'Árboles', description: 'Plantación', unit: 'unidades', baselineValue: 0, targetValue: 100 }] },
  cover: { fileId: id, altText: 'Bosque' }, plan: { activities: [{ name: 'Actividad', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-02' }], milestones: [{ name: 'Hito', responsibleName: 'Ana', plannedStartOn: '2026-11-02', plannedEndOn: '2026-11-02', activityIndexes: [0] }] },
  budget: { items: [{ categoryId: id, description: 'Semillas', quantity: 2, unitPrice: 5, plannedAmount: 10, notes: 'Nota de compra' }], risks: [{ title: 'Retraso', description: 'Proveedor', likelihood: 'Media', impact: 'Alto', mitigation: 'Alternativa' }] },
  funding: { goalAmount: 1000, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: null, endsAt: null },
  rewards: [{ title: 'Planta', description: 'Recompensa de ensayo', rewardKind: 'REWARD', minAmount: 10, quantityTotal: 20, estimatedDeliveryOn: '2027-01-01' }],
  rounds: [{ id, round: 1, decision: 'PENDING', reviewerName: null, summary: null, decidedAt: null, observations: [] }], missing: []
}
test('administración: contrato completo reutiliza parsers y mantiene secciones guardadas', async () => {
  const send = (async () => Response.json(fixture)) as typeof fetch
  assert.deepEqual(await readAdministrativeDetail(id, undefined, send), fixture)
  assert.equal(administrativeDetailFrom(fixture).plan.activities[0]!.responsibleName, 'Ana')
})
test('administración: contratos anidados inválidos no crean información ni éxito falso', () => {
  for (const patch of [{ plan: { activities: [null], milestones: [] } }, { rewards: [{}] }, { story: { story: {}, indicators: [] } }, { rounds: [{ ...fixture.rounds[0], decidedAt: 'ayer' }] }, { missing: [{ field: 'budget', label: 'Presupuesto', step: 100 }] }, { publicationEnabled: 'true' }, { project: { ...fixture.project, status: 'inventado' } }]) assert.throws(() => administrativeDetailFrom({ ...fixture, ...patch }), SessionError)
})
test('decisiones: validación frontend concuerda con servidor, motivos y observaciones', () => {
  const candidates = [input, { ...input, decision: 'CHANGES_REQUESTED', comment: 'Corregir' }, { ...input, decision: 'REJECTED', comment: ' ' }, { ...input, expectedRound: 0 }, { ...input, comment: 'a'.repeat(5001) }, { ...input, decision: 'CHANGES_REQUESTED', comment: 'Corregir', observations: [{ section: 'story', fieldPath: null, message: 'Aclara el problema' }] }, { ...input, decision: 'CHANGES_REQUESTED', comment: 'Corregir', observations: [{ section: 'invalid', fieldPath: null, message: 'Aclara' }] }] as DecisionInput[]
  for (const candidate of candidates) {
    let valid = true; try { validateDecision(candidate as ServerDecision) } catch { valid = false }
    assert.equal(Object.keys(decisionErrors(candidate)).length === 0, valid)
  }
})
test('decisiones/publicación: cookies, origen protegido, ronda y confirmación; no se envían roles', async () => {
  const calls: string[] = []
  const send = (async (url, init) => {
    calls.push(String(url)); assert.equal(init!.credentials, 'same-origin'); assert.equal(init!.cache, 'no-store'); assert.equal((init!.headers as Record<string, string>)['X-Brotar-Request'], '1')
    const body = JSON.parse(String(init!.body)); assert.ok(!('role' in body)); assert.ok(!('actorId' in body))
    if (String(url).endsWith('publish')) assert.deepEqual(body, { confirmed: true, expectedRound: 1 })
    else assert.deepEqual(body, input)
    return Response.json({ id, status: String(url).endsWith('publish') ? 'PUBLISHED' : 'APPROVED', round: 1 })
  }) as typeof fetch
  assert.equal((await decideCampaign(id, input, undefined, send)).status, 'APPROVED')
  assert.equal((await publishCampaign(id, 1, undefined, send)).status, 'PUBLISHED')
  assert.deepEqual(calls, [`/api/admin/campaigns/${id}/decision`, `/api/admin/campaigns/${id}/publish`])
  await assert.rejects(() => decideCampaign(id, { ...input, decision: 'REJECTED', comment: '' }, undefined, send), SessionError)
  await assert.rejects(() => publishCampaign(id, 0, undefined, send), SessionError)
  assert.equal(calls.length, 2)
})
test('administración: respuestas inciertas, identidad/estado/ronda inesperados y errores no se muestran como éxito', async () => {
  for (const value of [{}, { id: 'otro', status: 'APPROVED', round: 1 }, { id, status: 'PUBLISHED', round: 1 }, { id, status: 'APPROVED', round: 2 }]) {
    const send = (async () => Response.json(value)) as typeof fetch
    await assert.rejects(() => decideCampaign(id, input, undefined, send), SessionError)
  }
  for (const status of [401, 403, 404, 409, 422, 500]) await assert.rejects(() => readAdministrativeDetail(id, undefined, (async () => new Response('', { status })) as typeof fetch), error => error instanceof SessionError && error.status === status)
})
test('vista administrativa: todas las secciones e historial, sin acciones financieras ni datos inventados', () => {
  const markup = renderToStaticMarkup(createElement(AdministrativeInformation, { detail: fixture }))
  for (const text of ['Historia e impacto', 'Organización de ensayo', 'Dirección administrativa', 'Árboles', 'Hitos', 'Semillas', 'Nota de compra', 'Mitigación', 'Alternativa', 'Financiamiento', 'Recompensas y preventas', 'Recompensa de ensayo', 'Rondas de revisión', 'Historial de estados']) assert.ok(markup.includes(text), text)
  assert.doesNotMatch(markup, /Pagar ahora|KYC aprobado|Verificado/)
  const donation = renderToStaticMarkup(createElement(AdministrativeInformation, { detail: { ...fixture, campaignType: 'DONATION' } }))
  assert.doesNotMatch(donation, /Recompensas y preventas|Recompensa de ensayo/)
  const published = renderToStaticMarkup(createElement(AdministrativeInformation, { detail: { ...fixture, project: { ...fixture.project, status: 'PUBLISHED' }, rounds: [{ ...fixture.rounds[0]!, decision: 'APPROVED' }] } }))
  assert.match(published, /Ronda .*Aprobada/)
  assert.doesNotMatch(published, /aún no publicada/)
})

test('semejanzas administrativas: evidencia orientativa, identificadores visibles y ausencia de bloqueo', () => {
  const duplication = { reviewToken: 'a'.repeat(64), matches: [{ id, title: 'Restauración del bosque', status: 'PUBLISHED', kind: 'POSSIBLE' as const,
    reasons: ['Mismo país y localidad', 'Periodos distintos: comprobar si corresponde a una nueva etapa'] }] }
  const detail = administrativeDetailFrom({ ...fixture, duplication })
  const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdministrativeInformation, { detail })))
  for (const text of ['Coincidencias orientativas', 'Restauración del bosque', 'Mismo país y localidad', 'nueva etapa', 'Identificador', 'campana-ensayo', `/administracion/campanas/${id}`]) assert.ok(markup.includes(text), text)
  assert.doesNotMatch(markup, /95\s*%|99\s*%|100\s*%/)
  const copy = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdministrativeInformation, { detail: { ...detail, duplication: { ...duplication, matches: [{ ...duplication.matches[0]!, kind: 'COPY' }] } } })))
  assert.match(copy, /Coincidencia fuerte de contenido/)
  assert.doesNotMatch(copy, /Copia bloqueada|no puede aprobarse|no puede publicarse/)
  for (const malformed of [{ matches: [], reviewToken: 'a'.repeat(64) }, { ...duplication, reviewToken: 'falso' },
    { ...duplication, matches: [{ ...duplication.matches[0], kind: 'PROVEN_FRAUD' }] }, { ...duplication, matches: [{ ...duplication.matches[0], reasons: [123] }] }]) {
    assert.throws(() => administrativeDetailFrom({ ...fixture, duplication: malformed }), SessionError)
  }
})

test('compatibilidad: comentario opcional sobre semejanzas se valida si se proporciona, nunca es requisito', async () => {
  const duplicateReview = { token: 'b'.repeat(64), reason: 'Etapa nueva con actividades y beneficiarios de otra zona.' }
  let count = 0
  const send = (async (url, init) => {
    count++
    assert.deepEqual(JSON.parse(String(init!.body)).duplicateReview, duplicateReview)
    return Response.json({ id, round: 1, status: String(url).endsWith('publish') ? 'PUBLISHED' : 'APPROVED' })
  }) as typeof fetch
  await decideCampaign(id, { ...input, duplicateReview }, undefined, send)
  await publishCampaign(id, 1, undefined, send, duplicateReview)
  await assert.rejects(() => publishCampaign(id, 1, undefined, send, { ...duplicateReview, reason: 'Sí' }), SessionError)
  await assert.rejects(() => decideCampaign(id, { ...input, duplicateReview: { ...duplicateReview, token: 'falso' } }, undefined, send), SessionError)
  assert.equal(count, 2)
})
