import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SessionError } from '../src/features/access/session/sessionClient'
import { coverImageUrl, readCoverDraft, saveCoverDraft, validateCover, type CoverValues } from '../src/features/campaign-drafts/coverDraftClient'

const file = new File([new Uint8Array([1, 2, 3])], 'portada.webp', { type: 'image/webp' })
const values: CoverValues = { file, altText: 'Portada de prueba para el borrador' }

test('portada valida selección, tipo, tamaño y texto alternativo', () => {
  assert.deepEqual(validateCover(values), {})
  assert.ok(validateCover({ ...values, altText: 'corta' }).altText)
  assert.ok(validateCover({ ...values, file: null }).file)
  assert.ok(validateCover({ ...values, file: new File(['x'], 'doc.pdf', { type: 'application/pdf' }) }).file)
  assert.ok(validateCover({ ...values, file: new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.webp', { type: 'image/webp' }) }).file)
})

test('portada consulta y guarda contrato real sin publicar campaña', async () => {
  const cover = { campaignId: 'campaign', ownerUserId: 'owner', fileId: '00000000-0000-4000-8000-000000000001', altText: values.altText, imageUrl: '/api/files/public/00000000-0000-4000-8000-000000000001', updatedAt: '2026-09-18T00:00:00.000Z' }
  assert.deepEqual(await readCoverDraft('campaign', (async url => {
    assert.equal(url, '/api/campaigns/drafts/campaign/cover')
    return Response.json(cover)
  }) as typeof fetch), cover)
  assert.deepEqual(await saveCoverDraft('campaign', cover.fileId, ` ${cover.altText} `, undefined, (async (url, init) => {
    assert.equal(url, '/api/campaigns/drafts/campaign/cover')
    assert.equal(init?.method, 'PATCH')
    assert.equal((init?.headers as Record<string, string>)['X-Brotar-Request'], '1')
    assert.deepEqual(JSON.parse(String(init?.body)), { fileId: cover.fileId, altText: cover.altText })
    return Response.json(cover)
  }) as typeof fetch), cover)
  assert.equal(coverImageUrl(cover), cover.imageUrl)
})

test('portada conserva errores HTTP explícitos', async () => {
  await assert.rejects(saveCoverDraft('campaign', '00000000-0000-4000-8000-000000000001', values.altText, undefined, (async () => new Response('', { status: 404 })) as typeof fetch), (error: unknown) => error instanceof SessionError && error.status === 404)
})
