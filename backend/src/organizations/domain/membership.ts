// Valores del enum organization_role_type del esquema oficial.
export const ORGANIZATION_ROLES = ['OWNER', 'LEGAL_REPRESENTATIVE', 'ADMIN', 'MEMBER'] as const
export type OrganizationRole = typeof ORGANIZATION_ROLES[number]

/**
 * Conjunto conservador para operar sobre la organización. MEMBER queda fuera de
 * la escritura mientras D06 no confirme el reparto: ampliar es una decisión, restringir
 * es el lado seguro. No se usa como regla de negocio de campañas, que depende de D02.
 */
export const ORGANIZATION_MANAGERS = ['OWNER', 'LEGAL_REPRESENTATIVE', 'ADMIN'] as const

export function isOrganizationRole(code: string): code is OrganizationRole {
  return ORGANIZATION_ROLES.some((role) => role === code)
}

/**
 * Pertenencia comprobada contra el rol real almacenado. Sin membresía vigente o sin
 * roles admitidos se deniega: ocultar el botón en el frontend no es una comprobación.
 */
export function allowsMembership(current: string | null, allowed: readonly string[]): boolean {
  return current !== null && allowed.length > 0 && allowed.includes(current)
}
