/** Criterio aprobado por el equipo para el MVP de pruebas (20/10/2026). */
export const ACCESS_POLICY = {
  'parties.read': {action:'read',roles:['ADMIN','AUDITOR']},
  'dashboard.read': {action:'read',roles:['ADMIN','AUDITOR','REVIEWER','COMPLIANCE','FINANCE','SUPPORT']},
  'campaign.closure.read': { action: 'read', roles: ['ADMIN','REVIEWER','SUPPORT','FINANCE','AUDITOR'] },
  'campaign.closure.review': { action: 'write', roles: ['REVIEWER','ADMIN'] },
  'campaign.lifecycle.read': { action: 'read', roles: ['ADMIN','FINANCE','REVIEWER','AUDITOR'] },
  'campaign.lifecycle.manage': { action: 'write', roles: ['ADMIN'] },
  'campaign.manage.own': { action: 'write', roles: ['CREATOR'] },
  'campaign.review.read': { action: 'read', roles: ['REVIEWER', 'ADMIN', 'AUDITOR'] },
  'campaign.review.decide': { action: 'write', roles: ['REVIEWER', 'ADMIN'] },
  'campaign.publish': { action: 'write', roles: ['ADMIN'] },
  'creator.provision': { action: 'write', roles: ['ADMIN'] },
  'roles.manage': { action: 'write', roles: ['ADMIN'] },
  'catalog.manage': { action: 'write', roles: ['ADMIN'] },
  'catalog.read': { action: 'read', roles: ['ADMIN','AUDITOR'] },
  'verification.review': { action: 'write', roles: ['COMPLIANCE', 'ADMIN'] },
  'verification.read': { action: 'read', roles: ['COMPLIANCE', 'ADMIN'] },
  'finance.read': { action: 'read', roles: ['FINANCE', 'ADMIN', 'AUDITOR'] },
  'finance.operate': { action: 'write', roles: ['FINANCE'] },
  'support.read': { action: 'read', roles: ['SUPPORT', 'ADMIN', 'AUDITOR'] },
  'support.resolve': { action: 'write', roles: ['SUPPORT'] },
  'audit.read': { action: 'read', roles: ['ADMIN', 'AUDITOR'] },
  'contribution.read.own': { action: 'read', roles: ['REGISTERED_USER', 'SPONSOR'] },
  'contribution.write.own': { action: 'write', roles: ['REGISTERED_USER', 'SPONSOR'] }
} as const

export function effectivePermissions(granted: readonly string[], readOnly: boolean): string[] {
  return [...new Set(granted)].filter(code => !readOnly ||
    ACCESS_POLICY[code as keyof typeof ACCESS_POLICY]?.action === 'read').sort()
}
