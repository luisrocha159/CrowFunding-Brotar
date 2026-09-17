export interface ProfileInput { firstName: string; lastName: string; phoneCountryCode: string; phoneNumber: string }
export interface Profile extends ProfileInput { email: string }
export class InvalidProfile extends Error {}
export function normalizeProfile(input: ProfileInput): ProfileInput {
  if (Boolean(input.phoneCountryCode) !== Boolean(input.phoneNumber)) throw new InvalidProfile()
  return {
    firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    phoneCountryCode: input.phoneCountryCode.trim(), phoneNumber: input.phoneNumber.trim()
  }
}
