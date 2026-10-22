import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { CampaignGalleries, InvalidGallery, GalleryUnavailable, normalizeVideoUrl, type Gallery, type GalleryRepository } from '../src/campaign-drafts/application/gallery'
import type { AuthorizedFileReader, StoredFile } from '../src/files/application/files'

const fileId = '00000000-0000-4000-8000-000000000001'
function fixture(overrides: Partial<StoredFile> = {}) {
  let stored: Gallery = { revision: 'v1', images: [], videoUrl: null }
  let writes = 0
  const repository: GalleryRepository = {
    readOwn: async user => { if (user !== 'owner') throw new GalleryUnavailable(); return stored },
    readPublic: async () => stored,
    save: async (_user, _id, value) => { writes++; stored = value; return value }
  }
  const files: AuthorizedFileReader = { privateDownload: async id => ({ content: Buffer.from('png'), file: {
    id, ownerUserId: 'owner', visibility: 'PUBLIC', purpose: 'CAMPAIGN_PUBLIC_IMAGE', originalName: 'galeria.png',
    mimeType: 'image/png', sizeBytes: 10, sha256: 'hash', createdAt: new Date().toISOString(), ...overrides
  } }) }
  return { galleries: new CampaignGalleries(repository, files), writes: () => writes }
}
test('galería conserva orden, leyendas y vídeo normalizado', async () => {
  const { galleries } = fixture()
  const second = fileId.replace(/1$/, '2')
  const saved = await galleries.save('owner', 'campaign', { revision: 'v1', images: [
    { fileId: second, caption: ' Segundo recurso ' }, { fileId, caption: 'Primer recurso' }
  ], videoUrl: 'https://youtu.be/abcdefghijk?t=30' })
  assert.deepEqual(saved.images.map(image => image.fileId), [second, fileId])
  assert.equal(saved.images[0]!.caption, 'Segundo recurso')
  assert.equal(saved.videoUrl, 'https://www.youtube.com/watch?v=abcdefghijk')
})
test('galería rechaza recursos ajenos/privados, duplicados y texto inseguro sin guardar', async () => {
  const input = { revision: 'v1', images: [{ fileId, caption: 'Imagen descriptiva' }], videoUrl: null }
  for (const override of [{ ownerUserId: 'another' }, { visibility: 'PRIVATE' as const }, { purpose: 'PROFILE_AVATAR' as const }]) {
    const f = fixture(override)
    await assert.rejects(f.galleries.save('owner', 'campaign', input), GalleryUnavailable)
    assert.equal(f.writes(), 0)
  }
  const f = fixture()
  await assert.rejects(f.galleries.save('other', 'campaign', input), GalleryUnavailable)
  await assert.rejects(f.galleries.save('owner', 'campaign', { ...input, images: [...input.images, ...input.images] }), InvalidGallery)
  await assert.rejects(f.galleries.save('owner', 'campaign', { ...input, images: [{ fileId, caption: 'bad\u0000caption' }] }), InvalidGallery)
  await assert.rejects(f.galleries.save('owner', 'campaign', { ...input, images: Array.from({ length: 21 }, () => input.images[0]!) }), InvalidGallery)
  assert.equal(f.writes(), 0)
})
test('vídeo no admite protocolos, credenciales ni hosts parecidos a proveedores', () => {
  assert.equal(normalizeVideoUrl('https://vimeo.com/12345678'), 'https://vimeo.com/12345678')
  assert.equal(normalizeVideoUrl(''), null)
  for (const url of ['javascript:alert(1)', 'http://vimeo.com/123', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://user@youtu.be/abcdefghijk', 'https://youtu.be:444/abcdefghijk', 'https://example.com/video.mp4']) {
    assert.throws(() => normalizeVideoUrl(url), InvalidGallery)
  }
})
