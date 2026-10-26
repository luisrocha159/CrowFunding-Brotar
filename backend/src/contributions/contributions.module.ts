import { BadRequestException, Controller, Get, Header, Module, NotFoundException, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common'
import { IsOptional, IsUUID, Matches } from 'class-validator'
import { RolesModule } from '../roles/roles.module'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../roles/infrastructure/roles-http'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { ContributionLedger } from './infrastructure/contribution-ledger'
import { LedgerInvalid } from './domain/payment'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { TypeormSimulationRepository } from './infrastructure/typeorm-simulation.repository'
import { SimulationController } from './infrastructure/simulation.controller'
import { Contributions } from './application/contributions'
import { TypeormContributionRepository } from './infrastructure/typeorm-contribution.repository'
import { ContributionController as ContributionHistoryController } from './infrastructure/contribution.controller'

export class ContributionPageDto {
  @Matches(/^(?:[1-9]|[1-4]\d|50)$/) limit = '20'
  @IsOptional() @IsUUID() cursor?: string
}

@Controller('contributions') @UseGuards(RoleGuard) @RequirePermissions('contribution.read.own')
export class ContributionController {
  constructor(private readonly ledger: ContributionLedger) {}
  @Get() @Header('Cache-Control','no-store')
  async list(@Req() request: AuthenticatedRequest, @Query() input: ContributionPageDto) {
    try { return await this.ledger.listOwn(request.brotarUser.id,Number(input.limit),input.cursor) }
    catch (error) {
      if (error instanceof LedgerInvalid) throw new BadRequestException(error.message)
      throw error
    }
  }
  @Get(':id') @Header('Cache-Control','no-store')
  async own(@Req() request: AuthenticatedRequest, @Param('id',new ParseUUIDPipe()) id: string) {
    const item = await this.ledger.own(request.brotarUser.id,id)
    if (!item) throw new NotFoundException('Aporte no disponible.')
    return item
  }
}

@Module({
  imports: [RolesModule, DatabaseModule], controllers: [ContributionController, ContributionHistoryController, SimulationController],
  providers: [ContributionLedger, TypeormSimulationRepository, SessionMutationGuard, TypeormContributionRepository, { provide: Contributions, inject: [TypeormContributionRepository], useFactory: (repository: TypeormContributionRepository) => new Contributions(repository) }],
  exports: [ContributionLedger]
})
export class ContributionsModule {}
