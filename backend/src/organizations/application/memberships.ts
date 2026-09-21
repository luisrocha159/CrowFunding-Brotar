import { allowsMembership, ORGANIZATION_MANAGERS } from '../domain/membership'
export type { OrganizationRole } from '../domain/membership'
export { ORGANIZATION_MANAGERS, ORGANIZATION_ROLES } from '../domain/membership'

export interface MembershipRepository {
  /** Rol vigente del usuario en la organización, o null si no es miembro activo. */
  roleOf(userId: string, organizationId: string): Promise<string | null>
}

/**
 * Comprobación de pertenencia para el flujo creador (BG-53 CA 2). Se consulta en la API
 * antes de cada operación sobre una organización; el frontend no es la autoridad.
 */
export class Memberships {
  constructor(private readonly repository: MembershipRepository) {}

  roleOf(userId: string, organizationId: string): Promise<string | null> {
    return this.repository.roleOf(userId, organizationId)
  }

  async allows(userId: string, organizationId: string, allowed: readonly string[]): Promise<boolean> {
    return allowsMembership(await this.roleOf(userId, organizationId), allowed)
  }

  /** Atajo para operaciones de gestión; el conjunto admitido sigue pendiente de D06. */
  manages(userId: string, organizationId: string): Promise<boolean> {
    return this.allows(userId, organizationId, ORGANIZATION_MANAGERS)
  }
}
