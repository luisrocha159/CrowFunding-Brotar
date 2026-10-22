import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readPlan, readBudget, readFunding, readRewards, readSectionCatalogs, savePlan, saveBudget, saveFunding, saveRewards, budgetTotal, planFrom, withoutActivity, type PlanInput, type BudgetInput } from '../src/features/campaigns/sectionsClient'
import { DraftFieldError } from '../src/features/campaigns/campaignsClient'
import { SessionError } from '../src/features/access/session/sessionClient'
import { validatePlan, validateBudget, validateFunding, validateRewards } from '../src/features/campaigns/sectionValidation'
import * as server from '../backend/src/campaigns/domain/sections'

test('el plan se lee y guarda mediante la API del borrador propio', async () => {
  const plan: PlanInput = { activities: [{ name: 'Obra comunitaria', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-02' }], milestones: [] }
  const calls: string[] = []
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`)
    return new Response(JSON.stringify(plan), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  assert.deepEqual(await readPlan('camp', undefined, fetcher), plan)
  assert.deepEqual(await savePlan('camp', plan, undefined, fetcher), plan)
  assert.deepEqual(calls, ['GET /api/campaigns/drafts/camp/plan', 'PUT /api/campaigns/drafts/camp/plan'])
})

test('el total de presupuesto usa únicamente partidas guardadas', () => {
  const budget: BudgetInput = { items: [{ categoryId: 'c', description: 'Material', quantity: 2, unitPrice: 5, plannedAmount: 10, notes: '' }], risks: [] }
  assert.equal(budgetTotal(budget), 10)
})

test('hitos múltiples: contrato, guardado y eliminación de una actividad conservan los otros vínculos', async () => {
  const plan: PlanInput = {
    activities: [
      { name: 'Preparar terreno', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-05' },
      { name: 'Instalar riego', responsibleName: 'Ana', plannedStartOn: '2026-11-06', plannedEndOn: '2026-11-10' },
      { name: 'Sembrar plantas', responsibleName: 'Ana', plannedStartOn: '2026-11-11', plannedEndOn: '2026-11-12' }
    ], milestones: [{ name: 'Huerto listo', responsibleName: 'Ana', plannedStartOn: '2026-11-12', plannedEndOn: '2026-11-12', activityIndexes: [0, 1, 2] }]
  }
  assert.deepEqual(planFrom(plan), plan)
  const legacy = { ...plan, milestones: [{ name: 'Huerto listo', responsibleName: 'Ana', plannedStartOn: '2026-11-12', plannedEndOn: '2026-11-12', activityIndex: 1 }] }
  assert.deepEqual(planFrom(legacy).milestones[0]!.activityIndexes, [1], 'Una pantalla con formato anterior conserva el vínculo al actualizarse.')
  assert.deepEqual(planFrom({ ...legacy, milestones: [{ ...legacy.milestones[0], activityIndex: null }] }).milestones[0]!.activityIndexes, [])
  assert.throws(() => planFrom({ ...legacy, milestones: [{ ...legacy.milestones[0], activityIndex: '1' }] }), SessionError)
  assert.deepEqual(withoutActivity(plan, 1), { activities: [plan.activities[0], plan.activities[2]], milestones: [{ ...plan.milestones[0], activityIndexes: [0, 1] }] })
  assert.deepEqual(plan.milestones[0]!.activityIndexes, [0, 1, 2], 'La operación no muta el estado anterior.')
  for (const activityIndexes of [[0, 0], [-1], [3], [0.5], ['0'], null]) assert.throws(() => planFrom({ ...plan, milestones: [{ ...plan.milestones[0], activityIndexes }] }), SessionError)
  let sent = false
  const fetcher = (async (_url: string, init?: RequestInit) => { assert.deepEqual(JSON.parse(init!.body as string), plan); sent = true; return new Response(JSON.stringify(plan)) }) as typeof fetch
  assert.deepEqual(await savePlan('camp', plan, undefined, fetcher), plan)
  assert.equal(sent, true)
})

test('contratos de secciones rechazan respuestas anidadas malformadas sin simular éxito', async () => {
  const response = (value: unknown) => (async () => new Response(JSON.stringify(value))) as typeof fetch
  await assert.rejects(() => readPlan('camp', undefined, response({ activities: [null], milestones: [] })), SessionError)
  await assert.rejects(() => readBudget('camp', undefined, response({ items: [{ plannedAmount: '10' }], risks: [] })), SessionError)
  await assert.rejects(() => readFunding('camp', undefined, response({ goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: 42, endsAt: null })), SessionError)
  await assert.rejects(() => readRewards('camp', undefined, response({ rewards: [{ title: 'Solo título' }] })), SessionError)
  await assert.rejects(() => readSectionCatalogs('camp', undefined, response({ expenseCategories: [null], currencies: [] })), SessionError)
})

test('formularios inválidos muestran errores por campo antes de enviar una solicitud', async () => {
  let calls = 0
  const send = (async () => { calls += 1; return new Response('{}') }) as typeof fetch
  await assert.rejects(() => savePlan('camp', { activities: [], milestones: [] }, undefined, send), DraftFieldError)
  await assert.rejects(() => saveBudget('camp', { items: [], risks: [] }, undefined, send), DraftFieldError)
  await assert.rejects(() => saveFunding('camp', { goalAmount: 0, currencyCode: '', durationDays: null, fundingModel: '', startsAt: null, endsAt: null }, undefined, send), DraftFieldError)
  await assert.rejects(() => saveRewards('camp', [{ title: '', description: '', rewardKind: '', minAmount: 0, quantityTotal: null, estimatedDeliveryOn: null }], undefined, send), DraftFieldError)
  assert.equal(calls, 0)
})

test('validaciones inmediatas y del servidor coinciden sin imponer presupuesto igual a meta', () => {
  const plan = { activities: [{ name: 'Obra', responsibleName: '', plannedStartOn: '2026-02-31', plannedEndOn: '2026-01-01' }], milestones: [] }
  const budget = { items: [{ categoryId: 'c', description: 'Material', quantity: 1, unitPrice: 0.29, plannedAmount: 0.29, notes: '' }], risks: [] }
  const funding = { goalAmount: 100, currencyCode: 'BOB', durationDays: 19, fundingModel: 'FLEXIBLE', startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-11-20T00:00:00.000Z' }
  const rewards = [{ title: 'Producto', description: 'Una unidad', rewardKind: 'REWARD', minAmount: -1, quantityTotal: -1, estimatedDeliveryOn: '2026-02-31' }]
  assert.deepEqual(validatePlan(plan), server.validatePlan(plan))
  assert.deepEqual(validateBudget(budget), server.validateBudget(budget))
  assert.deepEqual(validateFunding(funding), server.validateFunding(funding))
  assert.deepEqual(validateFunding(funding), {})
  assert.deepEqual(validateRewards('REWARD', rewards), server.validateRewards('REWARD', rewards))
  assert.deepEqual(validateRewards('DONATION', rewards), server.validateRewards('DONATION', rewards))
})
