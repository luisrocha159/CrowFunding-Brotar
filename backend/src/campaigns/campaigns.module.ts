import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { OrganizationsModule } from '../organizations/organizations.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Memberships } from '../organizations/application/memberships'
import { Drafts } from './application/drafts'
import { Modalities } from './application/modality'
import { GeneralInfo } from './application/general'
import { DraftController } from './infrastructure/draft.controller'
import { ModalityController } from './infrastructure/modality.controller'
import { GeneralController } from './infrastructure/general.controller'
import { TypeormDraftRepository } from './infrastructure/typeorm-draft.repository'
import { TypeormModalityRepository } from './infrastructure/typeorm-modality.repository'
import { TypeormGeneralRepository } from './infrastructure/typeorm-general.repository'
import { PublicCampaigns } from './application/public-campaigns'
import { PublicCampaignController } from './infrastructure/public-campaign.controller'

@Module({
  imports: [RolesModule, OrganizationsModule, DatabaseModule],
  controllers: [DraftController, ModalityController, GeneralController, PublicCampaignController],
  providers: [
    SessionMutationGuard, TypeormDraftRepository, TypeormModalityRepository, TypeormGeneralRepository, PublicCampaigns,
    {
      provide: Drafts,
      inject: [TypeormDraftRepository, Memberships],
      useFactory: (repository: TypeormDraftRepository, memberships: Memberships) => new Drafts(repository, memberships)
    },
    {
      provide: Modalities,
      inject: [TypeormDraftRepository, TypeormModalityRepository],
      useFactory: (drafts: TypeormDraftRepository, modality: TypeormModalityRepository) => new Modalities(drafts, modality)
    },
    {
      provide: GeneralInfo,
      inject: [TypeormDraftRepository, TypeormGeneralRepository],
      useFactory: (drafts: TypeormDraftRepository, general: TypeormGeneralRepository) => new GeneralInfo(drafts, general)
    }
  ],
  exports: [Drafts, Modalities, GeneralInfo]
})
export class CampaignsModule {}
