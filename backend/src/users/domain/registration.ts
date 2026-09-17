export interface RegistrationInput {
  firstName: string
  lastName: string
  email: string
  password: string
  phoneCountryCode?: string
  phoneNumber?: string
}
export type NewUser = Omit<RegistrationInput, 'password'> & { passwordHash: string }
export function newUser(input: RegistrationInput, passwordHash: string): NewUser {
  return {
    email: input.email.trim().toLowerCase(), firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    passwordHash, phoneCountryCode: input.phoneCountryCode, phoneNumber: input.phoneNumber
  }
}
