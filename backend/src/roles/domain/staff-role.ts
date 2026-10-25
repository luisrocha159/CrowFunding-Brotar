export const STAFF_ROLES = ['REVIEWER', 'COMPLIANCE', 'FINANCE', 'SUPPORT', 'AUDITOR'] as const
export type StaffRole = typeof STAFF_ROLES[number]
export class StaffRoleConflict extends Error {}
export class StaffRoleDenied extends Error {}
export class StaffUserMissing extends Error {}

export function staffChange(actorId: string, userId: string, role: string, reason: string): { role: StaffRole; reason: string } {
  if (actorId === userId) throw new StaffRoleDenied('No puedes modificar tus propias responsabilidades.')
  const clean = reason.trim()
  if (!(STAFF_ROLES as readonly string[]).includes(role) || clean.length < 10 || clean.length > 500
    || [...clean].some(character => character.charCodeAt(0)<32 || character.charCodeAt(0)===127)) throw new StaffRoleConflict('Selecciona una responsabilidad y un motivo de 10 a 500 caracteres sin controles.')
  return { role: role as StaffRole, reason: clean }
}
