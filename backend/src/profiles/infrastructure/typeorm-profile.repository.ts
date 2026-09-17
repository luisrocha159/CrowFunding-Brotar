import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { UserProfileSchema, UserSchema } from '../../users/infrastructure/persistence/user.schemas'
import type { Profile, ProfileInput, ProfileRepository } from '../application/profile'
import { BASIC_ACCESS_STATUSES } from '../../auth/application/basic-access'

@Injectable()
export class TypeormProfileRepository implements ProfileRepository {
  constructor(private readonly database: DatabaseService) {}
  private async select(manager: EntityManager, userId: string): Promise<Profile | null> {
    const rows: Profile[] = await manager.query(`SELECT u.email, p.first_name AS "firstName", p.last_name AS "lastName",
      COALESCE(u.phone_country_code,'') AS "phoneCountryCode", COALESCE(u.phone_number,'') AS "phoneNumber"
      FROM public.app_user u JOIN public.user_profile p ON p.user_id=u.id
      WHERE u.id=$1 AND u.deleted_at IS NULL AND u.status::text=ANY($2::text[])
        AND (u.locked_until IS NULL OR u.locked_until<=now())`, [userId, BASIC_ACCESS_STATUSES])
    return rows[0] ?? null
  }
  read(userId: string): Promise<Profile | null> { return this.select(this.database.connection().manager, userId) }
  save(userId: string, input: ProfileInput): Promise<Profile | null> {
    return this.database.connection().transaction(async manager => {
      const user = await manager.getRepository(UserSchema).createQueryBuilder('u').setLock('pessimistic_write')
        .where('u.id=:userId AND u.deleted_at IS NULL AND u.status IN (:...statuses) AND (u.locked_until IS NULL OR u.locked_until<=now())', { userId, statuses: BASIC_ACCESS_STATUSES }).getOne()
      if (!user || !await manager.getRepository(UserProfileSchema).existsBy({ userId })) return null
      const phoneCountryCode = input.phoneCountryCode || null
      const phoneNumber = input.phoneNumber || null
      const changed = user.phoneCountryCode !== phoneCountryCode || user.phoneNumber !== phoneNumber
      await manager.getRepository(UserProfileSchema).update({ userId }, { firstName: input.firstName, lastName: input.lastName })
      await manager.getRepository(UserSchema).update({ id: userId }, {
        phoneCountryCode, phoneNumber, ...(changed ? { phoneVerifiedAt: null } : {})
      })
      // El resto del perfil (ubicación, área administrativa, etc.) queda intacto.
      return this.select(manager, userId)
    })
  }
}
