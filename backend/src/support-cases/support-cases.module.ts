import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { SupportCases } from './application/support-cases'
import { SupportCaseController } from './infrastructure/support-case.controller'
import { SupportCaseRepository } from './infrastructure/support-case.repository'
@Module({
  imports: [RolesModule, DatabaseModule], controllers: [SupportCaseController],
  providers: [SessionMutationGuard, SupportCaseRepository, { provide: SupportCases, inject: [SupportCaseRepository], useFactory: (repository: SupportCaseRepository) => new SupportCases(repository) }]
})
export class SupportCasesModule {}
