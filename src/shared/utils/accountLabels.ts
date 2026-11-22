const roles: Record<string, string> = {
  REGISTERED_USER: 'Usuario registrado',
  SPONSOR: 'Patrocinador',
  CREATOR: 'Creador',
  REVIEWER: 'Revisor de campañas',
  COMPLIANCE: 'Cumplimiento',
  FINANCE: 'Finanzas',
  SUPPORT: 'Soporte',
  ADMIN: 'Administrador',
  AUDITOR: 'Auditor',
  OWNER: 'Titular del registro',
  LEGAL_REPRESENTATIVE: 'Representante legal',
  MEMBER: 'Miembro'
}

export function accountRoleLabel(code: string, fallback = 'Rol sin identificar') {
  return Object.hasOwn(roles, code) ? roles[code]! : fallback
}

const accountStates: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_VERIFICATION: 'Pendiente de verificación',
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  CLOSED: 'Cerrada'
}

export function accountStatusLabel(code: string) {
  return accountStates[code] ?? 'Estado no disponible'
}

const partyEvents: Record<string, string> = {
  REQUEST: 'Solicitud enviada',
  ACCEPT: 'Aceptación registrada',
  DECLINE: 'Solicitud declinada',
  CANCEL: 'Solicitud cancelada',
  APPROVE: 'Aprobación registrada',
  REJECT: 'Solicitud rechazada',
  EXPIRE: 'Invitación vencida',
  INVITE: 'Invitación enviada',
  ADD: 'Miembro incorporado',
  CHANGE: 'Rol modificado',
  REMOVE: 'Membresía finalizada',
  TRANSFER: 'Titularidad transferida',
  ACCEPT_INVITATION: 'Invitación aceptada',
  REPRESENTATION_APPROVE: 'Representación aprobada',
  UPDATE: 'Datos de la cuenta actualizados',
  RESTRICT: 'Acceso restringido',
  RESTORE: 'Acceso restaurado'
}

export function partyEventLabel(code: string) {
  return partyEvents[code] ?? 'Cambio registrado'
}

const destinationStates: Record<string, string> = {
  PENDING: 'Pendiente de verificación',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  DISABLED: 'Deshabilitado'
}

export function destinationStatusLabel(code: string) {
  return destinationStates[code] ?? 'Estado no disponible'
}
