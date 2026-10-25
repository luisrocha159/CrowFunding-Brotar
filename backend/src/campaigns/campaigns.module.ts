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
import { Projects } from './application/projects'
import { TypeormProjectRepository } from './infrastructure/typeorm-project.repository'
import { ProjectsController, CampaignReviewQueueController } from './infrastructure/projects.controller'
import { PublicCampaigns } from './application/public-campaigns'
import { TypeormPublicCampaignRepository } from './infrastructure/typeorm-public-campaign.repository'
import { PublicCampaignController } from './infrastructure/public-campaign.controller'
import { CampaignSections } from './application/sections'
import { CampaignSubmission } from './application/submission'
import { SectionsController } from './infrastructure/sections.controller'
import { SubmissionController } from './infrastructure/submission.controller'
import { TypeormSectionsRepository } from './infrastructure/typeorm-sections.repository'
import { TypeormSubmissionRepository } from './infrastructure/typeorm-submission.repository'
import { AdministrativeReview } from './application/administrative-review'
import { TypeormAdministrativeRepository } from './infrastructure/typeorm-administrative.repository'
import { AdministrativeReviewController } from './infrastructure/administrative-review.controller'
import { publicationEnabled } from './domain/administrative-review'
import { CampaignWriteLimitGuard } from './infrastructure/campaign-write-limit.guard'
import { Bookmarks } from './application/bookmarks'
import { TypeormBookmarkRepository } from './infrastructure/typeorm-bookmark.repository'
import { BookmarkController } from './infrastructure/bookmark.controller'

@Module({
  imports: [RolesModule, OrganizationsModule, DatabaseModule],
  controllers: [DraftController, ModalityController, GeneralController, ProjectsController, CampaignReviewQueueController, PublicCampaignController, SectionsController, SubmissionController, AdministrativeReviewController, BookmarkController],
  providers: [
    TypeormBookmarkRepository,
    { provide: Bookmarks, inject: [TypeormBookmarkRepository], useFactory: (repository: TypeormBookmarkRepository) => new Bookmarks(repository) },
    SessionMutationGuard, CampaignWriteLimitGuard, TypeormDraftRepository, TypeormModalityRepository, TypeormGeneralRepository,
    TypeormSectionsRepository, TypeormSubmissionRepository,
    { provide: CampaignSections, inject: [TypeormDraftRepository, TypeormSectionsRepository], useFactory: (drafts: TypeormDraftRepository, sections: TypeormSectionsRepository) => new CampaignSections(drafts, sections) },
    { provide: CampaignSubmission, inject: [TypeormDraftRepository, TypeormSubmissionRepository], useFactory: (drafts: TypeormDraftRepository, submission: TypeormSubmissionRepository) => new CampaignSubmission(drafts, submission) },
    TypeormProjectRepository,
    TypeormAdministrativeRepository,
    { provide: AdministrativeReview, inject: [TypeormAdministrativeRepository], useFactory: (repository: TypeormAdministrativeRepository) => new AdministrativeReview(repository, publicationEnabled(process.env)) },
    { provide: Projects, inject: [TypeormProjectRepository], useFactory: (repository: TypeormProjectRepository) => new Projects(repository) },
    TypeormPublicCampaignRepository,
    { provide: PublicCampaigns, inject: [TypeormPublicCampaignRepository], useFactory: (repository: TypeormPublicCampaignRepository) => new PublicCampaigns(repository) },
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
