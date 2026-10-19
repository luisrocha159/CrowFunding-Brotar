/** Matriz provisional del equipo, no aprobación definitiva D06. Sin asignación de roles a cuentas. */
export const ACCESS_POLICY = {
  'campaign.review.read': { action: 'read', roles: ['REVIEWER', 'ADMIN', 'AUDITOR'] },
  'campaign.review.decide': { action: 'write', roles: ['REVIEWER', 'ADMIN'] },
  'campaign.publish': { action: 'write', roles: ['ADMIN'] },
  'creator.provision': { action: 'write', roles: ['ADMIN'] },
  'catalog.manage': { action: 'write', roles: ['ADMIN'] },
  'verification.review': { action: 'write', roles: ['COMPLIANCE', 'ADMIN'] },
  'finance.read': { action: 'read', roles: ['FINANCE', 'ADMIN', 'AUDITOR'] },
  'finance.operate': { action: 'write', roles: ['FINANCE'] },
  'support.read': { action: 'read', roles: ['SUPPORT', 'ADMIN', 'AUDITOR'] },
  'support.resolve': { action: 'write', roles: ['SUPPORT'] },
  'audit.read': { action: 'read', roles: ['ADMIN', 'AUDITOR'] },
  'contribution.read.own': { action: 'read', roles: ['REGISTERED_USER', 'SPONSOR'] }
} as const

export function effectivePermissions(granted: readonly string[], readOnly: boolean): string[] {
  return [...new Set(granted)].filter(code => !readOnly ||
    ACCESS_POLICY[code as keyof typeof ACCESS_POLICY]?.action === 'read').sort()
}
