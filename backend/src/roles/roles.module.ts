import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { RoleAccess } from './application/roles'
import { PermissionAccess } from './application/permissions'
import { RoleGuard, RolesController } from './infrastructure/roles-http'
import { TypeormRoleRepository } from './infrastructure/typeorm-role.repository'
import { TypeormPermissionRepository } from './infrastructure/typeorm-permission.repository'
import { CreatorAdministration } from './application/creator-administration'
import { TypeormCreatorAdministrationRepository } from './infrastructure/typeorm-creator-administration.repository'
import { CreatorAdministrationController } from './infrastructure/creator-administration.controller'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
@Module({
  imports: [AuthModule, DatabaseModule], controllers: [RolesController, CreatorAdministrationController],
  providers: [
    RoleGuard, TypeormRoleRepository, TypeormPermissionRepository,
    SessionMutationGuard, TypeormCreatorAdministrationRepository,
    { provide: CreatorAdministration, inject: [TypeormCreatorAdministrationRepository], useFactory: (repository: TypeormCreatorAdministrationRepository) => new CreatorAdministration(repository) },
    { provide: RoleAccess, inject: [TypeormRoleRepository], useFactory: (repository: TypeormRoleRepository) => new RoleAccess(repository) },
    { provide: PermissionAccess, inject: [TypeormPermissionRepository], useFactory: (repository: TypeormPermissionRepository) => new PermissionAccess(repository) }
  ],
  exports: [RoleGuard, RoleAccess, PermissionAccess, AuthModule]
})
export class RolesModule {}
