import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { ProgressRepository } from './infrastructure/progress.repository'
import { ProgressController } from './infrastructure/progress.controller'
import { AdministrativeDashboardController } from './infrastructure/administrative-dashboard.controller'
import { CreatorDashboardRepository } from './infrastructure/creator-dashboard.repository'
@Module({ imports: [RolesModule, DatabaseModule], controllers: [ProgressController, AdministrativeDashboardController], providers: [ProgressRepository, CreatorDashboardRepository, SessionMutationGuard] })
export class CampaignProgressModule {}
