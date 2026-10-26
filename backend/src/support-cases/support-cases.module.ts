import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { FilesModule } from '../files/files.module'
import { CaseWriteLimitGuard } from '../shared/infrastructure/http/case-write-limit.guard'
import { SupportCases } from './application/support-cases'
import { SupportCaseController } from './infrastructure/support-case.controller'
import { SupportAdministrationController } from './infrastructure/support-administration.controller'
import { SupportCaseRepository } from './infrastructure/support-case.repository'
@Module({
  imports: [RolesModule, DatabaseModule, FilesModule], controllers: [SupportCaseController, SupportAdministrationController],
  providers: [SessionMutationGuard, CaseWriteLimitGuard, SupportCaseRepository, { provide: SupportCases, inject: [SupportCaseRepository], useFactory: (repository: SupportCaseRepository) => new SupportCases(repository) }]
})
export class SupportCasesModule {}
