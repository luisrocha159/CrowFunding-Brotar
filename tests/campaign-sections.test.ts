import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readPlan, savePlan, budgetTotal, type PlanInput, type BudgetInput } from '../src/features/campaigns/sectionsClient'

test('el plan se lee y guarda mediante la API del borrador propio', async () => {
  const plan: PlanInput = { activities: [{ name: 'Obra', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-02' }], milestones: [] }
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
