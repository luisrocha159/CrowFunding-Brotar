import { FileAccessDenied, FileUnavailable, type AuthorizedFileReader } from '../../files/application/files'
import { textError } from '../../campaigns/domain/input-policy'

export interface GalleryImage { fileId: string; caption: string }
export interface Gallery { revision: string; images: GalleryImage[]; videoUrl: string | null }
export interface GalleryRepository {
  readOwn(userId: string, campaignId: string): Promise<Gallery>
  readPublic(campaignId: string): Promise<Omit<Gallery, 'revision'>>
  save(userId: string, campaignId: string, gallery: Gallery): Promise<Gallery>
}
import { InvalidGallery, normalizeVideoUrl } from '../../campaigns/domain/media'
export { InvalidGallery, normalizeVideoUrl } from '../../campaigns/domain/media'
export class GalleryUnavailable extends Error {}
export class GalleryConflict extends Error {}


export class CampaignGalleries {
  constructor(private readonly repository: GalleryRepository, private readonly files: AuthorizedFileReader) {}
  readOwn(userId: string, id: string) { return this.repository.readOwn(userId, id) }
  readPublic(id: string) { return this.repository.readPublic(id) }
  async save(userId: string, id: string, input: Gallery): Promise<Gallery> {
    await this.repository.readOwn(userId, id)
    if (!input.revision || input.images.length > 20 || new Set(input.images.map(image => image.fileId)).size !== input.images.length) throw new InvalidGallery()
    const images = input.images.map(image => ({ ...image, caption: image.caption.trim() }))
    if (images.some(image => !/^[a-f\d-]{36}$/i.test(image.fileId) || textError(image.caption, 1, 300))) throw new InvalidGallery()
    const videoUrl = normalizeVideoUrl(input.videoUrl)
    for (const image of images) {
      try {
        const { file } = await this.files.privateDownload(image.fileId, userId)
        if (file.ownerUserId !== userId || file.visibility !== 'PUBLIC' || file.purpose !== 'CAMPAIGN_PUBLIC_IMAGE') throw new GalleryUnavailable()
      } catch (error) {
        if (error instanceof FileAccessDenied || error instanceof FileUnavailable) throw new GalleryUnavailable()
        throw error
      }
    }
    return this.repository.save(userId, id, { revision: input.revision, images, videoUrl })
  }
}
