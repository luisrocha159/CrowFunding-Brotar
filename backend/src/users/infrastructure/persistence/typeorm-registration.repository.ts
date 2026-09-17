import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { QueryFailedError } from 'typeorm'
import { DatabaseService } from '../../../shared/infrastructure/database/database.service'
import { RegistrationConflict, type NewUser, type RegistrationResult, type UserRegistrationRepository } from '../../application/register-user'
import { UserProfileSchema, UserSchema } from './user.schemas'

@Injectable()
export class TypeormRegistrationRepository implements UserRegistrationRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: NewUser): Promise<RegistrationResult> {
    const id = randomUUID()
    try {
      await this.database.connection().transaction(async (manager) => {
        await manager.getRepository(UserSchema).insert({
          id, email: input.email, passwordHash: input.passwordHash,
          phoneCountryCode: input.phoneCountryCode ?? null, phoneNumber: input.phoneNumber ?? null
        })
        await manager.getRepository(UserProfileSchema).insert({ userId: id, firstName: input.firstName, lastName: input.lastName })
        const assigned: { id: string }[] = await manager.query(`INSERT INTO public.user_role(user_id, role_id)
          SELECT $1, id FROM public.role WHERE code='REGISTERED_USER' AND is_internal=false RETURNING id`, [id])
        if (assigned.length !== 1) throw new Error('Catálogo de rol básico no disponible.')
      })
      // Solo asigna el rol básico. No activa ni verifica ni concede roles privilegiados.
      return { id, status: 'PENDING_VERIFICATION' }
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driver = error.driverError as { code?: string; constraint?: string }
        if (driver.code === '23505' && ['app_user_email_uq', 'app_user_phone_uq'].includes(driver.constraint ?? '')) {
          throw new RegistrationConflict()
        }
      }
      throw error
    }
  }
}
