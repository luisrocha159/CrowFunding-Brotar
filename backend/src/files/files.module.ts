import { Module } from '@nestjs/common'
import { RolesModule } from '../roles/roles.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { Files } from './application/files'
import { FileController } from './infrastructure/file.controller'
import { LocalFileStorage } from './infrastructure/local-file-storage'

@Module({
  imports: [RolesModule],
  controllers: [FileController],
  providers: [SessionMutationGuard, LocalFileStorage, { provide: Files, inject: [LocalFileStorage], useFactory: (storage: LocalFileStorage) => new Files(storage) }],
  exports: [Files]
})
export class FilesModule {}
