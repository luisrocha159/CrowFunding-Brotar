export type FileVisibility = 'PUBLIC' | 'PRIVATE'
export type FilePurpose = 'PROFILE_AVATAR' | 'ORGANIZATION_DOCUMENT' | 'CAMPAIGN_PUBLIC_IMAGE'

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

export interface FileUploadInput {
  visibility: FileVisibility
  purpose: FilePurpose
  originalName: string
  mimeType: string
  contentBase64: string
}

export interface FileDownload {
  file: StoredFile
  content: Buffer
}

/** Lectura autorizada que necesitan otros casos de uso, sin carga ni eliminación. */
export interface AuthorizedFileReader {
  privateDownload(id: string, userId: string): Promise<FileDownload>
}

export interface FileStorage {
  save(ownerUserId: string, input: FileUploadInput, content: Buffer): Promise<StoredFile>
  read(id: string): Promise<FileDownload | null>
  delete(id: string, ownerUserId: string): Promise<boolean>
}

export class InvalidFileUpload extends Error {}
export class FileAccessDenied extends Error {}
export class FileUnavailable extends Error {}
export class FileInUse extends Error {}

const MAX_PUBLIC_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_PRIVATE_DOCUMENT_BYTES = 5 * 1024 * 1024
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const privateTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])

function decodeBase64(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new InvalidFileUpload()
  return Buffer.from(value, 'base64')
}

function matchesSignature(mimeType: string, content: Buffer): boolean {
  if (mimeType === 'image/png') return content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (mimeType === 'image/jpeg') return content[0] === 255 && content[1] === 216 && content[2] === 255
  if (mimeType === 'image/webp') return content.subarray(0, 4).toString() === 'RIFF' && content.subarray(8, 12).toString() === 'WEBP'
  if (mimeType === 'application/pdf') return content.subarray(0, 5).toString() === '%PDF-'
  return false
}

function assertUpload(input: FileUploadInput, content: Buffer): void {
  if (!input.originalName.trim() || input.originalName.length > 160 || /[\\/]/.test(input.originalName)) throw new InvalidFileUpload()
  if (content.length === 0) throw new InvalidFileUpload()
  // Comprobación básica de firma: no confiar solamente en el MIME declarado.
  // No sustituye análisis antivirus ni validación documental/KYB.
  if (!matchesSignature(input.mimeType, content)) throw new InvalidFileUpload()
  if (input.visibility === 'PUBLIC') {
    if (input.purpose !== 'PROFILE_AVATAR' && input.purpose !== 'CAMPAIGN_PUBLIC_IMAGE') throw new InvalidFileUpload()
    if (!imageTypes.has(input.mimeType) || content.length > MAX_PUBLIC_IMAGE_BYTES) throw new InvalidFileUpload()
  } else {
    if (input.purpose !== 'ORGANIZATION_DOCUMENT') throw new InvalidFileUpload()
    if (!privateTypes.has(input.mimeType) || content.length > MAX_PRIVATE_DOCUMENT_BYTES) throw new InvalidFileUpload()
  }
}

export class Files implements AuthorizedFileReader {
  constructor(private readonly storage: FileStorage) {}

  async upload(ownerUserId: string, input: FileUploadInput): Promise<StoredFile> {
    const content = decodeBase64(input.contentBase64)
    assertUpload(input, content)
    return this.storage.save(ownerUserId, input, content)
  }

  async publicDownload(id: string): Promise<FileDownload> {
    const result = await this.storage.read(id)
    if (!result || result.file.visibility !== 'PUBLIC') throw new FileUnavailable()
    return result
  }

  async privateDownload(id: string, userId: string): Promise<FileDownload> {
    const result = await this.storage.read(id)
    if (!result) throw new FileUnavailable()
    if (result.file.visibility !== 'PUBLIC' && result.file.ownerUserId !== userId) throw new FileAccessDenied()
    return result
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!await this.storage.delete(id, userId)) throw new FileUnavailable()
  }
}
