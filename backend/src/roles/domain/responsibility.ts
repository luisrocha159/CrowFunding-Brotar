// Responsabilidades separadas que exige BG-53 CA 1. REGISTERED_USER no es una
// responsabilidad: es lo único que concede el registro público (CA 3).
export const RESPONSIBILITY_ROLES = [
  'CREATOR', 'SPONSOR', 'REVIEWER', 'COMPLIANCE', 'FINANCE', 'SUPPORT', 'ADMIN', 'AUDITOR'
] as const
export type ResponsibilityRole = typeof RESPONSIBILITY_ROLES[number]

export const PUBLIC_REGISTRATION_ROLE = 'REGISTERED_USER'

// El auditor observa; no ejecuta cambios. Se mantiene en lectura aunque acumule otros roles:
// ante la duda se deniega, y ampliarlo es una decisión de D06, no un supuesto de implementación.
export const READ_ONLY_ROLES = ['AUDITOR'] as const

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const

export function isResponsibilityRole(code: string): code is ResponsibilityRole {
  return RESPONSIBILITY_ROLES.some((role) => role === code)
}

export function mutates(method: string): boolean {
  return MUTATING_METHODS.some((mutating) => mutating === method.toUpperCase())
}

/** El registro público nunca debe conceder una responsabilidad (BG-53 CA 3). */
export function grantsResponsibility(codes: readonly string[]): boolean {
  return codes.some(isResponsibilityRole)
}

/** Deniega la escritura a quien ostenta un rol de solo lectura, aunque tenga otros. */
export function deniesMutation(codes: readonly string[], method: string): boolean {
  return mutates(method) && codes.some((code) => READ_ONLY_ROLES.some((readOnly) => readOnly === code))
}

/**
 * Todos los permisos requeridos deben estar concedidos. Sin requisitos se deniega:
 * un endpoint sin declarar su permiso no queda abierto por omisión.
 */
export function hasRequiredPermissions(granted: readonly string[], required: readonly string[]): boolean {
  return required.length > 0 && required.every((code) => granted.includes(code))
}
