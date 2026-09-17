import { normalizeProfile, type Profile, type ProfileInput } from '../domain/profile'
export { InvalidProfile, type Profile, type ProfileInput } from '../domain/profile'
export interface ProfileRepository {
  read(userId: string): Promise<Profile | null>
  save(userId: string, input: ProfileInput): Promise<Profile | null>
}
export class ProfileUnavailable extends Error {}
export class Profiles {
  constructor(private readonly repository: ProfileRepository) {}
  async read(userId: string): Promise<Profile> {
    const result = await this.repository.read(userId)
    if (!result) throw new ProfileUnavailable()
    return result
  }
  async save(userId: string, input: ProfileInput): Promise<Profile> {
    const result = await this.repository.save(userId, normalizeProfile(input))
    if (!result) throw new ProfileUnavailable()
    return result
  }
}
