import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common'
import { PublicCampaigns } from '../application/public-campaigns'

@Controller('campaigns/public')
export class PublicCampaignController {
  constructor(private readonly campaigns: PublicCampaigns) {}

  @Get() @Header('Cache-Control', 'no-store')
  list() { return this.campaigns.list() }

  @Get(':slug') @Header('Cache-Control', 'no-store')
  async find(@Param('slug') slug: string) {
    const [campaign] = await this.campaigns.list(slug)
    if (!campaign) throw new NotFoundException('Campaña no disponible.')
    return campaign
  }
}
