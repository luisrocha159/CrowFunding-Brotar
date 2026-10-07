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
  if (raw && (['/mi-cuenta', '/mis-organizaciones', '/crear-campana', '/mis-proyectos', '/administracion/campanas', '/administracion/usuarios'].includes(raw)
    || /^\/(mis-proyectos|administracion\/campanas)\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(raw)
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
