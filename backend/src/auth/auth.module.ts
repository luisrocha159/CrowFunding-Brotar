import { createHash, randomBytes } from 'node:crypto'
import { Module } from '@nestjs/common'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { UsersModule } from '../users/users.module'
import { ScryptPasswordHasher } from '../users/infrastructure/scrypt-password-hasher'
import { Sessions } from './application/sessions'
import { TypeormSessionRepository } from './infrastructure/typeorm-session.repository'
import { LoginLimitGuard, SessionController } from './infrastructure/http/session.controller'
import { SessionMutationGuard } from './infrastructure/http/session-http'

const hash = (raw: string): string => createHash('sha256').update(raw).digest('hex')
@Module({
  imports: [DatabaseModule, UsersModule], controllers: [SessionController],
  providers: [TypeormSessionRepository, LoginLimitGuard, SessionMutationGuard, {
    provide: Sessions, inject: [TypeormSessionRepository, ScryptPasswordHasher],
    useFactory: (repository: TypeormSessionRepository, passwords: ScryptPasswordHasher) => new Sessions(repository, passwords, {
      hash, create: () => { const raw = randomBytes(32).toString('hex'); return { raw, hash: hash(raw), expiresAt: new Date(Date.now() + 3600000) } }
    })
  }], exports: [Sessions]
})
export class AuthModule {}
