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
import { CampaignSections } from './application/sections'
import { SectionsController } from './infrastructure/sections.controller'
import { TypeormSectionsRepository } from './infrastructure/typeorm-sections.repository'
import { CampaignSubmission } from './application/submission'
import { SubmissionController } from './infrastructure/submission.controller'
import { TypeormSubmissionRepository } from './infrastructure/typeorm-submission.repository'

@Module({
  imports: [RolesModule, OrganizationsModule, DatabaseModule],
  controllers: [DraftController, ModalityController, GeneralController, SectionsController, SubmissionController],
  providers: [
    SessionMutationGuard, TypeormDraftRepository, TypeormModalityRepository, TypeormGeneralRepository, TypeormSectionsRepository, TypeormSubmissionRepository,
    {
      provide: CampaignSubmission,
      inject: [TypeormDraftRepository, TypeormSubmissionRepository],
      useFactory: (drafts: TypeormDraftRepository, submission: TypeormSubmissionRepository) => new CampaignSubmission(drafts, submission)
    },
    {
      provide: CampaignSections,
      inject: [TypeormDraftRepository, TypeormSectionsRepository],
      useFactory: (drafts: TypeormDraftRepository, sections: TypeormSectionsRepository) => new CampaignSections(drafts, sections)
    },
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
