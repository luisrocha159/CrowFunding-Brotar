import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PasswordField } from '../src/features/access/AccessComponents'
import { CampaignSectionsEditor } from '../src/features/campaigns/CampaignSectionsEditor'
import { validateRegistration, type RegistrationValues } from '../src/features/access/register/registration'
import { validateReset } from '../src/features/access/recover-password/passwordRecoveryClient'
import { validateDraft, validateGeneralInput, validateStoryInput } from '../src/features/campaigns/campaignsClient'
import { normalizeGeneral, validateGeneral } from '../backend/src/campaigns/domain/general'
import { budgetTotal, type BudgetInput } from '../src/features/campaigns/sectionsClient'
import { validateBudget, validateFunding, validatePlan, validateRewards } from '../src/features/campaigns/sectionValidation'
import * as server from '../backend/src/campaigns/domain/sections'
import { decisionErrors } from '../src/features/campaigns/administrativeClient'

const budget: BudgetInput = { items: [{ categoryId: 'cat', description: 'Semillas de cañahua', quantity: 1, unitPrice: 0.1, plannedAmount: 0.1, notes: 'Compra local' }], risks: [] }
const registration: RegistrationValues = { firstName: 'Muñoz', lastName: 'Peña', email: 'ensayo@example.invalid', password: ' Ñ y café para ensayo ', confirmation: ' Ñ y café para ensayo ', terms: true, phoneCountryCode: '', phoneNumber: '', profile: 'usuario' }

test('S2 calidad: Ñ, acentos y contraseñas Unicode exactas; límites por puntos de código', () => {
  for (const password of [registration.password, '😀'.repeat(128), 'é'.repeat(15)]) {
    assert.deepEqual(validateRegistration({ ...registration, password, confirmation: password }), {})
    assert.deepEqual(validateReset({ token: 'a'.repeat(64), password, confirmation: password }), {})
  }
  for (const password of ['😀'.repeat(129), ' '.repeat(15), 'Ñ'.repeat(14)]) assert.ok(validateRegistration({ ...registration, password, confirmation: password }).password)
  assert.ok(validateRegistration({ ...registration, confirmation: registration.password.trim() }).confirmation)
  for (const firstName of ['123', 'Ana9', '<script>', 'Nulo\u0000']) assert.ok(validateRegistration({ ...registration, firstName }).firstName)
})

test('S2 calidad: campo HTML no trunca los 128 caracteres Unicode admitidos', () => {
  const html = renderToStaticMarkup(<PasswordField id="pw" name="pw" label="Contraseña" value="" onChange={() => {}} maxLength={128} />)
  assert.match(html, /maxLength="256"/)
  assert.match(html, /type="password"/)
  assert.match(html, /aria-controls="pw"/)
})

test('S2 calidad: vista separada conserva aviso accesible durante la carga inicial', () => {
  const html = renderToStaticMarkup(<CampaignSectionsEditor id="ensayo" step={4} editable campaignType="REWARD" onBusyChange={() => {}} onDirtyChange={() => {}} />)
  assert.match(html, /role="status"/)
  assert.match(html, /Cargando datos guardados/)
  assert.doesNotMatch(html, /Sección guardada/)
})

test('S2 calidad: importes de dos decimales y suma de céntimos sin falso rechazo', () => {
  for (const amount of [0.29, 19.99, 99999999999.99, 999999999999.99]) {
    const input = { ...budget, items: [{ ...budget.items[0]!, unitPrice: amount, plannedAmount: amount }] }
    assert.deepEqual(validateBudget(input), {})
    assert.deepEqual(validateBudget(input), server.validateBudget(input))
  }
  for (const amount of [NaN, Infinity, -1, 0, 1.001, 1000000000000]) assert.ok(validateBudget({ ...budget, items: [{ ...budget.items[0]!, plannedAmount: amount }] })['items.0.plannedAmount'])
  assert.equal(budgetTotal({ ...budget, items: [budget.items[0]!, { ...budget.items[0]!, plannedAmount: 0.2 }] }), 0.3)
})

test('S2 calidad: textos extensos y nulos generan campos identificables y paridad API', () => {
  for (const notes of ['a'.repeat(5001), 'Nulo\u0000']) {
    const input = { ...budget, items: [{ ...budget.items[0]!, notes }] }
    assert.ok(validateBudget(input)['items.0.notes'])
    assert.deepEqual(validateBudget(input), server.validateBudget(input))
  }
  const plan = { activities: [{ name: 'Ñandú\u0000', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-02' }], milestones: [] }
  assert.ok(validatePlan(plan)['activities.0.name'])
  assert.deepEqual(validatePlan(plan), server.validatePlan(plan))
  const reward = [{ title: 'Cañahua', description: 'a'.repeat(5001), rewardKind: 'REWARD', minAmount: 10, quantityTotal: 0, estimatedDeliveryOn: '2027-01-01' }]
  assert.ok(validateRewards('REWARD', reward)['rewards.0.description'])
  assert.deepEqual(validateRewards('REWARD', reward), server.validateRewards('REWARD', reward))
})

test('S2 calidad: febrero imposible y fechas invertidas no se normalizan silenciosamente', () => {
  const funding = { goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: '2026-02-31T00:00:00Z', endsAt: '2026-04-01T00:00:00Z' }
  assert.ok(validateFunding(funding).startsAt)
  assert.deepEqual(validateFunding(funding), server.validateFunding(funding))
  assert.ok(validateFunding({ ...funding, startsAt: '2026-02-01T00:00:00Z', endsAt: '2026-02-31T00:00:00Z' }).endsAt)
})

test('S2 calidad: borrador e historia admiten español pero rechazan NUL por campo', () => {
  const draft = { title: 'Campaña de cañahua 2026', summary: 'Producción sostenible', campaignType: 'DONATION' as const, categoryId: null, organizationId: null }
  assert.deepEqual(validateDraft(draft), {})
  assert.ok(validateDraft({ ...draft, title: 'Campaña\u0000' }).title)
  const general = { title: 'Ñandú', summary: 'Cultivo', categoryId: 'cat', location: { countryCode: 'bo', locality: 'Nulo\u0000', addressLine: '', reference: '' } }
  assert.deepEqual(validateGeneralInput(general), validateGeneral(normalizeGeneral(general)))
  const story = { problem: 'Sequía', solution: 'Plantación', beneficiaries: 'Familias', expectedResults: 'Mejora' }
  assert.deepEqual(validateStoryInput(story, []), {})
  assert.ok(validateStoryInput({ ...story, problem: 'Nulo\u0000' }, []).problem)
  assert.ok(validateStoryInput(story, [{ name: 'Meta\u0000', description: '', unit: 'familias', baselineValue: null, targetValue: 10 }])['indicators.0.name'])
})

test('S2 calidad: decisiones administrativas no envían motivos ni observaciones NUL', () => {
  const decision = { decision: 'CHANGES_REQUESTED' as const, comment: 'Ajustar', expectedRound: 1, observations: [] }
  assert.ok(decisionErrors({ ...decision, comment: 'Nulo\u0000' }).comment)
  assert.ok(Object.keys(decisionErrors({ ...decision, observations: [{ section: 'story', fieldPath: null, message: 'Nulo\u0000' }] })).length)
})
