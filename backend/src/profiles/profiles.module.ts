import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { Profiles } from './application/profile'
import { ProfileController } from './infrastructure/profile.controller'
import { TypeormProfileRepository } from './infrastructure/typeorm-profile.repository'

@Module({
  imports: [AuthModule, DatabaseModule], controllers: [ProfileController],
  providers: [SessionMutationGuard, TypeormProfileRepository, {
    provide: Profiles, inject: [TypeormProfileRepository],
    useFactory: (repository: TypeormProfileRepository) => new Profiles(repository)
  }]
})
export class ProfilesModule {}
