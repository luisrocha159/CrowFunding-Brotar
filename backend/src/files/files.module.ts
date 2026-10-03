import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Files } from './application/files'
import { FileController } from './infrastructure/file.controller'
import { TypeormFileStorage } from './infrastructure/typeorm-file-storage'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'

@Module({
  imports: [RolesModule, DatabaseModule],
  controllers: [FileController],
  providers: [SessionMutationGuard, TypeormFileStorage, { provide: Files, inject: [TypeormFileStorage], useFactory: (storage: TypeormFileStorage) => new Files(storage) }],
  exports: [Files]
})
export class FilesModule {}
