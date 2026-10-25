import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { RegisterUserDto } from '../src/users/infrastructure/http/register-user.dto'
import { ScryptPasswordHasher } from '../src/users/infrastructure/scrypt-password-hasher'
import { BudgetDto, RewardsDto } from '../src/campaigns/infrastructure/sections.controller'
import { validateBudget, validateFunding } from '../src/campaigns/domain/sections'
import { isValidTitle, isValidSummary } from '../src/campaigns/domain/draft'
import { validateGeneral } from '../src/campaigns/domain/general'
import { validateStory, validateIndicator } from '../src/campaigns/domain/story'
import { ReviewInvalid, validateDecision } from '../src/campaigns/domain/administrative-review'

test('S2 calidad: hash conserva Ñ, representación Unicode y espacios exactos', async () => {
  const hasher = new ScryptPasswordHasher()
  const password = ' Ñ y café para un ensayo '
  const hash = await hasher.hash(password)
  assert.equal(await hasher.verify(password, hash), true)
  for (const changed of [password.trim(), password.replace('Ñ', 'N'), password.replace('é', 'e\u0301')]) assert.equal(await hasher.verify(changed, hash), false)
})

test('S2 calidad: DTO acepta español y 128 puntos de código; rechaza nombres numéricos', async () => {
  const input = { firstName: 'Muñoz', lastName: 'Peña', email: 'ensayo@example.invalid', password: '😀'.repeat(128), demoConsent: true }
  assert.deepEqual(await validate(plainToInstance(RegisterUserDto, input)), [])
  for (const patch of [{ firstName: '123' }, { firstName: 'Ana9' }, { password: '😀'.repeat(129) }, { password: ' '.repeat(15) }]) assert.ok((await validate(plainToInstance(RegisterUserDto, { ...input, ...patch }))).length)
})

test('S2 calidad: DTO acota texto anidado de presupuesto, riesgos y recompensas', async () => {
  const item = { categoryId: '00000000-0000-4000-8000-000000000001', description: 'Semillas', quantity: 1, unitPrice: 10, plannedAmount: 10, notes: 'a'.repeat(5001) }
  assert.ok((await validate(plainToInstance(BudgetDto, { items: [item], risks: [] }))).length)
  assert.ok((await validate(plainToInstance(BudgetDto, { items: [], risks: [{ title: 'Riesgo', description: '', likelihood: '', impact: '', mitigation: 'a'.repeat(5001) }] }))).length)
  assert.ok((await validate(plainToInstance(RewardsDto, { rewards: [{ title: 'Planta', description: 'a'.repeat(5001), rewardKind: 'REWARD', minAmount: 10, quantityTotal: null, estimatedDeliveryOn: null }] }))).length)
})

test('S2 calidad: reglas de importes no confunden precisión binaria con tres decimales', () => {
  const item = { categoryId: 'cat', description: 'Semillas comunitarias', quantity: 1, unitPrice: 999999999999.99, plannedAmount: 999999999999.99, notes: '' }
  assert.deepEqual(validateBudget({ items: [item], risks: [] }), {})
  assert.ok(validateBudget({ items: [{ ...item, plannedAmount: 1.001 }], risks: [] })['items.0.plannedAmount'])
  assert.ok(validateFunding({ goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: '2026-02-31T00:00:00Z', endsAt: '2026-04-01T00:00:00Z' }).startsAt)
})

test('S2 calidad: NUL se rechaza antes de PostgreSQL sin eliminar Ñ ni números de campaña', () => {
  assert.equal(isValidTitle('Campaña de cañahua 2026'), true)
  assert.equal(isValidTitle('Campaña\u0000'), false)
  assert.equal(isValidSummary('Resumen\u0000'), false)
  assert.ok(validateGeneral({ title: 'Ñandú', summary: 'Cultivo', categoryId: 'cat', location: { countryCode: 'BO', locality: 'Nulo\u0000', addressLine: '', reference: '' } }).locality)
  assert.ok(validateStory({ problem: 'Nulo\u0000', solution: '', beneficiaries: '', expectedResults: '' }).problem)
  assert.ok(validateIndicator({ name: 'Meta', description: 'Nulo\u0000', unit: '', baselineValue: null, targetValue: null }).description)
  assert.throws(() => validateDecision({ decision: 'CHANGES_REQUESTED', comment: 'Nulo\u0000', expectedRound: 1, observations: [] }), ReviewInvalid)
  assert.throws(() => validateDecision({ decision: 'CHANGES_REQUESTED', comment: 'Ajustar', expectedRound: 1, observations: [{ section: 'story', fieldPath: null, message: 'Nulo\u0000' }] }), ReviewInvalid)
})
