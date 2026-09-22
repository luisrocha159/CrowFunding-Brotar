import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requestApi, readJson } from '../src/shared/api/request'
import { SessionError } from '../src/shared/api/sessionError'
import { DraftFieldError } from '../src/features/campaigns/campaignsClient'
import { readCoverDraft } from '../src/features/campaign-drafts/coverDraftClient'

test('DRY transporte mantiene cookies, cancelación y cabecera de mutación', async () => {
  const controller = new AbortController()
  controller.abort()
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const) {
    await requestApi('/api/example', { method, signal: controller.signal }, (async (_url, options) => {
      assert.equal(options?.credentials, 'same-origin')
      assert.equal(options?.redirect, 'error')
      assert.equal(options?.signal?.aborted, true)
      assert.equal((options?.headers as Record<string, string>)['X-Brotar-Request'], method === 'GET' ? undefined : '1')
      return Response.json({ ok: true })
    }) as typeof fetch)
  }
})

test('LSP DraftFieldError conserva el contrato de SessionError y añade detalle', async () => {
  const specific = new DraftFieldError({ title: 'Requerido' })
  const generic: SessionError = specific
  assert.equal(generic.status, 400)
  await assert.rejects(requestApi('/api/example', { errorFromResponse: async () => specific },
    (async () => new Response('', { status: 400 })) as typeof fetch), error => error === specific)
  assert.deepEqual(specific.fields, { title: 'Requerido' })
})

test('transporte distingue fallos HTTP, red y JSON inválido', async () => {
  await assert.rejects(requestApi('/api/example', {}, (async () => { throw new Error('red') }) as typeof fetch),
    error => error instanceof SessionError && error.status === 0)
  await assert.rejects(requestApi('/api/example', {}, (async () => new Response('', { status: 503 })) as typeof fetch),
    error => error instanceof SessionError && error.status === 503)
  await assert.rejects(readJson(new Response('{incompleto')), SessionError)
  await assert.rejects(readJson(new Response('')), SessionError)
})

test('portada nueva admite vacío o null pero no oculta JSON incorrecto', async () => {
  for (const body of ['', 'null']) {
    assert.equal(await readCoverDraft('campaign', (async () => new Response(body)) as typeof fetch), null)
  }
  await assert.rejects(readCoverDraft('campaign', (async () => new Response('{')) as typeof fetch), SessionError)
})
