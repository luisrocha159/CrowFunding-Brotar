import { SessionError } from '../access/session/sessionClient'
import { fileUrl, uploadFile, validateFileUpload, type FileUploadInput, type StoredFile } from '../files/fileClient'

export interface CoverDraft {
  ownerUserId: string
  fileId: string
  altText: string
  imageUrl: string
  updatedAt: string
}
export type CoverValues = { altText: string; file: File | null }
export type CoverErrors = Partial<Record<keyof CoverValues, string>>
export const COVER_HELP = 'Usa PNG, JPG o WebP hasta 2 MB. La portada se guarda como imagen pública del borrador.'

export function validateCover(values: CoverValues): CoverErrors {
  const errors: CoverErrors = {}
  const text = values.altText.trim()
  if (text.length < 10 || text.length > 180) errors.altText = 'Describe la portada entre 10 y 180 caracteres.'
  if (!values.file) errors.file = 'Selecciona una imagen para la portada.'
  else if (!['image/png', 'image/jpeg', 'image/webp'].includes(values.file.type)) errors.file = 'Selecciona una imagen PNG, JPG o WebP.'
  else if (values.file.size > 2 * 1024 * 1024) errors.file = 'La portada debe pesar hasta 2 MB.'
  return errors
}

function parseCover(value: unknown): CoverDraft | null {
  if (value === null) return null
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const cover = value as Record<string, unknown>
  for (const key of ['ownerUserId', 'fileId', 'altText', 'imageUrl', 'updatedAt']) {
    if (typeof cover[key] !== 'string') throw new SessionError(0)
  }
  return cover as unknown as CoverDraft
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function request(path: string, init?: RequestInit, send: typeof fetch = fetch): Promise<Response> {
  try {
    const response = await send(path, {
      credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(15000),
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
    })
    if (!response.ok) throw new SessionError(response.status)
    return response
  } catch (error) { throw error instanceof SessionError ? error : new SessionError(0) }
}

export async function readCoverDraft(send?: typeof fetch): Promise<CoverDraft | null> {
  const response = await request('/api/campaign-drafts/cover', undefined, send)
  return parseCover(await response.json())
}

export async function uploadCoverImage(file: File, signal?: AbortSignal): Promise<StoredFile> {
  const input: FileUploadInput = {
    visibility: 'PUBLIC',
    purpose: 'CAMPAIGN_PUBLIC_IMAGE',
    originalName: file.name,
    mimeType: file.type,
    contentBase64: await fileToBase64(file)
  }
  const errors = validateFileUpload(input)
  if (Object.keys(errors).length) throw new SessionError(400)
  return uploadFile(input, signal)
}

export async function saveCoverDraft(fileId: string, altText: string, signal?: AbortSignal, send?: typeof fetch): Promise<CoverDraft> {
  const response = await request('/api/campaign-drafts/cover', {
    method: 'PATCH',
    headers: { 'X-Brotar-Request': '1' },
    body: JSON.stringify({ fileId, altText: altText.trim() }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
  }, send)
  const cover = parseCover(await response.json())
  if (!cover) throw new SessionError(0)
  return cover
}

export function coverImageUrl(cover: CoverDraft): string {
  return cover.imageUrl || fileUrl({ id: cover.fileId, visibility: 'PUBLIC' })
}
