import { newUser, type NewUser, type RegistrationInput } from '../domain/registration'
export type { NewUser, RegistrationInput } from '../domain/registration'
export interface RegistrationResult { id: string; status: 'PENDING_VERIFICATION' }
export interface UserRegistrationRepository { create(input: NewUser): Promise<RegistrationResult> }
export interface PasswordHasher { hash(password: string): Promise<string> }
export class RegistrationConflict extends Error {}

export class RegisterUser {
  constructor(private readonly users: UserRegistrationRepository, private readonly passwords: PasswordHasher) {}

  async execute(input: RegistrationInput): Promise<RegistrationResult> {
    const passwordHash = await this.passwords.hash(input.password)
    return this.users.create(newUser(input, passwordHash))
  }
}
