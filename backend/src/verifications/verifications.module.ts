import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { FilesModule } from '../files/files.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import { Verifications } from './application/verifications'
import { VerificationController } from './infrastructure/verification.controller'
import { TypeormVerificationRepository } from './infrastructure/typeorm-verification.repository'
import { OrganizationManagement, OrganizationManagementController } from './infrastructure/organization-management.controller'
import { PartyAdministration, PartyAdministrationController } from './infrastructure/party-administration.controller'
import {VerificationReviewController,VerificationBadgeController} from './infrastructure/verification-review.controller'
@Module({ imports: [RolesModule, FilesModule, DatabaseModule], controllers: [VerificationController, OrganizationManagementController, PartyAdministrationController,VerificationReviewController,VerificationBadgeController], providers: [PartyAdministration, OrganizationManagement, SessionMutationGuard,CaseWriteLimitGuard, TypeormVerificationRepository,
  { provide: Verifications, inject: [TypeormVerificationRepository], useFactory: (repository: TypeormVerificationRepository) => new Verifications(repository) }] })
export class VerificationsModule {}
