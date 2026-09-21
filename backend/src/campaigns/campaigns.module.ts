import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { OrganizationsModule } from '../organizations/organizations.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Memberships } from '../organizations/application/memberships'
import { Drafts } from './application/drafts'
import { DraftController } from './infrastructure/draft.controller'
import { TypeormDraftRepository } from './infrastructure/typeorm-draft.repository'

@Module({
  imports: [RolesModule, OrganizationsModule, DatabaseModule],
  controllers: [DraftController],
  providers: [
    SessionMutationGuard, TypeormDraftRepository,
    {
      provide: Drafts,
      inject: [TypeormDraftRepository, Memberships],
      useFactory: (repository: TypeormDraftRepository, memberships: Memberships) => new Drafts(repository, memberships)
    }
  ],
  exports: [Drafts]
})
export class CampaignsModule {}
