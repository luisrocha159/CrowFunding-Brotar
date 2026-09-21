import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Organizations } from './application/organizations'
import { Memberships } from './application/memberships'
import { OrganizationController, OrganizationLimitGuard } from './infrastructure/organization.controller'
import { TypeormOrganizationRepository } from './infrastructure/typeorm-organization.repository'
import { TypeormMembershipRepository } from './infrastructure/typeorm-membership.repository'
@Module({
  imports: [RolesModule, DatabaseModule], controllers: [OrganizationController],
  providers: [
    SessionMutationGuard, OrganizationLimitGuard, TypeormOrganizationRepository, TypeormMembershipRepository,
    { provide: Organizations, inject: [TypeormOrganizationRepository], useFactory: (repository: TypeormOrganizationRepository) => new Organizations(repository) },
    { provide: Memberships, inject: [TypeormMembershipRepository], useFactory: (repository: TypeormMembershipRepository) => new Memberships(repository) }
  ],
  exports: [Memberships]
})
export class OrganizationsModule {}
