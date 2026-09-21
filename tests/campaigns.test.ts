import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  activeCategories, canMoveTo, createDraft, myDrafts, readDraft, saveDraft, validateDraft,
  type DraftInput
} from '../src/features/campaigns/campaignsClient'
import { SessionError } from '../src/features/access/session/sessionClient'

const input: DraftInput = { title: 'Campaña de prueba', summary: 'Resumen', campaignType: 'DONATION', categoryId: null, organizationId: null }
const draft = { id: 'draft-id', title: 'Campaña de prueba', summary: 'Resumen', campaignType: 'DONATION', categoryId: null, organizationId: null, status: 'DRAFT', builderStep: 1, totalSteps: 8 }

test('borrador: se validan nombre, resumen y modalidad sin inventar tipos', () => {
  assert.deepEqual(validateDraft(input), {})
  assert.ok(validateDraft({ ...input, title: '   ' }).title)
  assert.ok(validateDraft({ ...input, title: 'x'.repeat(201) }).title)
  assert.ok(validateDraft({ ...input, summary: 'x'.repeat(301) }).summary)
  assert.ok(validateDraft({ ...input, campaignType: 'INVENTADA' as DraftInput['campaignType'] }).campaignType)
  // Las tres modalidades del esquema oficial se aceptan; no hay una cuarta.
  for (const type of ['DONATION', 'REWARD', 'PRESALE'] as const) {
    assert.deepEqual(validateDraft({ ...input, campaignType: type }), {})
  }
})

test('navegación: se avanza de uno en uno y se retrocede libremente', () => {
  assert.equal(canMoveTo(2, 3, 8), true)
  assert.equal(canMoveTo(2, 2, 8), true)
  assert.equal(canMoveTo(2, 0, 8), true)
  assert.equal(canMoveTo(2, 4, 8), false, 'No se ofrece un salto que la API va a rechazar.')
  assert.equal(canMoveTo(7, 8, 8), false, 'No se pasa del último paso.')
  assert.equal(canMoveTo(0, -1, 8), false)
})

test('borrador: contrato real con cookies, cabecera de mutación y posición', async () => {
  const original = globalThis.fetch
  const seen: { url: string; method: string; body: unknown }[] = []
  try {
    globalThis.fetch = (async (url, init) => {
      assert.equal(init?.credentials, 'same-origin')
      assert.equal(init?.cache, 'no-store')
      const method = init?.method ?? 'GET'
      seen.push({ url: String(url), method, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      if (method !== 'GET') assert.equal((init!.headers as Record<string, string>)['X-Brotar-Request'], '1')
      if (String(url).endsWith('/catalogs/categories')) return Response.json([{ id: 'cat', name: 'Educación', slug: 'educacion' }])
      if (method === 'POST') return Response.json({ ...draft, builderStep: 0 }, { status: 201 })
      if (method === 'PUT') return Response.json({ ...draft, builderStep: 2 })
      if (String(url).endsWith('/campaigns/drafts')) return Response.json([draft])
      return Response.json(draft)
    }) as typeof fetch

    assert.equal((await createDraft(input)).builderStep, 0)
    assert.equal((await readDraft('draft-id')).id, 'draft-id')
    assert.equal((await myDrafts()).length, 1)
    assert.equal((await activeCategories())[0]!.name, 'Educación')

    const saved = await saveDraft('draft-id', input, 2)
    assert.equal(saved.builderStep, 2)
    // Datos y posición viajan juntos: no se guarda una posición sin sus datos.
    assert.deepEqual(seen.find((call) => call.method === 'PUT')?.body,
      { title: 'Campaña de prueba', summary: 'Resumen', campaignType: 'DONATION', builderStep: 2 })
  } finally { globalThis.fetch = original }
})

test('una respuesta incompleta no se muestra como un borrador correcto', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = (async () => Response.json({ id: 'draft-id', title: 'Sin posición' })) as typeof fetch
    await assert.rejects(() => readDraft('draft-id'), SessionError)
  } finally { globalThis.fetch = original }
})

test('los estados de error de la API se conservan para que la vista reaccione', async () => {
  const original = globalThis.fetch
  try {
    for (const status of [401, 403, 409]) {
      globalThis.fetch = (async () => new Response('', { status })) as typeof fetch
      await assert.rejects(() => saveDraft('draft-id', input, 1), (error: unknown) => {
        assert.ok(error instanceof SessionError)
        assert.equal(error.status, status)
        return true
      })
    }
  } finally { globalThis.fetch = original }
})
