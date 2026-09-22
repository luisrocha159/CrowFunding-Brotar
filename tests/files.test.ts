import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SessionError } from '../src/features/access/session/sessionClient'
import { fileUrl, uploadFile, validateFileUpload, type FileUploadInput } from '../src/features/files/fileClient'

const input: FileUploadInput = {
  visibility: 'PUBLIC',
  purpose: 'PROFILE_AVATAR',
  originalName: ' avatar.png ',
  mimeType: 'image/png',
  contentBase64: Buffer.from('ok').toString('base64')
}

test('cliente valida privacidad, propósito, tipo y límites antes de cargar', () => {
  assert.deepEqual(validateFileUpload(input), {})
  assert.ok(validateFileUpload({ ...input, visibility: 'PUBLIC', purpose: 'ORGANIZATION_DOCUMENT' }).purpose)
  assert.ok(validateFileUpload({ ...input, visibility: 'PRIVATE', purpose: 'PROFILE_AVATAR' }).purpose)
  assert.ok(validateFileUpload({ ...input, mimeType: 'application/x-msdownload' }).mimeType)
  assert.ok(validateFileUpload({ ...input, originalName: '../avatar.png' }).originalName)
})

test('cliente envía carga autorizada y construye URL según privacidad', async () => {
  const result = await uploadFile(input, undefined, (async (url, init) => {
    assert.equal(url, '/api/files')
    assert.equal(init?.credentials, 'same-origin')
    assert.equal((init?.headers as Record<string, string>)['X-Brotar-Request'], '1')
    assert.deepEqual(JSON.parse(String(init?.body)), { ...input, originalName: 'avatar.png' })
    return Response.json({ id: '00000000-0000-4000-8000-000000000001', ownerUserId: 'owner', visibility: 'PUBLIC', purpose: 'PROFILE_AVATAR', originalName: 'avatar.png', mimeType: 'image/png', sizeBytes: 2, sha256: 'hash', createdAt: '2026-09-18T00:00:00.000Z' })
  }) as typeof fetch)
  assert.equal(fileUrl(result), '/api/files/public/00000000-0000-4000-8000-000000000001')
  assert.equal(fileUrl({ ...result, visibility: 'PRIVATE' }), '/api/files/00000000-0000-4000-8000-000000000001')
})

test('cliente no envía cargas inválidas y conserva errores HTTP explícitos', async () => {
  await assert.rejects(uploadFile({ ...input, visibility: 'PUBLIC', purpose: 'ORGANIZATION_DOCUMENT' }), (error: unknown) => error instanceof SessionError && error.status === 400)
  await assert.rejects(uploadFile(input, undefined, (async () => new Response('', { status: 403 })) as typeof fetch), (error: unknown) => error instanceof SessionError && error.status === 403)
})
