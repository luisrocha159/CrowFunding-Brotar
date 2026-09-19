import { Module } from '@nestjs/common'
import { FilesModule } from '../files/files.module'
import { Files } from '../files/application/files'
import { RolesModule } from '../roles/roles.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { CampaignCoverDrafts } from './application/cover-draft'
import { CoverDraftController } from './infrastructure/cover-draft.controller'
import { LocalCoverDraftRepository } from './infrastructure/local-cover-draft.repository'

@Module({
  imports: [RolesModule, FilesModule],
  controllers: [CoverDraftController],
  providers: [
    SessionMutationGuard,
    LocalCoverDraftRepository,
    { provide: CampaignCoverDrafts, inject: [LocalCoverDraftRepository, Files], useFactory: (repository: LocalCoverDraftRepository, files: Files) => new CampaignCoverDrafts(repository, files) }
  ]
})
export class CampaignDraftsModule {}
