import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { GuestAccessGate } from '../src/features/access/session/GuestAccessGate'
import { CreatorAccessActions } from '../src/features/access/session/CreatorAccessActions'
import type { HeaderSession } from '../src/features/access/session/useHeaderSession'

function render(session: Partial<HeaderSession>, actions = false) {
  const context: HeaderSession = { user: null, checking: false, unavailable: false, retry: () => {}, ...session }
  return renderToStaticMarkup(<MemoryRouter><Routes><Route element={<Outlet context={context} />}>
    <Route path="/" element={actions ? <CreatorAccessActions /> : <GuestAccessGate><form aria-label="Acceso de visitante">Formulario</form></GuestAccessGate>} />
  </Route></Routes></MemoryRouter>)
}

test('acceso: no muestra formularios ni enlaces de registro mientras comprueba la sesión', () => {
  const html = render({ checking: true })
  assert.ok(html.includes('role="status"'))
  assert.ok(!html.includes('<form'))
  const actions = render({ checking: true }, true)
  assert.ok(actions.includes('disabled'))
  assert.ok(!actions.includes('href='))
})

test('acceso: servicio no disponible ofrece reintentar, no lo trata como usuario anónimo', () => {
  const html = render({ unavailable: true })
  assert.ok(html.includes('Reintentar comprobación'))
  assert.ok(html.includes('role="alert"'))
  assert.ok(!html.includes('<form'))
  assert.ok(render({ unavailable: true }, true).includes('href="/mi-cuenta"'))
})

test('acceso: solo una sesión anónima confirmada muestra el formulario y enlaces de acceso', () => {
  assert.ok(render({}).includes('Acceso de visitante'))
  const html = render({}, true)
  assert.ok(html.includes('/iniciar-sesion?continuar=%2Fcrear-campana'))
  assert.ok(html.includes('/registro?perfil=creador'))
})

test('creadores: una sesión pendiente habilitada lleva a borradores y cuenta, sin pedir credenciales', () => {
  const html = render({ user: { id: 'test', email: 'test@example.invalid', firstName: 'Prueba', lastName: 'Sesión', status: 'PENDING_VERIFICATION' } }, true)
  assert.ok(html.includes('href="/crear-campana"'))
  assert.ok(html.includes('href="/mi-cuenta"'))
  assert.ok(!html.includes('/iniciar-sesion'))
  assert.ok(!html.includes('/registro'))
})
