import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { FilesModule } from '../files/files.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Verifications } from './application/verifications'
import { VerificationController } from './infrastructure/verification.controller'
import { TypeormVerificationRepository } from './infrastructure/typeorm-verification.repository'
import { OrganizationManagement, OrganizationManagementController } from './infrastructure/organization-management.controller'
import { PartyAdministration, PartyAdministrationController } from './infrastructure/party-administration.controller'
@Module({ imports: [RolesModule, FilesModule, DatabaseModule], controllers: [VerificationController, OrganizationManagementController, PartyAdministrationController], providers: [PartyAdministration, OrganizationManagement, SessionMutationGuard, TypeormVerificationRepository,
  { provide: Verifications, inject: [TypeormVerificationRepository], useFactory: (repository: TypeormVerificationRepository) => new Verifications(repository) }] })
export class VerificationsModule {}
