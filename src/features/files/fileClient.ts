import { SessionError } from '../access/session/sessionClient'

export type FileVisibility = 'PUBLIC' | 'PRIVATE'
export type FilePurpose = 'PROFILE_AVATAR' | 'ORGANIZATION_DOCUMENT' | 'CAMPAIGN_PUBLIC_IMAGE'
export interface FileUploadInput {
  visibility: FileVisibility
  purpose: FilePurpose
  originalName: string
  mimeType: string
  contentBase64: string
}
export interface StoredFile {
  id: string
  ownerUserId: string
  visibility: FileVisibility
  purpose: FilePurpose
  originalName: string
  mimeType: string
  sizeBytes: number
  sha256: string
  createdAt: string
}

export const FILE_LIMITS = {
  publicImageBytes: 2 * 1024 * 1024,
  privateDocumentBytes: 5 * 1024 * 1024
} as const

export function validateFileUpload(input: FileUploadInput): Partial<Record<keyof FileUploadInput, string>> {
  const errors: Partial<Record<keyof FileUploadInput, string>> = {}
  const approxBytes = Math.floor(input.contentBase64.length * 3 / 4)
  if (!['PUBLIC', 'PRIVATE'].includes(input.visibility)) errors.visibility = 'Selecciona privacidad pública o privada.'
  if (!['PROFILE_AVATAR', 'ORGANIZATION_DOCUMENT', 'CAMPAIGN_PUBLIC_IMAGE'].includes(input.purpose)) errors.purpose = 'Selecciona un uso permitido.'
  if (!input.originalName.trim() || input.originalName.length > 160 || /[\\/]/.test(input.originalName)) errors.originalName = 'Usa un nombre de archivo válido.'
  if (input.visibility === 'PUBLIC') {
    if (!['PROFILE_AVATAR', 'CAMPAIGN_PUBLIC_IMAGE'].includes(input.purpose)) errors.purpose = 'Los documentos no pueden publicarse como archivo público.'
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(input.mimeType)) errors.mimeType = 'Los archivos públicos deben ser imágenes PNG, JPG o WebP.'
    if (approxBytes > FILE_LIMITS.publicImageBytes) errors.contentBase64 = 'La imagen pública debe pesar hasta 2 MB.'
  } else {
    if (input.purpose !== 'ORGANIZATION_DOCUMENT') errors.purpose = 'Los archivos privados admiten documentos de organización.'
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(input.mimeType)) errors.mimeType = 'El archivo privado debe ser PDF o imagen.'
    if (approxBytes > FILE_LIMITS.privateDocumentBytes) errors.contentBase64 = 'El archivo privado debe pesar hasta 5 MB.'
  }
  return errors
}

function parseStoredFile(value: unknown): StoredFile {
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const file = value as Record<string, unknown>
  for (const key of ['id', 'ownerUserId', 'visibility', 'purpose', 'originalName', 'mimeType', 'sha256', 'createdAt']) {
    if (typeof file[key] !== 'string') throw new SessionError(0)
  }
  if (typeof file.sizeBytes !== 'number' || file.sizeBytes < 0) throw new SessionError(0)
  if (file.visibility !== 'PUBLIC' && file.visibility !== 'PRIVATE') throw new SessionError(0)
  if (!['PROFILE_AVATAR', 'ORGANIZATION_DOCUMENT', 'CAMPAIGN_PUBLIC_IMAGE'].includes(file.purpose as string)) throw new SessionError(0)
  return file as unknown as StoredFile
}

export async function uploadFile(input: FileUploadInput, signal?: AbortSignal, send: typeof fetch = fetch): Promise<StoredFile> {
  const errors = validateFileUpload(input)
  if (Object.keys(errors).length) throw new SessionError(400)
  try {
    const response = await send('/api/files', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1' },
      body: JSON.stringify({ ...input, originalName: input.originalName.trim() }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new SessionError(response.status)
    return parseStoredFile(await response.json())
  } catch (error) { throw error instanceof SessionError ? error : new SessionError(0) }
}

export function fileUrl(file: Pick<StoredFile, 'id' | 'visibility'>): string {
  return file.visibility === 'PUBLIC' ? `/api/files/public/${file.id}` : `/api/files/${file.id}`
}
