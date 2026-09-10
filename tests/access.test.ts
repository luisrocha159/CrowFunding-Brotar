import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { demoValues, normalizeEmail, readProfile, validateEmail, validateLogin, validateRegister } from '../src/features/access/validation'
import { accessHref, publicContinuation } from '../src/features/access/navigation'
import { simulateAccess, type AccessOutcome } from '../src/mocks/access/accessService'

describe('Validación de acceso simulado', () => {
  it('normaliza correos y admite un correo de ejemplo válido', () => {
    assert.equal(normalizeEmail(' Demo@EXAMPLE.com  '), 'demo@example.com')
    assert.equal(validateEmail('nombre.apellido+demo@example.com'), undefined)
  })
  it('rechaza correo vacío, incompleto, con espacios internos o excesivamente largo', () => {
    for (const email of ['', '  ', 'persona', 'persona@', '@example.com', 'nombre apellido@example.com', 'a@b', `${'a'.repeat(250)}@example.com`]) assert.ok(validateEmail(email))
  })
  it('exige correo y contraseña para iniciar sesión', () => {
    assert.deepEqual(Object.keys(validateLogin({ email: '', password: '' })), ['email', 'password'])
    assert.ok(validateLogin({ email: demoValues.email, password: '   ' }).password)
    assert.deepEqual(validateLogin(demoValues), {})
  })
  it('no aplica la regla de creación de contraseña al acceso', () => {
    assert.deepEqual(validateLogin({ email: demoValues.email, password: 'abc' }), {})
  })
  it('requiere datos básicos, confirmación y aceptación manual en registro', () => {
    const errors = validateRegister({ firstName: '', lastName: '', email: '', password: '', confirmation: '', terms: false }, 'usuario')
    for (const field of ['firstName', 'lastName', 'email', 'password', 'confirmation', 'terms'] as const) assert.ok(errors[field])
    assert.equal(demoValues.terms, false)
  })
  it('acepta nombres con acentos, apóstrofes y guiones', () => {
    assert.deepEqual(validateRegister({ ...demoValues, firstName: 'María-José', lastName: "D'Ávila", terms: true }, 'creador'), {})
    assert.ok(validateRegister({ ...demoValues, firstName: '  ', terms: true }, 'creador').firstName)
  })
  it('rechaza nombres demasiado largos sin imponer un alfabeto', () => {
    const errors = validateRegister({ ...demoValues, firstName: 'a'.repeat(81), lastName: 'a'.repeat(81), terms: true }, 'usuario')
    assert.ok(errors.firstName)
    assert.ok(errors.lastName)
  })
  it('aplica los requisitos provisionales de contraseña de la muestra', () => {
    for (const password of ['Abc123', 'abcdefgh9', 'Abcdefgh']) assert.ok(validateRegister({ ...demoValues, password, confirmation: password, terms: true }, 'usuario').password)
    assert.deepEqual(validateRegister({ ...demoValues, terms: true }, 'usuario'), {})
  })
  it('compara contraseñas exactamente, sin recortarlas silenciosamente', () => {
    assert.ok(validateRegister({ ...demoValues, confirmation: `${demoValues.password} `, terms: true }, 'usuario').confirmation)
    assert.deepEqual(validateRegister({ ...demoValues, password: ' Clave123 ', confirmation: ' Clave123 ', terms: true }, 'usuario'), {})
  })
  it('admite los tres perfiles y normaliza parámetros inválidos', () => {
    for (const profile of ['usuario', 'creador', 'organizacion']) {
      assert.equal(readProfile(profile), profile)
      assert.deepEqual(validateRegister({ ...demoValues, terms: true }, profile), {})
    }
    for (const invalid of [null, '', 'administrador', '__proto__', 'constructor']) assert.equal(readProfile(invalid), 'usuario')
    assert.ok(validateRegister({ ...demoValues, terms: true }, 'administrador').profile)
  })
})

describe('Continuación pública y enlaces de acceso', () => {
  it('permite volver a la campaña o a rutas informativas públicas', () => {
    for (const path of ['/', '/explorar', '/como-funciona', '/para-creadores', '/proyectos/huertos-comunitarios-cochabamba']) assert.equal(publicContinuation(path), path)
  })
  it('descarta destinos externos, privados y formas no admitidas', () => {
    for (const path of [null, '', 'https://example.com', '//example.com', '/admin', '/panel-creador', '/proyectos/a?extra=1', '/proyectos/a#seccion', '/proyectos/../admin', '/proyectos/a%2Fb', '/\\example.com']) assert.equal(publicContinuation(path), '/explorar')
  })
  it('conserva origen y perfil entre las tres pantallas', () => {
    const input = new URLSearchParams({ continuar: '/proyectos/huertos-comunitarios-cochabamba', perfil: 'creador' })
    for (const path of ['/iniciar-sesion', '/registro', '/recuperar-contrasena'] as const) {
      const href = accessHref(path, input)
      const url = new URL(href, 'https://example.test')
      assert.equal(url.pathname, path)
      assert.equal(url.searchParams.get('continuar'), input.get('continuar'))
      assert.equal(url.searchParams.get('perfil'), 'creador')
    }
  })
  it('no copia datos de formulario ni parámetros arbitrarios a los enlaces', () => {
    assert.equal(accessHref('/registro', new URLSearchParams('email=demo@example.com&password=prueba&estado=error')), '/registro')
    assert.equal(accessHref('/registro', new URLSearchParams('continuar=https://example.com&perfil=admin')), '/registro?continuar=%2Fexplorar')
  })
})

describe('Respuestas simuladas sin cuentas ni credenciales', () => {
  it('reproduce los cuatro resultados explícitamente', async () => {
    for (const outcome of ['success', 'incorrect', 'exists', 'error'] as AccessOutcome[]) assert.equal(await simulateAccess(outcome, { delayMs: 0 }), outcome)
  })
  it('mantiene la carga pendiente y luego permite otro intento', async () => {
    let complete = false
    const pending = simulateAccess('error', { delayMs: 20 }).then(() => { complete = true })
    await Promise.resolve()
    assert.equal(complete, false)
    await pending
    assert.equal(complete, true)
    assert.equal(await simulateAccess('success', { delayMs: 0 }), 'success')
  })
  it('cancela al abandonar el formulario y admite señales ya canceladas', async () => {
    const controller = new AbortController()
    const pending = simulateAccess('success', { delayMs: 5000, signal: controller.signal })
    controller.abort()
    await assert.rejects(pending, { name: 'AbortError' })
    await assert.rejects(simulateAccess('success', { delayMs: 0, signal: controller.signal }), { name: 'AbortError' })
  })
})
