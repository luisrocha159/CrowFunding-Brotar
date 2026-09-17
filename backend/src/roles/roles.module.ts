import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { RoleAccess } from './application/roles'
import { RoleGuard, RolesController } from './infrastructure/roles-http'
import { TypeormRoleRepository } from './infrastructure/typeorm-role.repository'
@Module({
  imports: [AuthModule, DatabaseModule], controllers: [RolesController],
  providers: [RoleGuard, TypeormRoleRepository, { provide: RoleAccess, inject: [TypeormRoleRepository], useFactory: (repository: TypeormRoleRepository) => new RoleAccess(repository) }],
  exports: [RoleGuard, RoleAccess, AuthModule]
})
export class RolesModule {}
