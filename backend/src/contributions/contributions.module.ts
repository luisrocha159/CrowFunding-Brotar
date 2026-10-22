import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { TypeormSimulationRepository } from './infrastructure/typeorm-simulation.repository'
import { SimulationController } from './infrastructure/simulation.controller'
import { Contributions } from './application/contributions'
import { TypeormContributionRepository } from './infrastructure/typeorm-contribution.repository'
import { ContributionController } from './infrastructure/contribution.controller'
@Module({
  imports: [RolesModule, DatabaseModule], controllers: [ContributionController, SimulationController],
  providers: [TypeormSimulationRepository, SessionMutationGuard, TypeormContributionRepository, { provide: Contributions, inject: [TypeormContributionRepository], useFactory: (repository: TypeormContributionRepository) => new Contributions(repository) }]
})
export class ContributionsModule {}
