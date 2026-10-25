import { readProfile } from './validation'

/** Only public destinations, never arbitrary external or private routes. */
export function publicContinuation(raw: string | null): string {
  const allowed = ['/', '/explorar', '/como-funciona', '/para-creadores']
  if (raw && (allowed.includes(raw) || /^\/proyectos\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw))) return raw
  return '/explorar'
}

/** Lista cerrada para volver a una pantalla privada después de autenticar.
 * No concede acceso: la API continúa exigiendo sesión, rol y propiedad.
 */
export function authenticatedContinuation(raw: string | null): string {
  if(raw && (/^\/(mis-disputas|administracion\/disputas)(?:\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/.test(raw) || /^\/mis-disputas\/nueva\?incidencia=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(raw)))return raw
  if(raw && (/^\/(mis-devoluciones|administracion\/devoluciones)(?:\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/.test(raw) || /^\/mis-devoluciones\/nueva\?pago=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(raw)))return raw
  if(raw && /^\/administracion\/verificaciones(?:\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/.test(raw))return raw
  if(raw && (/^\/apoyo-demo(?:\?(?:pago|seleccion)=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/.test(raw)))return raw
  if (raw && (['/mi-cuenta', '/mis-organizaciones', '/crear-campana', '/mis-proyectos', '/administracion/campanas', '/administracion/usuarios', '/administracion/finanzas', '/administracion/conciliacion', '/administracion/auditoria', '/administracion', '/administracion/catalogos', '/administracion/personas', '/panel-creador', '/panel-patrocinador', '/mi-verificacion', '/mis-guardados', '/mis-aportes', '/mis-incidencias', '/mis-incidencias/nueva', '/simulacion-apoyo'].includes(raw)
    || /^\/(mis-proyectos|administracion\/(campanas|conciliacion))\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(raw)
    || /^\/mis-proyectos\/[a-f0-9-]{36}\/(avances|rendicion)$/.test(raw)
    || /^\/mis-aportes\/[a-f0-9-]{36}(?:\/comprobante)?$/.test(raw)
    || /^\/mis-incidencias\/[a-f0-9-]{36}$/.test(raw)
    || /^\/mis-guardados\?vista=(FAVORITE|FOLLOW|UPDATES)(?:&pagina=\d{1,6})?$/.test(raw)
    || /^\/mis-incidencias\/nueva\?contributionId=[a-f0-9-]{36}$/.test(raw)
    || /^\/simulacion-apoyo\?id=[a-f0-9-]{36}$/.test(raw)
    || /^\/(simulacion-apoyo|mis-incidencias\/nueva)\?campaignId=[a-f0-9-]{36}(?:&contributionId=[a-f0-9-]{36})?$/.test(raw)
    || /^\/(crear-campana|mi-campana\/portada)\?borrador=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(raw))) return raw
  return publicContinuation(raw)
}

/** Destino cuando una sesión ya confirmada visita login o registro. */
export function existingSessionDestination(source: URLSearchParams): string {
  if (source.has('continuar')) return authenticatedContinuation(source.get('continuar'))
  const profile = readProfile(source.get('perfil'))
  return profile === 'creador' ? '/crear-campana' : profile === 'organizacion' ? '/mis-organizaciones' : '/mi-cuenta'
}

export function accessHref(path: '/iniciar-sesion' | '/registro' | '/recuperar-contrasena', source: URLSearchParams) {
  const params = new URLSearchParams()
  if (source.has('continuar')) params.set('continuar', authenticatedContinuation(source.get('continuar')))
  const profile = readProfile(source.get('perfil'))
  if (profile !== 'usuario') params.set('perfil', profile)
  return `${path}${params.size ? `?${params}` : ''}`
}
