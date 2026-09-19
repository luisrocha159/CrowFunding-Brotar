import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { FileAccessDenied, FileUnavailable, Files, InvalidFileUpload, type FileDownload, type FileStorage, type FileUploadInput, type StoredFile } from '../src/files/application/files'

const png = Buffer.from('ok').toString('base64')
const input: FileUploadInput = { visibility: 'PUBLIC', purpose: 'PROFILE_AVATAR', originalName: 'avatar.png', mimeType: 'image/png', contentBase64: png }

function storage(): { files: Files; saved: StoredFile[]; reads: Map<string, FileDownload> } {
  const saved: StoredFile[] = []
  const reads = new Map<string, FileDownload>()
  const adapter: FileStorage = {
    save: async (ownerUserId, next, content) => {
      const file: StoredFile = { id: `${saved.length + 1}`.padStart(36, '0'), ownerUserId, visibility: next.visibility, purpose: next.purpose, originalName: next.originalName, mimeType: next.mimeType, sizeBytes: content.length, sha256: 'hash', createdAt: '2026-09-18T00:00:00.000Z' }
      saved.push(file); reads.set(file.id, { file, content }); return file
    },
    read: async id => reads.get(id) ?? null,
    delete: async (id, ownerUserId) => {
      const current = reads.get(id)
      if (!current || current.file.ownerUserId !== ownerUserId) return false
      reads.delete(id); return true
    }
  }
  return { files: new Files(adapter), saved, reads }
}

test('archivos valida límites, privacidad y propósitos permitidos antes de guardar', async () => {
  const f = storage()
  assert.equal((await f.files.upload('owner', input)).visibility, 'PUBLIC')
  await assert.rejects(f.files.upload('owner', { ...input, originalName: '../x.png' }), InvalidFileUpload)
  await assert.rejects(f.files.upload('owner', { ...input, visibility: 'PUBLIC', purpose: 'ORGANIZATION_DOCUMENT' }), InvalidFileUpload)
  await assert.rejects(f.files.upload('owner', { ...input, visibility: 'PRIVATE', purpose: 'PROFILE_AVATAR' }), InvalidFileUpload)
  await assert.rejects(f.files.upload('owner', { ...input, mimeType: 'application/pdf' }), InvalidFileUpload)
  await assert.rejects(f.files.upload('owner', { ...input, contentBase64: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') }), InvalidFileUpload)
  assert.equal(f.saved.length, 1)
})

test('archivos separa acceso público y privado por dueño', async () => {
  const f = storage()
  const publicFile = await f.files.upload('owner', input)
  assert.equal((await f.files.publicDownload(publicFile.id)).file.id, publicFile.id)
  const privateFile = await f.files.upload('owner', { ...input, visibility: 'PRIVATE', purpose: 'ORGANIZATION_DOCUMENT', mimeType: 'application/pdf', originalName: 'registro.pdf' })
  await assert.rejects(f.files.publicDownload(privateFile.id), FileUnavailable)
  assert.equal((await f.files.privateDownload(privateFile.id, 'owner')).file.id, privateFile.id)
  await assert.rejects(f.files.privateDownload(privateFile.id, 'other'), FileAccessDenied)
  await f.files.delete(privateFile.id, 'owner')
  await assert.rejects(f.files.privateDownload(privateFile.id, 'owner'), FileUnavailable)
})
