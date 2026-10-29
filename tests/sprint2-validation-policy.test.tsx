import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { FormField } from '../src/shared/components/FormField'
import { validateDraft, validateStoryInput } from '../src/features/campaigns/campaignsClient'
import { validateBudget, validateBudgetGoal, validateFunding, validatePlan, validateRewards, validateRewardFunding } from '../src/features/campaigns/sectionValidation'
import { checkEmailAvailability, RegistrationError } from '../src/features/access/register/registration'
import { plannedAmount, textError, today, validDate } from '../backend/src/campaigns/domain/input-policy'
import { validateIndicator } from '../backend/src/campaigns/domain/story'
import { phoneErrors } from '../backend/src/shared/domain/phone'
import { submissionFieldsForStep } from '../src/features/campaigns/submissionClient'

const future = (days: number) => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10) }
const funding = { goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: null, endsAt: null }
const budget = { items: [{ categoryId: 'cat', description: 'Semillas de cañahua', quantity: 2, unitPrice: 5, plannedAmount: 10, notes: '' }], risks: [] }
const reward = { title: 'Planta nativa', description: 'Una planta nativa de ensayo', rewardKind: 'REWARD', minAmount: 5, quantityTotal: null, estimatedDeliveryOn: future(50) }

test('reglas del equipo: resumen 11–500 y texto significativo sin HTML ni controles', () => {
  const input = { title: 'Huerto comunitario', summary: 'Cultivo para la comunidad', campaignType: 'DONATION' as const, categoryId: null, organizationId: null }
  assert.deepEqual(validateDraft(input), {})
  for (const summary of ['', 'a'.repeat(10), ' '.repeat(11), '!!!'.repeat(10), '<script>alert(1)</script>', 'Invisible\u200b', 'a'.repeat(501)]) assert.ok(validateDraft({ ...input, summary }).summary)
  for (const summary of ['a'.repeat(11), 'a'.repeat(500), 'Ñandú para cultivar']) assert.deepEqual(validateDraft({ ...input, summary }), {})
  assert.equal(textError('Texto con Ñ\nsegunda línea', 10, 100), undefined)
  assert.ok(textError('Texto inválido \uD800', 10, 100))
  assert.equal(textError('Texto con emoji válido 😀', 10, 100), undefined)
})

test('fechas: día de Bolivia, calendario real, fechas pasadas y hitos fuera de actividad', () => {
  assert.equal(today(new Date('2026-10-14T02:00:00Z')), '2026-10-13')
  assert.equal(validDate('2028-02-29'), true)
  for (const value of ['2026-02-29', '2026-02-31', '2026-13-01', 'no-fecha']) assert.equal(validDate(value), false)
  const activity = { name: 'Plantación comunitaria', responsibleName: 'Ana', plannedStartOn: future(10), plannedEndOn: future(20) }
  assert.deepEqual(validatePlan({ activities: [activity], milestones: [] }), {})
  for (const day of [future(-1), '2026-02-31']) assert.ok(validatePlan({ activities: [{ ...activity, plannedStartOn: day }], milestones: [] })['activities.0.plannedStartOn'])
  assert.ok(validatePlan({ activities: [activity], milestones: [{ ...activity, name: 'Entrega comunitaria', plannedEndOn: future(19), activityIndexes: [0] }] })['milestones.0.plannedEndOn'])
  assert.ok(validatePlan({ activities: [activity, activity], milestones: [] })['activities.1.name'])
})

test('presupuesto: cálculo en céntimos, importes coherentes y meta estrictamente superior', () => {
  assert.equal(plannedAmount(3, 0.29), 0.87)
  assert.deepEqual(validateBudget(budget), {})
  for (const amount of [0, -1, 1.001, Infinity, NaN, 9.99, 10.01]) assert.ok(validateBudget({ ...budget, items: [{ ...budget.items[0]!, plannedAmount: amount }] })['items.0.plannedAmount'])
  assert.deepEqual(validateBudgetGoal(budget, funding), {})
  for (const goalAmount of [9.99, 10]) assert.ok(validateBudgetGoal(budget, { ...funding, goalAmount }).goalAmount)
  assert.deepEqual(validateBudgetGoal(budget, { ...funding, goalAmount: 10.01 }), {})
})

test('riesgos: probabilidad de 0 a 100 y opciones cerradas de impacto', () => {
  const risk = { title: 'Retraso logístico', description: 'El proveedor puede atrasarse', likelihood: '50', impact: 'Medio', mitigation: 'Mantener un proveedor alternativo' }
  for (const likelihood of ['0', '0.01', '50', '100', '100.00']) assert.deepEqual(validateBudget({ ...budget, risks: [{ ...risk, likelihood }] }), {})
  for (const likelihood of ['', '-1', '100.01', '101', '50%', 'Media', '1e2', '0.001']) assert.ok(validateBudget({ ...budget, risks: [{ ...risk, likelihood }] })['risks.0.likelihood'])
  assert.ok(validateBudget({ ...budget, risks: [{ ...risk, impact: 'INVENTADO' }] })['risks.0.impact'])
})

test('indicadores: unidades cerradas, enteros para personas y porcentajes hasta 100', () => {
  const indicator = { name: 'Familias beneficiarias', description: '', unit: 'familias', baselineValue: 0, targetValue: 10 }
  assert.deepEqual(validateIndicator(indicator), {})
  for (const value of [-1, 1.5, NaN, Infinity]) assert.ok(validateIndicator({ ...indicator, targetValue: value }).targetValue)
  for (const value of [0, 0.25, 100]) assert.deepEqual(validateIndicator({ ...indicator, unit: '%', targetValue: value }), {})
  assert.ok(validateIndicator({ ...indicator, unit: '%', targetValue: 100.01 }).targetValue)
  assert.ok(validateIndicator({ ...indicator, unit: 'inventada' }).unit)
  assert.ok(validateIndicator({ ...indicator, targetValue: null }).targetValue)
  const story = { problem: 'Problema comunitario de ensayo', solution: 'Solución comunitaria de ensayo', beneficiaries: 'Familias de la comunidad rural', expectedResults: 'Resultados comunitarios esperados' }
  assert.deepEqual(validateStoryInput(story, [indicator]), {})
  assert.ok(validateStoryInput(story, []).indicators)
})

test('financiamiento: duración entera, fechas coherentes y no pasadas', () => {
  assert.deepEqual(validateFunding(funding), {})
  for (const durationDays of [0, -1, 1.5, 366, Infinity, NaN]) assert.ok(validateFunding({ ...funding, durationDays }).durationDays)
  const dated = { ...funding, startsAt: `${future(10)}T00:00:00Z`, endsAt: `${future(40)}T00:00:00Z` }
  assert.deepEqual(validateFunding(dated), {})
  assert.ok(validateFunding({ ...dated, durationDays: 31 }).durationDays)
  assert.ok(validateFunding({ ...dated, startsAt: `${future(-1)}T00:00:00Z` }).startsAt)
  assert.ok(validateFunding({ ...dated, endsAt: null }).endsAt)
})

test('modalidades: preventa exige stock; donación no admite recompensas; entrega y aporte coherentes', () => {
  assert.deepEqual(validateRewards('REWARD', [reward]), {})
  assert.ok(validateRewards('PRESALE', [{ ...reward, rewardKind: 'PRESALE' }])['rewards.0.quantityTotal'])
  assert.deepEqual(validateRewards('PRESALE', [{ ...reward, rewardKind: 'PRESALE', quantityTotal: 2 }]), {})
  assert.ok(validateRewards('DONATION', [reward]).rewards)
  for (const quantityTotal of [0, -1, 1.5, 2147483648]) assert.ok(validateRewards('REWARD', [{ ...reward, quantityTotal }])['rewards.0.quantityTotal'])
  assert.ok(validateRewards('REWARD', [{ ...reward, estimatedDeliveryOn: future(-1) }])['rewards.0.estimatedDeliveryOn'])
  assert.ok(validateRewards('REWARD', [reward, reward])['rewards.1.title'])
  assert.ok(validateRewardFunding([{ ...reward, minAmount: 101 }], funding)['rewards.0.minAmount'])
  assert.ok(validateRewardFunding([reward], { ...funding, endsAt: `${future(51)}T00:00:00Z` })['rewards.0.estimatedDeliveryOn'])
})

test('correo: contrato normalizado, comprobación real y errores sin fingir disponibilidad', async () => {
  let calls = 0
  const send = (async (url, init) => { calls++; assert.equal(url, '/api/auth/email-availability'); assert.deepEqual(JSON.parse(String(init?.body)), { email: 'ensayo@example.invalid' }); return Response.json({ email: 'ensayo@example.invalid', available: true }, { status: 201 }) }) as typeof fetch
  assert.equal(await checkEmailAvailability(' Ensayo@example.invalid ', undefined, send), true)
  await assert.rejects(() => checkEmailAvailability('no-correo', undefined, send), RegistrationError)
  assert.equal(calls, 1)
  const response = (body: unknown, status = 201) => (async () => Response.json(body, { status })) as typeof fetch
  assert.equal(await checkEmailAvailability('ensayo@example.invalid', undefined, response({ email: 'ensayo@example.invalid', available: false })), false)
  for (const [body, status] of [[{}, 201], [{ email: 'otro@example.invalid', available: true }, 201], [{ available: 'sí' }, 201], [{}, 429], [{}, 503]] as const) await assert.rejects(() => checkEmailAvailability('ensayo@example.invalid', undefined, response(body, status)), RegistrationError)
})

test('campos obligatorios: el asterisco aparece también al envolver controles hijos', () => {
  const native = renderToStaticMarkup(<FormField id="nombre" label="Nombre" required />)
  const wrapped = renderToStaticMarkup(<FormField id="meta" label="Meta"><input required /></FormField>)
  for (const html of [native, wrapped]) assert.match(html, /aria-hidden="true"/)
  assert.match(renderToStaticMarkup(<FormField id="titulo" label="Título" required><input /></FormField>), /required=""/)
})

test('teléfono: pareja opcional, prefijo de hasta tres dígitos y máximo conjunto de quince', () => {
  assert.deepEqual(phoneErrors('', ''), {})
  assert.deepEqual(phoneErrors('+591', '70001234'), {})
  assert.deepEqual(phoneErrors('+591', '1'.repeat(12)), {})
  for (const number of ['', 'abcde', '7000 1234', '1'.repeat(13)]) assert.ok(Object.keys(phoneErrors('+591', number)).length)
  for (const prefix of ['', '+000', '+5911', '591']) assert.ok(phoneErrors(prefix, '70001234').phoneCountryCode)
})

test('avance del asistente: señala los campos de la etapa actual sin exigir las futuras', () => {
  const report = { id: 'draft', status: 'DRAFT', observations: [], missing: [{ field: 'coverFileId', label: 'Portada', step: 3 }, { field: 'activities.0.name', label: 'Nombre de la actividad', step: 4 }, { field: 'goalAmount', label: 'Meta', step: 5 }] }
  assert.deepEqual(submissionFieldsForStep(report, 4), { 'activities.0.name': 'Completa o corrige: Nombre de la actividad' })
  assert.deepEqual(submissionFieldsForStep(report, 0), {})
})
