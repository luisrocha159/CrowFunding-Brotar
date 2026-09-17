export interface AssignedRole { code: string; name: string }
export function hasRequiredRoles(current: readonly AssignedRole[], required: readonly string[]): boolean {
  return required.length > 0 && required.every(code => current.some(role => role.code === code))
}
