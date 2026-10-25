export interface ManagedUser {
  id: string; email: string; name: string; status: string; locked: boolean; roles: string[]
}
export function canEnableCreator(user: ManagedUser): boolean {
  return ['ACTIVE', 'PENDING_VERIFICATION'].includes(user.status) && !user.locked
    && user.roles.includes('REGISTERED_USER') && !user.roles.includes('AUDITOR')
}
export class ManagedUserMissing extends Error {}
export class CreatorGrantConflict extends Error {}
export class CreatorGrantDenied extends Error {}
export interface CreatorAdministrationRepository {
  find(email: string): Promise<ManagedUser | null>
  grant(actorId: string, userId: string, reason: string): Promise<{ id: string; role: 'CREATOR'; created: boolean; provisional: true }>
}
export class CreatorAdministration {
  constructor(private readonly repository: CreatorAdministrationRepository) {}
  async find(email: string) {
    const user = await this.repository.find(email.trim().toLowerCase())
    if (!user) throw new ManagedUserMissing()
    return { ...user, canEnableCreator: canEnableCreator(user), provisional: true }
  }
  grant(actorId: string, userId: string, reason: string) {
    const clean = reason.trim()
    if (!clean || clean.length > 500 || [...clean].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new CreatorGrantConflict()
    return this.repository.grant(actorId, userId, clean)
  }
}
