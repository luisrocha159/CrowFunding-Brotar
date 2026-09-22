import { SessionError } from '../access/session/sessionClient'
import { fileUrl, uploadFile, FILE_LIMITS, type FileUploadInput, type StoredFile } from '../files/fileClient'
import { readJson, requestApi } from '../../shared/api/request'

export interface CoverDraft {
  campaignId: string
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
  else if (values.file.size > FILE_LIMITS.publicImageBytes) errors.file = 'La portada debe pesar hasta 2 MB.'
  return errors
}

function parseCover(value: unknown): CoverDraft | null {
  if (value === null) return null
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const cover = value as Record<string, unknown>
  for (const key of ['campaignId', 'ownerUserId', 'fileId', 'altText', 'imageUrl', 'updatedAt']) {
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

export async function readCoverDraft(campaignId: string, send?: typeof fetch): Promise<CoverDraft | null> {
  const response = await requestApi(`/api/campaigns/drafts/${encodeURIComponent(campaignId)}/cover`, {}, send)
  return parseCover(await readJson(response, true))
}

export async function uploadCoverImage(file: File, signal?: AbortSignal): Promise<StoredFile> {
  const input: FileUploadInput = {
    visibility: 'PUBLIC',
    purpose: 'CAMPAIGN_PUBLIC_IMAGE',
    originalName: file.name,
    mimeType: file.type,
    contentBase64: await fileToBase64(file)
  }
  return uploadFile(input, signal)
}

export async function saveCoverDraft(campaignId: string, fileId: string, altText: string, signal?: AbortSignal, send?: typeof fetch): Promise<CoverDraft> {
  const response = await requestApi(`/api/campaigns/drafts/${encodeURIComponent(campaignId)}/cover`, {
    method: 'PATCH',
    body: { fileId, altText: altText.trim() }, signal
  }, send)
  const cover = parseCover(await readJson(response))
  if (!cover) throw new SessionError(0)
  return cover
}

export function coverImageUrl(cover: CoverDraft): string {
  return cover.imageUrl || fileUrl({ id: cover.fileId, visibility: 'PUBLIC' })
}
