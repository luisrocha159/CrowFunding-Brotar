import { hasRequiredRoles, type AssignedRole } from '../domain/role'
export type { AssignedRole } from '../domain/role'
export interface RoleRepository { active(userId: string): Promise<AssignedRole[]> }
export class RoleAccess {
  constructor(private readonly repository: RoleRepository) {}
  current(userId: string): Promise<AssignedRole[]> { return this.repository.active(userId) }
  async allows(userId: string, required: readonly string[]): Promise<boolean> {
    const current = await this.current(userId)
    return hasRequiredRoles(current, required)
  }
}
