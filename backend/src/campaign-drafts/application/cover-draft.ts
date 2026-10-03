import { FileAccessDenied, FileUnavailable, type AuthorizedFileReader } from '../../files/application/files'

export interface CampaignCoverDraft {
  campaignId: string
  ownerUserId: string
  fileId: string
  altText: string
  imageUrl: string
  updatedAt: string
}

export interface CoverDraftRepository {
  read(ownerUserId: string, campaignId: string): Promise<CampaignCoverDraft | null>
  save(input: CampaignCoverDraft): Promise<CampaignCoverDraft>
}

export class InvalidCampaignCover extends Error {}
export class CampaignCoverUnavailable extends Error {}

export class CampaignCoverDrafts {
  constructor(private readonly repository: CoverDraftRepository, private readonly files: AuthorizedFileReader) {}

  read(ownerUserId: string, campaignId: string): Promise<CampaignCoverDraft | null> {
    return this.repository.read(ownerUserId, campaignId)
  }

  async save(ownerUserId: string, campaignId: string, fileId: string, altText: string): Promise<CampaignCoverDraft> {
    const text = altText.trim()
    if (text.length < 10 || text.length > 180) throw new InvalidCampaignCover()
    try {
      const uploaded = await this.files.privateDownload(fileId, ownerUserId)
      if (uploaded.file.ownerUserId !== ownerUserId) throw new FileAccessDenied()
      if (uploaded.file.visibility !== 'PUBLIC' || uploaded.file.purpose !== 'CAMPAIGN_PUBLIC_IMAGE') throw new InvalidCampaignCover()
      return this.repository.save({
        campaignId,
        ownerUserId,
        fileId,
        altText: text,
        imageUrl: `/api/files/public/${fileId}`,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      if (error instanceof FileUnavailable || error instanceof FileAccessDenied) throw new CampaignCoverUnavailable()
      throw error
    }
  }
}
