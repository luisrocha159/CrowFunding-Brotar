// Acceso básico no equivale a correo o identidad verificados.
export const BASIC_ACCESS_STATUSES = ['ACTIVE', 'PENDING_VERIFICATION'] as const
export type BasicAccessStatus = typeof BASIC_ACCESS_STATUSES[number]
export function allowsBasicAccess(status: string): status is BasicAccessStatus {
  return BASIC_ACCESS_STATUSES.some(allowed => allowed === status)
}
