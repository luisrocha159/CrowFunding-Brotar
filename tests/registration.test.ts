import { test } from 'node:test'
import assert from 'node:assert/strict'
import { passwordLengthGuidance, registerAccount, RegistrationError, registrationErrorsFrom, validateRegistration, type RegistrationValues } from '../src/features/access/register/registration'

const values: RegistrationValues = { firstName: ' María ', lastName: " D'Ávila ", email: ' PRUEBA@example.invalid ', password: 'una frase de prueba larga', confirmation: 'una frase de prueba larga', terms: true, phoneCountryCode: '', phoneNumber: '', profile: 'creador' }
test('registro real valida límites, perfil aprobado, confirmación, consentimiento y teléfono opcional completo', () => {
  assert.deepEqual(validateRegistration(values), {})
  for (const profile of ['usuario', 'creador', 'organizacion'] as const) assert.deepEqual(validateRegistration({ ...values, profile }), {})
  for (const changes of [{ firstName: ' ' }, { lastName: 'a'.repeat(121) }, { password: 'corta' }, { password: 'a'.repeat(129) }, { terms: false }, { confirmation: 'otra contraseña' }, { phoneCountryCode: '+591' }, { phoneNumber: '12345678' }, { profile: 'admin' }]) assert.ok(Object.keys(validateRegistration({ ...values, ...changes } as RegistrationValues)).length)
  assert.deepEqual(validateRegistration({ ...values, phoneCountryCode: '+591', phoneNumber: '12345678' }), {})
})
test('registro explica la longitud de contraseña sin afirmar que mide toda su seguridad', () => {
  assert.equal(passwordLengthGuidance('frase corta').valid, false)
  assert.match(passwordLengthGuidance('frase corta').message, /Faltan 4 caracteres/)
  assert.equal(passwordLengthGuidance('una frase de prueba larga').valid, true)
  assert.match(passwordLengthGuidance('una frase de prueba larga').message, /no mide toda la seguridad/)
  assert.equal(passwordLengthGuidance(' '.repeat(15)).valid, false)
})
test('registro asocia errores de validación del servidor con campos conocidos sin mostrar detalles internos', async () => {
  assert.deepEqual(registrationErrorsFrom(['phoneNumber must match /^\\d/', 'email must be an email']), {
    phoneNumber: 'Usa de 4 a 30 dígitos, sin espacios.', email: 'Revisa el formato del correo electrónico.'
  })
  await assert.rejects(registerAccount(values, undefined, (async () => Response.json({ statusCode: 400, message: ['phoneNumber must match /^\\d/'] }, { status: 400 })) as typeof fetch),
    (error: unknown) => error instanceof RegistrationError && error.kind === 'invalid' && !!error.fields.phoneNumber)
})
test('cliente envía solo contrato permitido, normaliza datos y no envía confirmación, perfil ni roles', async () => {
  const result = await registerAccount(values, undefined, (async (url, init) => {
    assert.equal(url, '/api/auth/register')
    assert.equal(init?.credentials, 'omit')
    assert.equal(init?.redirect, 'error')
    assert.deepEqual(JSON.parse(String(init?.body)), { firstName: 'María', lastName: "D'Ávila", email: 'prueba@example.invalid', password: values.password, demoConsent: true })
    return Response.json({ id: '00000000-0000-4000-8000-000000000001', status: 'PENDING_VERIFICATION' }, { status: 201 })
  }) as typeof fetch)
  assert.equal(result.status, 'PENDING_VERIFICATION')
})
test('cliente distingue errores HTTP y nunca convierte un fallo en éxito simulado', async () => {
  for (const [status, kind] of [[400, 'invalid'], [409, 'conflict'], [429, 'busy'], [503, 'unavailable'], [500, 'unknown'], [200, 'unknown']] as const) {
    await assert.rejects(registerAccount(values, undefined, (async () => new Response('', { status })) as typeof fetch), (error: unknown) => error instanceof RegistrationError && error.kind === kind)
  }
  await assert.rejects(registerAccount(values, undefined, (async () => { throw new TypeError('network') }) as typeof fetch), (error: unknown) => error instanceof RegistrationError && error.kind === 'unknown')
  await assert.rejects(registerAccount(values, undefined, (async () => Response.json({ success: true }, { status: 201 })) as typeof fetch), RegistrationError)
})
