import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { BASIC_ACCESS_STATUSES } from '../application/basic-access'
import type { PasswordRecoveryRepository } from '../application/password-recovery'

@Injectable()
export class TypeormPasswordRecoveryRepository implements PasswordRecoveryRepository {
  constructor(private readonly database: DatabaseService) {}

  async issue(email: string, tokenHash: string, expiresAt: Date): Promise<boolean> {
    return this.database.connection().transaction(async manager => {
      const users: { id: string }[] = await manager.query(`
        SELECT id FROM public.app_user
        WHERE email=$1 AND deleted_at IS NULL AND status::text=ANY($2::text[])
          AND (locked_until IS NULL OR locked_until<=now())
        FOR UPDATE`, [email, BASIC_ACCESS_STATUSES])
      const user = users[0]
      if (!user) return false
      await manager.query(`
        UPDATE public.user_token SET revoked_at=clock_timestamp()
        WHERE user_id=$1 AND token_type='PASSWORD_RESET' AND used_at IS NULL AND revoked_at IS NULL`, [user.id])
      await manager.query(`
        INSERT INTO public.user_token(user_id, token_type, token_hash, expires_at)
        VALUES ($1, 'PASSWORD_RESET', $2, $3)`, [user.id, tokenHash, expiresAt])
      return true
    })
  }

  async reset(tokenHash: string, passwordHash: string): Promise<boolean> {
    return this.database.connection().transaction(async manager => {
      const rows: { id: string; userId: string }[] = await manager.query(`
        SELECT t.id, t.user_id AS "userId"
        FROM public.user_token t JOIN public.app_user u ON u.id=t.user_id
        WHERE t.token_hash=$1 AND t.token_type='PASSWORD_RESET'
          AND t.used_at IS NULL AND t.revoked_at IS NULL AND t.expires_at>now()
          AND u.deleted_at IS NULL AND u.status::text=ANY($2::text[])
          AND (u.locked_until IS NULL OR u.locked_until<=now())
        FOR UPDATE OF t, u`, [tokenHash, BASIC_ACCESS_STATUSES])
      const token = rows[0]
      if (!token) return false
      await manager.query(`
        UPDATE public.app_user
        SET password_hash=$2, failed_login_count=0, locked_until=NULL, updated_at=clock_timestamp()
        WHERE id=$1 AND deleted_at IS NULL`, [token.userId, passwordHash])
      await manager.query(`UPDATE public.user_token SET used_at=clock_timestamp() WHERE id=$1`, [token.id])
      await manager.query(`
        UPDATE public.user_token SET revoked_at=clock_timestamp()
        WHERE user_id=$1 AND revoked_at IS NULL AND used_at IS NULL
          AND (token_type='SESSION' OR token_type='PASSWORD_RESET') AND id<>$2`, [token.userId, token.id])
      return true
    })
  }
}
