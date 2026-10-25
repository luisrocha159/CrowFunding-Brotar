import { textError } from '../../../backend/src/campaigns/domain/input-policy'
import { normalizeVideoUrl } from '../../../backend/src/campaigns/domain/media'
import { requestApi, readJson } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'

export interface GalleryImage { fileId: string; caption: string }
export interface Gallery { revision: string; images: GalleryImage[]; videoUrl: string | null }
export type PublicGalleryData = Omit<Gallery, 'revision'>
export function validateGallery(input: PublicGalleryData): string | null {
  if (input.images.length > 20) return 'Puedes añadir hasta 20 imágenes.'
  if (input.images.some(image => textError(image.caption, 1, 300))) return 'Cada imagen necesita una descripción de 1–300 caracteres de texto.'
  if (new Set(input.images.map(image => image.fileId)).size !== input.images.length) return 'No repitas una misma imagen en la galería.'
  try { normalizeVideoUrl(input.videoUrl) } catch { return 'Usa un enlace HTTPS de YouTube (watch o youtu.be) o Vimeo.' }
  return null
}
export function galleryFrom(value: unknown, publicOnly = false): Gallery {
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const data = value as Record<string, unknown>
  if ((!publicOnly && typeof data.revision !== 'string') || !Array.isArray(data.images) || data.images.length > 20 ||
    data.images.some(image => !image || typeof image !== 'object' || typeof image.fileId !== 'string' || !/^[a-f\d-]{36}$/i.test(image.fileId) || typeof image.caption !== 'string') ||
    (data.videoUrl !== null && typeof data.videoUrl !== 'string')) throw new SessionError(0)
  const result = { revision: publicOnly ? '' : data.revision as string, images: data.images as GalleryImage[], videoUrl: data.videoUrl as string | null }
  if (validateGallery(result)) throw new SessionError(0)
  return result
}
export async function readGallery(id: string, signal?: AbortSignal, publicOnly = false): Promise<Gallery> {
  return galleryFrom(await readJson(await requestApi(`/api/campaigns/${publicOnly ? 'public' : 'drafts'}/${encodeURIComponent(id)}/gallery`, { signal })), publicOnly)
}
export async function saveGallery(id: string, value: Gallery, signal?: AbortSignal, send?: typeof fetch): Promise<Gallery> {
  if (validateGallery(value)) throw new SessionError(400)
  return galleryFrom(await readJson(await requestApi(`/api/campaigns/drafts/${encodeURIComponent(id)}/gallery`, { method: 'PUT', body: value, signal }, send)))
}
