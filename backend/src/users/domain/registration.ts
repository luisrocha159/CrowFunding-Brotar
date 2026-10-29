export interface RegistrationInput {
  firstName: string
  lastName: string
  email: string
  password: string
  legalVersion?: string
  demoConsent?: boolean
  phoneCountryCode?: string
  phoneNumber?: string
}
export type NewUser = Omit<RegistrationInput, 'password' | 'demoConsent'> & { passwordHash: string }
export function newUser(input: RegistrationInput, passwordHash: string): NewUser {
  return {
    email: input.email.trim().toLowerCase(), firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    legalVersion: input.legalVersion, passwordHash, phoneCountryCode: input.phoneCountryCode, phoneNumber: input.phoneNumber
  }
}
