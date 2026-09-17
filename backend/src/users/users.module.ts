import { Module } from '@nestjs/common'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { RegisterUser } from './application/register-user'
import { RegistrationController } from './infrastructure/http/registration.controller'
import { RegistrationLimitGuard } from './infrastructure/http/registration-limit.guard'
import { TypeormRegistrationRepository } from './infrastructure/persistence/typeorm-registration.repository'
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher'

@Module({
  imports: [DatabaseModule], controllers: [RegistrationController],
  exports: [ScryptPasswordHasher],
  providers: [TypeormRegistrationRepository, ScryptPasswordHasher, RegistrationLimitGuard, {
    provide: RegisterUser, inject: [TypeormRegistrationRepository, ScryptPasswordHasher],
    useFactory: (users: TypeormRegistrationRepository, passwords: ScryptPasswordHasher) => new RegisterUser(users, passwords)
  }]
})
export class UsersModule {}
