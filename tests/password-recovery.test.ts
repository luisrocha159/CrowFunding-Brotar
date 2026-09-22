import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RecoveryError, requestPasswordRecovery, resetPassword, validateRecoveryEmail, validateReset, type ResetValues } from '../src/features/access/recover-password/passwordRecoveryClient'

const token = 'a'.repeat(64)
const values: ResetValues = { token, password: 'una frase nueva segura', confirmation: 'una frase nueva segura' }

test('recuperación valida correo, token, contraseña y confirmación', () => {
  assert.deepEqual(validateRecoveryEmail(' TEST@example.invalid '), {})
  assert.ok(validateRecoveryEmail('no-correo').email)
  assert.deepEqual(validateReset(values), {})
  assert.ok(validateReset({ ...values, token: 'mal' }).token)
  assert.ok(validateReset({ ...values, password: 'corta', confirmation: 'corta' }).password)
  assert.ok(validateReset({ ...values, confirmation: 'otra frase nueva segura' }).confirmation)
})

test('solicitud usa endpoint real, normaliza correo y no afirma envío', async () => {
  const result = await requestPasswordRecovery(' TEST@example.invalid ', undefined, (async (url, init) => {
    assert.equal(url, '/api/auth/password/recovery')
    assert.equal(init?.credentials, 'same-origin')
    assert.equal((init?.headers as Record<string, string>)['X-Brotar-Request'], '1')
    assert.deepEqual(JSON.parse(String(init?.body)), { email: 'test@example.invalid' })
    return Response.json({ accepted: true, resetPath: `/recuperar-contrasena?token=${token}` }, { status: 202 })
  }) as typeof fetch)
  assert.deepEqual(result, { accepted: true, resetPath: `/recuperar-contrasena?token=${token}` })
})

test('restablecimiento envía token y nueva contraseña sin confirmación', async () => {
  await resetPassword(values, undefined, (async (url, init) => {
    assert.equal(url, '/api/auth/password/reset')
    assert.deepEqual(JSON.parse(String(init?.body)), { token, password: values.password })
    return new Response('', { status: 204 })
  }) as typeof fetch)
})

test('cliente distingue errores de recuperación y enlace vencido', async () => {
  for (const [status, kind] of [[400, 'invalid'], [401, 'expired'], [429, 'busy'], [503, 'unavailable'], [500, 'unknown']] as const) {
    await assert.rejects(requestPasswordRecovery('test@example.invalid', undefined, (async () => new Response('', { status })) as typeof fetch), (error: unknown) => error instanceof RecoveryError && error.kind === kind)
  }
  await assert.rejects(resetPassword(values, undefined, (async () => new Response('', { status: 401 })) as typeof fetch), (error: unknown) => error instanceof RecoveryError && error.kind === 'expired')
})
