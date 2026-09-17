import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Organizations } from './application/organizations'
import { OrganizationController, OrganizationLimitGuard } from './infrastructure/organization.controller'
import { TypeormOrganizationRepository } from './infrastructure/typeorm-organization.repository'
@Module({
  imports: [RolesModule, DatabaseModule], controllers: [OrganizationController],
  providers: [SessionMutationGuard, OrganizationLimitGuard, TypeormOrganizationRepository, { provide: Organizations, inject: [TypeormOrganizationRepository], useFactory: (repository: TypeormOrganizationRepository) => new Organizations(repository) }]
})
export class OrganizationsModule {}
