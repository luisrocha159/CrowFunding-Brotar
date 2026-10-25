import { describe, test } from 'node:test'
import { strict as assert } from 'node:assert'
import { galleryFrom, saveGallery, validateGallery } from '../src/features/campaign-drafts/galleryClient'

const fileId = '00000000-0000-4000-8000-000000000001'
const gallery = { revision: 'version1', images: [{ fileId, caption: 'Imagen descriptiva' }], videoUrl: null }
describe('cliente de galería', () => {
  test('rechaza respuestas mal formadas y enlaces arbitrarios', () => {
    assert.deepEqual(galleryFrom(gallery), gallery)
    assert.throws(() => galleryFrom({ ...gallery, images: [{ fileId: '../private', caption: 'imagen' }] }))
    assert.throws(() => galleryFrom({ ...gallery, videoUrl: 'javascript:alert(1)' }))
    assert.match(validateGallery({ ...gallery, images: [{ fileId, caption: '' }] })!, /descripción/)
  })
  test('envía revisión y conserva error de conflicto', async () => {
    let body: unknown
    const send = (async (_url: unknown, init: RequestInit) => {
      body = JSON.parse(String(init.body))
      return new Response('{}', { status: 409 })
    }) as typeof fetch
    await assert.rejects(saveGallery('campaign', gallery, undefined, send), { status: 409 })
    assert.deepEqual(body, gallery)
  })
})
