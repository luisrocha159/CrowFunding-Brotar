import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accessHref, authenticatedContinuation, existingSessionDestination, publicContinuation } from '../src/features/access/navigation'

test('continuaciones de Sprint 3 permanecen locales y conservan contexto permitido', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  for (const route of ['/panel-creador', '/panel-patrocinador', '/mi-verificacion', '/administracion/catalogos', '/administracion/personas', '/mis-incidencias/nueva', `/mis-proyectos/${id}/avances`, `/mis-proyectos/${id}/rendicion`, `/mis-aportes/${id}/comprobante`, `/simulacion-apoyo?id=${id}`, `/mis-incidencias/nueva?contributionId=${id}`, '/mis-guardados?vista=UPDATES']) assert.equal(authenticatedContinuation(route), route)
  for (const route of ['//evil.invalid/panel-creador', '/mis-incidencias/nueva?redirect=https://evil.invalid', '/administracion/personas?token=secret']) assert.equal(authenticatedContinuation(route), '/explorar')
})

const id = '11111111-1111-4111-8111-111111111111'

test('con sesión confirmada, login/registro vuelven a Mi cuenta y no a otro acceso', () => {
  assert.equal(existingSessionDestination(new URLSearchParams()), '/mi-cuenta')
  assert.equal(existingSessionDestination(new URLSearchParams('perfil=creador')), '/crear-campana')
  assert.equal(existingSessionDestination(new URLSearchParams('perfil=organizacion')), '/mis-organizaciones')
  assert.equal(existingSessionDestination(new URLSearchParams('perfil=admin')), '/mi-cuenta')
})

test('mantiene el destino público o privado autorizado, sin conceder roles', () => {
  for (const route of ['/mi-cuenta', '/mis-organizaciones', '/crear-campana', '/mis-proyectos', '/administracion/usuarios', '/administracion/campanas', '/administracion/finanzas', '/administracion/conciliacion', '/administracion/auditoria', `/administracion/conciliacion/${id}`, `/mis-proyectos/${id}`, `/administracion/campanas/${id}`, `/crear-campana?borrador=${id}`, `/mi-campana/portada?borrador=${id}`, '/proyectos/camp-11111111-1111-4111-8111-111111111111']) {
    assert.equal(authenticatedContinuation(route), route)
    assert.equal(existingSessionDestination(new URLSearchParams({ continuar: route, perfil: 'creador' })), route)
  }
  assert.equal(publicContinuation('/crear-campana'), '/explorar')
})

test('cambiar entre login, registro y recuperación no pierde la campaña ni filtra datos', () => {
  const destination = `/crear-campana?borrador=${id}`
  const source = new URLSearchParams({ continuar: destination, perfil: 'creador', token: 'privado', email: 'privado@example.invalid', password: 'privado' })
  for (const screen of ['/iniciar-sesion', '/registro', '/recuperar-contrasena'] as const) {
    const url = new URL(accessHref(screen, source), 'https://example.invalid')
    assert.equal(url.searchParams.get('continuar'), destination)
    assert.equal(url.searchParams.get('perfil'), 'creador')
    assert.deepEqual([...url.searchParams.keys()], ['continuar', 'perfil'])
  }
})

test('no permite redirecciones externas, bucles de acceso ni parámetros de borrador manipulados', () => {
  for (const route of ['https://example.invalid', '//example.invalid', '/\\example.invalid', '/iniciar-sesion', '/registro', '/recuperar-contrasena', '/mi-cuenta?rol=ADMIN', `/crear-campana?borrador=${id}&rol=ADMIN`, '/crear-campana?borrador=../admin', `/mi-campana/portada?borrador=${id}#otro`, '/crear-campana?borrador=%2f%2fexample.invalid', '/mis-proyectos/../admin']) {
    assert.equal(authenticatedContinuation(route), '/explorar')
    assert.equal(existingSessionDestination(new URLSearchParams({ continuar: route })), '/explorar')
  }
})
