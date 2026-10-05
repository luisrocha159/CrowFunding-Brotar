import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { mapPublicCampaign, listPublicCampaigns, getPublicCampaign } from '../src/features/public/campaignsApi'
import { SessionError } from '../src/shared/api/sessionError'
import { queryProjects, getProjectFilterOptions } from '../src/features/public/explore-projects/projectQuery'
import { ProjectCard } from '../src/shared/components/ProjectCard'

const fixture = {
  id: '11111111-1111-4111-8111-111111111111', slug: 'bosque-publicado', name: 'Bosque publicado', summary: 'Reforestación comunitaria',
  category: 'Ambiente', location: 'La Paz', creator: 'Creador de prueba', campaignType: 'REWARD', status: 'PUBLISHED',
  goal: '1000.00', raised: '175.50', currencyCode: 'USD', publishedAt: '2026-10-04T10:00:00Z', endsAt: null,
  imageId: '22222222-2222-4222-8222-222222222222', imageUrl: 'https://untrusted.example/image', imageAlt: 'Bosque de ensayo',
  description: 'Historia pública', problem: 'Problema público', solution: 'Solución pública', beneficiaries: 'Comunidad', expectedResults: 'Restaurar áreas',
  creatorDescription: 'Perfil público', impact: [{ indicator: 'Árboles', target: '100 unidades' }],
  rewards: [{ id: '33333333-3333-4333-8333-333333333333', title: 'Semillas', description: 'Recompensa pública', minAmount: '10.50', currency: 'USD' }]
}
test('S2-16 mapea importes, moneda, imagen y contenido publicados sin inventar verificación ni cierre', () => {
  const project = mapPublicCampaign(fixture)
  assert.equal(project.raised, 175.5); assert.equal(project.goal, 1000); assert.equal(project.currencyCode, 'USD')
  assert.equal(project.image, `/api/files/public/${fixture.imageId}`)
  assert.equal(project.rewards![0]!.minAmount, 10.5)
  assert.equal(project.expectedResults, fixture.expectedResults)
  assert.equal(project.closingDateKnown, false); assert.equal(project.verified, false); assert.equal(project.isDemo, false)
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ProjectCard, { project })))
  assert.match(html, /USD/); assert.match(html, /Fecha de cierre por definir/); assert.doesNotMatch(html, /Bs |Verificado/)
})
test('S2-16 rechaza estados privados y contratos inválidos en vez de simular datos', () => {
  for (const invalid of [null, {}, { ...fixture, status: 'APPROVED' }, { ...fixture, campaignType: 'UNKNOWN' },
    { ...fixture, id: 'undefined' }, { ...fixture, slug: '../private' }, { ...fixture, goal: null },
    { ...fixture, raised: 'NaN' }, { ...fixture, raised: -1 }, { ...fixture, currencyCode: 'Bs' },
    { ...fixture, publishedAt: 'ayer' }, { ...fixture, endsAt: 'mañana' }, { ...fixture, imageId: null },
    { ...fixture, impact: [null] }, { ...fixture, rewards: [{ ...fixture.rewards[0], minAmount: -1 }] }]) {
    assert.throws(() => mapPublicCampaign(invalid), SessionError)
  }
})
test('S2-16 transporte distingue vacío, 404, fallo y cancelación sin acudir a campañas mock', async () => {
  const original = globalThis.fetch
  const abort = new AbortController()
  try {
    globalThis.fetch = (async (url, options) => {
      assert.ok(options?.signal instanceof AbortSignal); assert.equal(options.signal.aborted, false); assert.equal(options?.credentials, 'same-origin')
      assert.equal(String(url), '/api/campaigns/public'); return Response.json([fixture])
    }) as typeof fetch
    assert.equal((await listPublicCampaigns(abort.signal))[0]!.slug, fixture.slug)
    globalThis.fetch = (async () => Response.json([])) as typeof fetch
    assert.deepEqual(await listPublicCampaigns(), [])
    globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch
    assert.equal(await getPublicCampaign('no-publicada'), null)
    for (const status of [401, 403, 500, 503]) {
      globalThis.fetch = (async () => new Response('', { status })) as typeof fetch
      await assert.rejects(() => listPublicCampaigns(), SessionError)
      await assert.rejects(() => getPublicCampaign('bosque'), SessionError)
    }
    abort.abort()
    globalThis.fetch = (async (_url, options) => {
      assert.equal(options?.signal?.aborted, true)
      throw new DOMException('Cancelada', 'AbortError')
    }) as typeof fetch
    await assert.rejects(() => listPublicCampaigns(abort.signal), SessionError)
  } finally { globalThis.fetch = original }
})
test('S2-16 filtros y búsqueda combinan contenido real del contrato por intersección', () => {
  const projects = [mapPublicCampaign(fixture), mapPublicCampaign({ ...fixture, id: '44444444-4444-4444-8444-444444444444', location: 'Santa Cruz', campaignType: 'DONATION' })]
  assert.equal(queryProjects(projects, { text: 'reforestacion creador', category: 'Ambiente', location: 'La Paz', campaignType: 'reward' }).total, 1)
  assert.equal(queryProjects(projects, { text: 'sin coincidencias' }).total, 0)
  assert.equal(queryProjects(projects, { location: 'La Paz', campaignType: 'donation' }).total, 0)
})
test('S2-16 conserva el orden del catálogo y no trata una fecha ausente como un cierre próximo', () => {
  const unknown = mapPublicCampaign({ ...fixture, id: '44444444-4444-4444-8444-444444444444', category: '', location: '' })
  const known = { ...mapPublicCampaign(fixture), closingDateKnown: true, daysRemaining: 5 }
  assert.deepEqual(queryProjects([unknown, known]).items.map(item => item.id), [unknown.id, known.id])
  assert.equal(queryProjects([unknown, known], { sort: 'ending-soon' }).items[0]!.id, known.id)
  assert.deepEqual(getProjectFilterOptions([unknown]).categories, [])
  assert.deepEqual(getProjectFilterOptions([unknown]).locations, [])
})
