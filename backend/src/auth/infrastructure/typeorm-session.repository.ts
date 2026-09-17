import { Injectable } from '@nestjs/common'
import { IsNull } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { UserSchema } from '../../users/infrastructure/persistence/user.schemas'
import type { Credentials, CurrentUser, SessionRepository } from '../application/sessions'
import { allowsBasicAccess, BASIC_ACCESS_STATUSES } from '../application/basic-access'
import { SessionTokenSchema } from './session-token.schema'

@Injectable()
export class TypeormSessionRepository implements SessionRepository {
  constructor(private readonly database: DatabaseService) {}
  async credentials(email: string): Promise<Credentials | null> {
    const user = await this.database.connection().getRepository(UserSchema).createQueryBuilder('u')
      .addSelect('u.passwordHash').where('u.email = :email AND u.deleted_at IS NULL', { email }).getOne()
    return user ? { id: user.id, passwordHash: user.passwordHash, status: user.status, lockedUntil: user.lockedUntil } : null
  }
  async failedAttempt(id: string): Promise<void> {
    await this.database.connection().query(`UPDATE public.app_user
      SET failed_login_count=CASE WHEN locked_until IS NOT NULL AND locked_until<=now() THEN 1 ELSE LEAST(failed_login_count+1,32767) END,
          locked_until=CASE WHEN locked_until IS NOT NULL AND locked_until<=now() THEN NULL WHEN failed_login_count >= 4 THEN now() + interval '15 minutes' ELSE locked_until END
      WHERE id=$1 AND deleted_at IS NULL AND (locked_until IS NULL OR locked_until <= now())`, [id])
  }
  async open(user: Credentials, tokenHash: string, expiresAt: Date, previousHash?: string): Promise<boolean> {
    return this.database.connection().transaction(async manager => {
      const current = await manager.getRepository(UserSchema).createQueryBuilder('u').addSelect('u.passwordHash')
        .setLock('pessimistic_write').where('u.id = :id AND u.deleted_at IS NULL', { id: user.id }).getOne()
      if (!current || !allowsBasicAccess(current.status) || current.passwordHash !== user.passwordHash
        || (current.lockedUntil && current.lockedUntil.getTime() > Date.now())) return false
      if (previousHash) await manager.getRepository(SessionTokenSchema).update({ tokenHash: previousHash, tokenType: 'SESSION', revokedAt: IsNull() }, { revokedAt: () => 'clock_timestamp()' })
      await manager.getRepository(SessionTokenSchema).insert({ userId: user.id, tokenType: 'SESSION', tokenHash, expiresAt })
      await manager.getRepository(UserSchema).update({ id: user.id }, { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null })
      return true
    })
  }
  async current(tokenHash: string): Promise<CurrentUser | null> {
    const rows: CurrentUser[] = await this.database.connection().query(`
      SELECT u.id, u.email, p.first_name AS "firstName", p.last_name AS "lastName", u.status
      FROM public.user_token t JOIN public.app_user u ON u.id=t.user_id JOIN public.user_profile p ON p.user_id=u.id
      WHERE t.token_hash=$1 AND t.token_type='SESSION' AND t.revoked_at IS NULL AND t.used_at IS NULL
        AND t.expires_at>now() AND u.status::text=ANY($2::text[]) AND u.deleted_at IS NULL
        AND (u.locked_until IS NULL OR u.locked_until<=now())`, [tokenHash, BASIC_ACCESS_STATUSES])
    return rows[0] ?? null
  }
  async revoke(tokenHash: string): Promise<void> {
    await this.database.connection().getRepository(SessionTokenSchema).update({ tokenHash, tokenType: 'SESSION', revokedAt: IsNull() }, { revokedAt: () => 'clock_timestamp()' })
  }
}
