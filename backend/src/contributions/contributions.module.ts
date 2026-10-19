import { Controller, Get, Header, Module, NotFoundException, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../roles/infrastructure/roles-http'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { ContributionLedger } from './infrastructure/contribution-ledger'

@Controller('contributions') @UseGuards(RoleGuard) @RequirePermissions('contribution.read.own')
export class ContributionController {
  constructor(private readonly ledger: ContributionLedger) {}
  @Get(':id') @Header('Cache-Control','no-store')
  async own(@Req() request: AuthenticatedRequest, @Param('id',new ParseUUIDPipe()) id: string) {
    const item = await this.ledger.own(request.brotarUser.id,id)
    if (!item) throw new NotFoundException('Aporte no disponible.')
    return item
  }
}

@Module({ imports: [RolesModule,DatabaseModule], controllers: [ContributionController], providers: [ContributionLedger], exports: [ContributionLedger] })
export class ContributionsModule {}
