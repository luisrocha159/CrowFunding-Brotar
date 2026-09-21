import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { RoleAccess } from './application/roles'
import { PermissionAccess } from './application/permissions'
import { RoleGuard, RolesController } from './infrastructure/roles-http'
import { TypeormRoleRepository } from './infrastructure/typeorm-role.repository'
import { TypeormPermissionRepository } from './infrastructure/typeorm-permission.repository'
@Module({
  imports: [AuthModule, DatabaseModule], controllers: [RolesController],
  providers: [
    RoleGuard, TypeormRoleRepository, TypeormPermissionRepository,
    { provide: RoleAccess, inject: [TypeormRoleRepository], useFactory: (repository: TypeormRoleRepository) => new RoleAccess(repository) },
    { provide: PermissionAccess, inject: [TypeormPermissionRepository], useFactory: (repository: TypeormPermissionRepository) => new PermissionAccess(repository) }
  ],
  exports: [RoleGuard, RoleAccess, PermissionAccess, AuthModule]
})
export class RolesModule {}
