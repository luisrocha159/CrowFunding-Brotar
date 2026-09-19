import { Module } from '@nestjs/common'
import { HealthModule } from './health/health.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { ProfilesModule } from './profiles/profiles.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { FilesModule } from './files/files.module'
import { CampaignDraftsModule } from './campaign-drafts/campaign-drafts.module'

@Module({ imports: [HealthModule, UsersModule, AuthModule, ProfilesModule, OrganizationsModule, FilesModule, CampaignDraftsModule] })
export class AppModule {}
