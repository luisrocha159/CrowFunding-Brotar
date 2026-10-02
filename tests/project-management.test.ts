import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ProjectsList } from '../src/features/campaigns/ProjectsPage'
import { canContinueProject, campaignReviewQueue, discardProject, ownProjects, projectDetail, projectGoal, projectStatusNames, type ProjectSummary } from '../src/features/campaigns/projectsClient'
import { SessionError } from '../src/features/access/session/sessionClient'
import { authenticatedContinuation } from '../src/features/access/navigation'

const project: ProjectSummary = {
  id: 'own-id', title: 'Mi campaña', summary: null, status: 'DRAFT', categoryName: null,
  goalAmount: null, currencyCode: null, updatedAt: '2026-10-01T12:00:00Z', submittedAt: null, creatorName: 'Mi nombre'
}
test('continuación tras acceso permite solo las nuevas rutas privadas explícitas', () => {
  assert.equal(authenticatedContinuation('/mis-proyectos'), '/mis-proyectos')
  assert.equal(authenticatedContinuation('/administracion/campanas'), '/administracion/campanas')
  assert.equal(authenticatedContinuation('/mis-proyectos/11111111-1111-4111-8111-111111111111'), '/mis-proyectos/11111111-1111-4111-8111-111111111111')
  for (const path of ['https://other.example', '//other.example', '/administracion/campanas?rol=ADMIN', '/mis-proyectos/../secret']) {
    assert.equal(authenticatedContinuation(path), '/explorar')
  }
})
test('gestión propia: contratos de lectura y descarte usan cookies y confirmación sin enviar propietario/rol', async () => {
  const original = globalThis.fetch
  const seen: string[] = []
  try {
    globalThis.fetch = (async (url, init) => {
      seen.push(String(url)); assert.equal(init?.credentials, 'same-origin'); assert.equal(init?.cache, 'no-store')
      if (init?.method === 'POST') {
        assert.deepEqual(JSON.parse(String(init.body)), { confirmed: true })
        assert.equal((init.headers as Record<string, string>)['X-Brotar-Request'], '1')
        return new Response(null, { status: 204 })
      }
      return Response.json(String(url).endsWith('/own-id') ? { ...project, location: null, story: null, history: [] } : [project])
    }) as typeof fetch
    assert.equal((await ownProjects())[0]!.id, 'own-id')
    await campaignReviewQueue()
    assert.equal((await projectDetail('own-id', false)).title, project.title)
    await discardProject('own-id')
    assert.deepEqual(seen, ['/api/campaigns/mine', '/api/admin/campaigns/review', '/api/campaigns/mine/own-id', '/api/campaigns/mine/own-id/discard'])
  } finally { globalThis.fetch = original }
})
test('gestión propia: respuesta vacía solo es lista vacía si fue una respuesta correcta', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = (async () => Response.json([])) as typeof fetch
    assert.deepEqual(await ownProjects(), [])
    for (const status of [401, 403, 404, 409, 503]) {
      globalThis.fetch = (async () => new Response('', { status })) as typeof fetch
      await assert.rejects(() => ownProjects(), (error: unknown) => error instanceof SessionError && error.status === status)
    }
  } finally { globalThis.fetch = original }
})
test('gestión propia: respuestas incompletas, fechas, monedas y montos inválidos no se presentan como datos correctos', async () => {
  const original = globalThis.fetch
  try {
    for (const value of [{}, { ...project, status: 'inventado' }, { ...project, updatedAt: 'ayer' }, { ...project, goalAmount: '-1' }, { ...project, goalAmount: 'Infinity' }, { ...project, currencyCode: 'moneda' }]) {
      globalThis.fetch = (async () => Response.json([value])) as typeof fetch
      await assert.rejects(() => ownProjects(), SessionError)
    }
    globalThis.fetch = (async () => Response.json({ ...project, location: {}, story: null, history: [] })) as typeof fetch
    await assert.rejects(() => projectDetail('own-id', true), SessionError)
  } finally { globalThis.fetch = original }
})
test('acciones por estado y meta sin datos: no se fingen aportes ni publicación', () => {
  assert.equal(projectGoal(project), 'Meta por definir')
  assert.match(projectGoal({ ...project, goalAmount: '1000.00', currencyCode: 'BOB' }), /^BOB /)
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(ProjectsList, { projects: [project, { ...project, id: 'published', status: 'PUBLISHED' }], onDiscard: () => {} })))
  assert.equal((html.match(/Continuar borrador/g) ?? []).length, 1)
  assert.equal((html.match(/>Descartar</g) ?? []).length, 1)
  assert.match(html, /crear-campana\?borrador=own-id/)
  assert.equal((html.match(/Ver detalle/g) ?? []).length, 2)
  assert.equal(canContinueProject('APPROVED'), false)
  assert.doesNotMatch(html, /Recaudado|Publicado automáticamente/)
})

test('todos los estados de consulta restringen continuar y descartar a DRAFT', () => {
  for (const status of Object.keys(projectStatusNames)) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null,
      createElement(ProjectsList, { projects: [{ ...project, status }], onDiscard: () => {} })))
    assert.equal(canContinueProject(status), status === 'DRAFT')
    assert.equal(html.includes('Continuar borrador'), status === 'DRAFT')
    assert.equal(html.includes('>Descartar<'), status === 'DRAFT')
    assert.match(html, /Ver detalle/)
  }
  assert.equal(canContinueProject('estado-desconocido'), false)
})
