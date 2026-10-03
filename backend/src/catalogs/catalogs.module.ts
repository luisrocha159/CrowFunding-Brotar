import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Categories, Settings } from './application/categories'
import { CategoryAdminController, CategoryController } from './infrastructure/category.controller'
import { SettingController } from './infrastructure/setting.controller'
import { TypeormCategoryRepository, TypeormSettingRepository } from './infrastructure/typeorm-category.repository'

@Module({
  imports: [RolesModule, DatabaseModule],
  controllers: [CategoryController, CategoryAdminController, SettingController],
  providers: [
    SessionMutationGuard, TypeormCategoryRepository, TypeormSettingRepository,
    { provide: Categories, inject: [TypeormCategoryRepository], useFactory: (repository: TypeormCategoryRepository) => new Categories(repository) },
    { provide: Settings, inject: [TypeormSettingRepository], useFactory: (repository: TypeormSettingRepository) => new Settings(repository) }
  ],
  exports: [Categories]
})
export class CatalogsModule {}
