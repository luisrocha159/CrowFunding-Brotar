import { Module } from '@nestjs/common'
import { HealthModule } from './health/health.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { ProfilesModule } from './profiles/profiles.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { CatalogsModule } from './catalogs/catalogs.module'
import { CampaignsModule } from './campaigns/campaigns.module'
import { FilesModule } from './files/files.module'
import { CampaignDraftsModule } from './campaign-drafts/campaign-drafts.module'

import { CampaignProgressModule } from './campaign-progress/campaign-progress.module'
import { ContributionsModule } from './contributions/contributions.module'
import { VerificationsModule } from './verifications/verifications.module'

import { SupportCasesModule } from './support-cases/support-cases.module'

@Module({ imports: [SupportCasesModule, CampaignProgressModule, ContributionsModule, VerificationsModule, HealthModule, UsersModule, AuthModule, ProfilesModule, OrganizationsModule, CatalogsModule, CampaignsModule, FilesModule, CampaignDraftsModule] })
export class AppModule {}
