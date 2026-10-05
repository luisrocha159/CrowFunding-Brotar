import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common'
import { PublicCampaigns, PublicCampaignMissing } from '../application/public-campaigns'

@Controller('campaigns/public')
export class PublicCampaignController {
  constructor(private readonly campaigns: PublicCampaigns) {}
  @Get() @Header('Cache-Control', 'no-store')
  list() { return this.campaigns.list() }
  @Get(':slug') @Header('Cache-Control', 'no-store')
  async find(@Param('slug') slug: string) {
    try { return await this.campaigns.find(slug) }
    catch (error) {
      if (error instanceof PublicCampaignMissing) throw new NotFoundException('Campaña no disponible.')
      throw error
    }
  }
}
