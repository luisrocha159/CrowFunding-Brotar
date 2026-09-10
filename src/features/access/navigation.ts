import { readProfile } from './validation'

/** Only public destinations, never arbitrary external or private routes. */
export function publicContinuation(raw: string | null): string {
  const allowed = ['/', '/explorar', '/como-funciona', '/para-creadores']
  if (raw && (allowed.includes(raw) || /^\/proyectos\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw))) return raw
  return '/explorar'
}

export function accessHref(path: '/iniciar-sesion' | '/registro' | '/recuperar-contrasena', source: URLSearchParams) {
  const params = new URLSearchParams()
  if (source.has('continuar')) params.set('continuar', publicContinuation(source.get('continuar')))
  const profile = readProfile(source.get('perfil'))
  if (profile !== 'usuario') params.set('perfil', profile)
  return `${path}${params.size ? `?${params}` : ''}`
}
