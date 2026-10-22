import { newUser, type NewUser, type RegistrationInput } from '../domain/registration'
import { phoneErrors } from '../../shared/domain/phone'
export type { NewUser, RegistrationInput } from '../domain/registration'
export interface RegistrationResult { id: string; status: 'PENDING_VERIFICATION' }
export interface UserRegistrationRepository { create(input: NewUser): Promise<RegistrationResult>; emailExists(email: string): Promise<boolean> }
export interface PasswordHasher { hash(password: string): Promise<string> }
export class RegistrationConflict extends Error {}
export class RegistrationInvalid extends Error { constructor(readonly fields: Record<string, string>) { super('Datos inválidos') } }

export class RegisterUser {
  constructor(private readonly users: UserRegistrationRepository, private readonly passwords: PasswordHasher) {}

  async execute(input: RegistrationInput): Promise<RegistrationResult> {
    const errors = phoneErrors(input.phoneCountryCode ?? '', input.phoneNumber ?? '')
    if (Object.keys(errors).length) throw new RegistrationInvalid(errors)
    const passwordHash = await this.passwords.hash(input.password)
    return this.users.create(newUser(input, passwordHash))
  }
  async emailAvailability(email: string): Promise<{ email: string; available: boolean }> {
    const normalized = email.trim().toLowerCase()
    return { email: normalized, available: !await this.users.emailExists(normalized) }
  }
}
