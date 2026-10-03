import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { RegisterUserDto } from '../src/users/infrastructure/http/register-user.dto'
import { ProfileDto } from '../src/profiles/infrastructure/profile.controller'
import { GeneralDto } from '../src/campaigns/infrastructure/general.controller'
import { validateIndicator } from '../src/campaigns/domain/story'

test('nombres personales rechazan números y símbolos pero conservan escritura internacional', async () => {
  const base = { firstName: 'María', lastName: "D’Ávila", email: 'qa@example.invalid', password: 'frase de ensayo larga', demoConsent: true }
  for (const name of ['12345', 'Ana2', '---', '😀']) {
    assert.ok((await validate(plainToInstance(RegisterUserDto, { ...base, firstName: name }))).some(e => e.property === 'firstName'))
    assert.ok((await validate(plainToInstance(ProfileDto, { firstName: 'Ana', lastName: name, phoneCountryCode: '', phoneNumber: '' }))).some(e => e.property === 'lastName'))
  }
  for (const name of ['María José', 'Jean-Luc', "D'Ávila", '李', 'Jose\u0301']) {
    assert.equal((await validate(plainToInstance(RegisterUserDto, { ...base, firstName: name }))).length, 0)
  }
})

test('registro no admite una contraseña formada solo por espacios', async () => {
  const errors = await validate(plainToInstance(RegisterUserDto, { firstName: 'Ana', lastName: 'Prueba', email: 'qa@example.invalid', password: ' '.repeat(20), demoConsent: true }))
  assert.ok(errors.some(e => e.property === 'password'))
})

test('información general exige un objeto ubicación antes de llegar al caso de uso', async () => {
  for (const location of [undefined, null, [], 'BO', 123]) {
    const errors = await validate(plainToInstance(GeneralDto, { title: 'Campaña', summary: 'Resumen', location }))
    assert.ok(errors.some(e => e.property === 'location'))
  }
})

test('indicadores respetan numeric 14 2 y no redondean datos silenciosamente', () => {
  const base = { name: 'Familias', description: '', unit: 'familias', baselineValue: null, targetValue: 120 }
  for (const value of [1e12, -1e12, 1.234, Infinity, NaN]) {
    assert.ok(validateIndicator({ ...base, targetValue: value }).targetValue)
  }
  for (const value of [0, 0.29, -0.25, 999999999999.99]) assert.deepEqual(validateIndicator({ ...base, targetValue: value }), {})
  assert.ok(validateIndicator({ ...base, description: 'x'.repeat(5001) }).description)
})
