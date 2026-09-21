import { hasRequiredPermissions } from '../domain/responsibility'

export interface PermissionRepository {
  /** Permisos efectivos del usuario, derivados de sus roles vigentes. */
  granted(userId: string): Promise<string[]>
}

/**
 * Comprobación de permisos en la API (BG-53 CA 2). Es el mecanismo, no el catálogo:
 * qué permiso concede cada rol se puebla en public.role_permission y depende de D06.
 * Mientras esté vacío, todo requisito de permiso se deniega, que es el lado seguro.
 */
export class PermissionAccess {
  constructor(private readonly repository: PermissionRepository) {}

  granted(userId: string): Promise<string[]> {
    return this.repository.granted(userId)
  }

  async allows(userId: string, required: readonly string[]): Promise<boolean> {
    return hasRequiredPermissions(await this.granted(userId), required)
  }
}
