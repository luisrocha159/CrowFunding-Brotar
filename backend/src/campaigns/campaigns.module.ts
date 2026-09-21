import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { OrganizationsModule } from '../organizations/organizations.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Memberships } from '../organizations/application/memberships'
import { Drafts } from './application/drafts'
import { Modalities } from './application/modality'
import { DraftController } from './infrastructure/draft.controller'
import { ModalityController } from './infrastructure/modality.controller'
import { TypeormDraftRepository } from './infrastructure/typeorm-draft.repository'
import { TypeormModalityRepository } from './infrastructure/typeorm-modality.repository'

@Module({
  imports: [RolesModule, OrganizationsModule, DatabaseModule],
  controllers: [DraftController, ModalityController],
  providers: [
    SessionMutationGuard, TypeormDraftRepository, TypeormModalityRepository,
    {
      provide: Drafts,
      inject: [TypeormDraftRepository, Memberships],
      useFactory: (repository: TypeormDraftRepository, memberships: Memberships) => new Drafts(repository, memberships)
    },
    {
      provide: Modalities,
      inject: [TypeormDraftRepository, TypeormModalityRepository],
      useFactory: (drafts: TypeormDraftRepository, modality: TypeormModalityRepository) => new Modalities(drafts, modality)
    }
  ],
  exports: [Drafts, Modalities]
})
export class CampaignsModule {}
