import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateRegistration } from '../src/features/access/register/registration'
import { validateProfile } from '../src/features/access/session/profileClient'
import { validateReset } from '../src/features/access/recover-password/passwordRecoveryClient'
import { readGeneral, readStory, saveStory } from '../src/features/campaigns/campaignsClient'
import { SessionError } from '../src/shared/api/sessionError'

test('registro y perfil validan nombres sin perder acentos y apóstrofes', () => {
  const base = { firstName: 'María', lastName: "D’Ávila", email: 'qa@example.invalid', password: 'frase de ensayo larga', confirmation: 'frase de ensayo larga', terms: true, profile: 'usuario' as const, phoneCountryCode: '', phoneNumber: '' }
  assert.deepEqual(validateRegistration(base), {})
  for (const name of ['12345', 'Ana2', '---', '😀']) {
    assert.ok(validateRegistration({ ...base, firstName: name }).firstName)
    assert.ok(validateProfile({ ...base, lastName: name }).lastName)
  }
  assert.ok(validateRegistration({ ...base, password: ' '.repeat(20), confirmation: ' '.repeat(20) }).password)
  assert.ok(validateReset({ token: 'a'.repeat(64), password: ' '.repeat(20), confirmation: ' '.repeat(20) }).password)
})

test('contratos incompletos de información e historia producen error controlado', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = (async () => Response.json({ location: {}, limits: {} })) as typeof fetch
    await assert.rejects(readGeneral('draft'), SessionError)
    globalThis.fetch = (async () => Response.json({ story: {}, indicators: [{}] })) as typeof fetch
    await assert.rejects(readStory('draft'), SessionError)
  } finally { globalThis.fetch = original }
})

test('una meta no finita no se serializa como null ni se presenta como guardada', async () => {
  const original = globalThis.fetch
  let calls = 0
  try {
    globalThis.fetch = (async () => { calls++; return Response.json({}) }) as typeof fetch
    await assert.rejects(saveStory('draft', { problem: '', solution: '', beneficiaries: '', expectedResults: '' }, [
      { name: 'Meta', description: '', unit: 'familias', baselineValue: null, targetValue: Infinity }
    ]), SessionError)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = original }
})
