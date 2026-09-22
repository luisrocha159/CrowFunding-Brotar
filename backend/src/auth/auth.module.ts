import { createHash, randomBytes } from 'node:crypto'
import { Module } from '@nestjs/common'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { UsersModule } from '../users/users.module'
import { ScryptPasswordHasher } from '../users/infrastructure/scrypt-password-hasher'
import { PasswordRecovery } from './application/password-recovery'
import { SmtpRecoveryDelivery } from './infrastructure/smtp-recovery-delivery'
import { LocalRecoveryDelivery } from './infrastructure/local-recovery-delivery'
import { Sessions } from './application/sessions'
import { TypeormPasswordRecoveryRepository } from './infrastructure/typeorm-password-recovery.repository'
import { TypeormSessionRepository } from './infrastructure/typeorm-session.repository'
import { PasswordRecoveryController } from './infrastructure/http/password-recovery.controller'
import { LoginLimitGuard, SessionController } from './infrastructure/http/session.controller'
import { SessionMutationGuard } from './infrastructure/http/session-http'

const hash = (raw: string): string => createHash('sha256').update(raw).digest('hex')
const createToken = () => { const raw = randomBytes(32).toString('hex'); return { raw, hash: hash(raw), expiresAt: new Date(Date.now() + 3600000) } }
@Module({
  imports: [DatabaseModule, UsersModule], controllers: [SessionController, PasswordRecoveryController],
  providers: [TypeormSessionRepository, TypeormPasswordRecoveryRepository, SmtpRecoveryDelivery, LoginLimitGuard, SessionMutationGuard, {
    provide: Sessions, inject: [TypeormSessionRepository, ScryptPasswordHasher],
    useFactory: (repository: TypeormSessionRepository, passwords: ScryptPasswordHasher) => new Sessions(repository, passwords, {
      hash, create: createToken
    })
  }, {
    provide: PasswordRecovery, inject: [TypeormPasswordRecoveryRepository, ScryptPasswordHasher, SmtpRecoveryDelivery],
    useFactory: (repository: TypeormPasswordRecoveryRepository, passwords: ScryptPasswordHasher, delivery: SmtpRecoveryDelivery) =>
      new PasswordRecovery(repository, passwords, { hash, create: createToken }, false,
        process.env.PASSWORD_RESET_LOCAL_FILE === 'true' ? new LocalRecoveryDelivery(process.env) : delivery)
  }], exports: [Sessions]
})
export class AuthModule {}
