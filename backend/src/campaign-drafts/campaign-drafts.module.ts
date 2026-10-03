import { Module } from '@nestjs/common'
import { FilesModule } from '../files/files.module'
import { Files } from '../files/application/files'
import { RolesModule } from '../roles/roles.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { CampaignCoverDrafts } from './application/cover-draft'
import { CoverDraftController } from './infrastructure/cover-draft.controller'
import { TypeormCoverDraftRepository } from './infrastructure/typeorm-cover-draft.repository'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'

@Module({
  imports: [RolesModule, FilesModule, DatabaseModule],
  controllers: [CoverDraftController],
  providers: [
    SessionMutationGuard,
    TypeormCoverDraftRepository,
    { provide: CampaignCoverDrafts, inject: [TypeormCoverDraftRepository, Files], useFactory: (repository: TypeormCoverDraftRepository, files: Files) => new CampaignCoverDrafts(repository, files) }
  ]
})
export class CampaignDraftsModule {}
