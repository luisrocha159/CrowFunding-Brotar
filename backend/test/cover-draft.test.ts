import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { CampaignCoverDrafts, CampaignCoverUnavailable, InvalidCampaignCover, type CampaignCoverDraft, type CoverDraftRepository } from '../src/campaign-drafts/application/cover-draft'
import { FileUnavailable, type FileDownload, type AuthorizedFileReader, type StoredFile } from '../src/files/application/files'

function file(overrides: Partial<StoredFile> = {}): FileDownload {
  return {
    file: {
      id: '00000000-0000-4000-8000-000000000001',
      ownerUserId: 'owner',
      visibility: 'PUBLIC',
      purpose: 'CAMPAIGN_PUBLIC_IMAGE',
      originalName: 'portada.webp',
      mimeType: 'image/webp',
      sizeBytes: 100,
      sha256: 'hash',
      createdAt: '2026-09-18T00:00:00.000Z',
      ...overrides
    },
    content: Buffer.from('cover')
  }
}

function fixture(download: FileDownload | null = file()) {
  let stored: CampaignCoverDraft | null = null
  const repository: CoverDraftRepository = {
    read: async ownerUserId => stored?.ownerUserId === ownerUserId ? stored : null,
    save: async input => { stored = input; return input }
  }
  const files: AuthorizedFileReader = { privateDownload: async () => { if (!download) throw new FileUnavailable(); return download } }
  return new CampaignCoverDrafts(repository, files)
}

test('portada de borrador valida archivo público de campaña, texto alternativo y persistencia', async () => {
  const drafts = fixture()
  await assert.rejects(drafts.save('owner', 'campaign', '00000000-0000-4000-8000-000000000001', 'muy corto'), InvalidCampaignCover)
  const saved = await drafts.save('owner', 'campaign', '00000000-0000-4000-8000-000000000001', 'Portada de prueba para el borrador')
  assert.equal(saved.imageUrl, '/api/files/public/00000000-0000-4000-8000-000000000001')
  assert.equal((await drafts.read('owner', 'campaign'))?.altText, 'Portada de prueba para el borrador')
})

test('portada de borrador rechaza documentos privados o archivo ausente', async () => {
  await assert.rejects(fixture(file({ visibility: 'PRIVATE', purpose: 'ORGANIZATION_DOCUMENT' })).save('owner', 'campaign', '00000000-0000-4000-8000-000000000001', 'Portada de prueba para el borrador'), InvalidCampaignCover)
  await assert.rejects(fixture(null).save('owner', 'campaign', '00000000-0000-4000-8000-000000000001', 'Portada de prueba para el borrador'), CampaignCoverUnavailable)
})
