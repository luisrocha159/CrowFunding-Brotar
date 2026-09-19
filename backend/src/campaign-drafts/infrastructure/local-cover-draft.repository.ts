import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Injectable } from '@nestjs/common'
import type { CampaignCoverDraft, CoverDraftRepository } from '../application/cover-draft'

type Manifest = { covers: CampaignCoverDraft[] }

function manifestPath(): string {
  return process.env.CAMPAIGN_DRAFT_STORAGE_FILE ?? join(process.cwd(), 'private', 'campaign-drafts', 'covers.json')
}

@Injectable()
export class LocalCoverDraftRepository implements CoverDraftRepository {
  private readonly path = manifestPath()

  private async manifest(): Promise<Manifest> {
    try { return JSON.parse(await readFile(this.path, 'utf8')) as Manifest }
    catch { return { covers: [] } }
  }

  private async write(manifest: Manifest): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    await writeFile(this.path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  }

  async read(ownerUserId: string): Promise<CampaignCoverDraft | null> {
    return (await this.manifest()).covers.find(cover => cover.ownerUserId === ownerUserId) ?? null
  }

  async save(input: CampaignCoverDraft): Promise<CampaignCoverDraft> {
    const manifest = await this.manifest()
    const index = manifest.covers.findIndex(cover => cover.ownerUserId === input.ownerUserId)
    if (index >= 0) manifest.covers[index] = input
    else manifest.covers.push(input)
    await this.write(manifest)
    return input
  }
}
