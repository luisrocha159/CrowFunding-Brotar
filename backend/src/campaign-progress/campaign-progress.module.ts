import {PublicationAdministrationController} from './infrastructure/publication-administration.controller'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { ProgressRepository } from './infrastructure/progress.repository'
import { ProgressController } from './infrastructure/progress.controller'
import { AdministrativeDashboardController } from './infrastructure/administrative-dashboard.controller'
import { CreatorDashboardRepository } from './infrastructure/creator-dashboard.repository'
@Module({ imports: [RolesModule, DatabaseModule], controllers: [PublicationAdministrationController, ProgressController, AdministrativeDashboardController], providers: [CaseWriteLimitGuard,ProgressRepository, CreatorDashboardRepository, SessionMutationGuard] })
export class CampaignProgressModule {}
