import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { validatePlan, validateBudget, validateFunding, validateRewards, type PlanInput, type BudgetInput, type RewardInput } from '../src/campaigns/domain/sections'
import { CampaignSections, SectionInvalid, type SectionsRepository } from '../src/campaigns/application/sections'
import { DraftNotEditable, DraftNotFound, type DraftRepository } from '../src/campaigns/application/drafts'
import { FundingDto, PlanDto } from '../src/campaigns/infrastructure/sections.controller'

test('S2-02: actividades e hitos exigen responsables, fechas coherentes y vínculo válido', () => {
  const plan: PlanInput = {
    activities: [{ name: 'Construcción', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-10' }],
    milestones: [{ name: 'Entrega', responsibleName: 'Ana', plannedStartOn: '2026-11-10', plannedEndOn: '2026-11-10', activityIndex: 0 }]
  }
  assert.deepEqual(validatePlan(plan), {})
  assert.ok(validatePlan({ ...plan, activities: [{ ...plan.activities[0]!, plannedEndOn: '2026-10-01' }] })['activities.0.plannedEndOn'])
  assert.ok(validatePlan({ ...plan, activities: [{ ...plan.activities[0]!, plannedStartOn: '2026-02-31' }] })['activities.0.plannedStartOn'])
  assert.ok(validatePlan({ ...plan, milestones: [{ ...plan.milestones[0]!, activityIndex: 4 }] })['milestones.0.activityIndex'])
  assert.ok(validatePlan({ ...plan, activities: [{ ...plan.activities[0]!, responsibleName: '' }] })['activities.0.responsibleName'])
})

test('S2-03: presupuesto y riesgos validan importes positivos', () => {
  const budget: BudgetInput = { items: [{ categoryId: 'cat', description: 'Material', quantity: 2, unitPrice: 5, plannedAmount: 10, notes: '' }], risks: [{ title: 'Retraso', description: '', likelihood: '', impact: '', mitigation: 'Proveedor alternativo' }] }
  assert.deepEqual(validateBudget(budget), {})
  assert.ok(validateBudget({ ...budget, items: [{ ...budget.items[0]!, plannedAmount: 0 }] })['items.0.plannedAmount'])
  assert.deepEqual(validateBudget({ ...budget, items: [{ ...budget.items[0]!, unitPrice: 0.29, plannedAmount: 0.29 }] }), {})
  assert.ok(validateBudget({ ...budget, risks: [{ ...budget.risks[0]!, title: '' }] })['risks.0.title'])
  assert.ok(validateBudget({ ...budget, risks: [{ ...budget.risks[0]!, impact: 'x'.repeat(41) }] })['risks.0.impact'])
})

test('S2-04: meta, moneda, modelo y duración tienen límites reales', () => {
  const funding = { goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'ALL_OR_NOTHING', startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-12-01T00:00:00.000Z' }
  assert.deepEqual(validateFunding(funding), {})
  assert.ok(validateFunding({ ...funding, goalAmount: 0 }).goalAmount)
  assert.ok(validateFunding({ ...funding, fundingModel: 'INVALID' }).fundingModel)
  assert.ok(validateFunding({ ...funding, endsAt: funding.startsAt }).endsAt)
  assert.deepEqual(validateFunding({ ...funding, endsAt: '2026-11-20T00:00:00.000Z' }), {}, 'No se impone una equivalencia exacta entre duración y fechas que todavía no está confirmada.')
  assert.ok(validateFunding({ ...funding, endsAt: null }).endsAt)
})

test('S2-05: recompensas aplicables requieren importe, disponibilidad y fecha', () => {
  const rewards: RewardInput[] = [{ title: 'Producto', description: 'Una unidad', rewardKind: 'PRESALE', minAmount: 25, quantityTotal: 10, estimatedDeliveryOn: '2027-01-01' }]
  assert.deepEqual(validateRewards('PRESALE', rewards), {})
  assert.ok(validateRewards('PRESALE', [{ ...rewards[0]!, minAmount: 0 }])['rewards.0.minAmount'])
  assert.ok(validateRewards('PRESALE', [{ ...rewards[0]!, quantityTotal: -1 }])['rewards.0.quantityTotal'])
  assert.ok(validateRewards('PRESALE', [{ ...rewards[0]!, estimatedDeliveryOn: null }])['rewards.0.estimatedDeliveryOn'])
  assert.ok(validateRewards('DONATION', rewards).rewards)
  assert.deepEqual(validateRewards('REWARD', []), {}, 'Se puede vaciar la sección mientras se edita; el envío exige recompensas.')
})

test('las secciones se guardan solo para el creador y en estado editable', async () => {
  const plan: PlanInput = { activities: [{ name: 'Obra', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-02' }], milestones: [] }
  const writes: PlanInput[] = []
  let status = 'DRAFT'
  const drafts = { findOwn: async (user: string) => user === 'creador' ? { id: 'camp', status, campaignType: 'DONATION' } : null } as unknown as DraftRepository
  const repository = {
    readPlan: async () => plan, savePlan: async (_u: string, _id: string, value: PlanInput) => { writes.push(value) },
    readBudget: async () => ({ items: [], risks: [] }), saveBudget: async () => {},
    readFunding: async () => ({ goalAmount: null, currencyCode: '', durationDays: null, fundingModel: '', startsAt: null, endsAt: null }), saveFunding: async () => {},
    readRewards: async () => [], saveRewards: async () => {}, currencyActive: async () => true,
    expenseCategories: async () => [], currencies: async () => [], expenseCategoryActive: async () => true
  } as SectionsRepository
  const sections = new CampaignSections(drafts, repository)
  await assert.rejects(() => sections.savePlan('otro', 'camp', plan), DraftNotFound)
  await assert.rejects(() => sections.savePlan('creador', 'camp', { ...plan, activities: [] }), SectionInvalid)
  assert.equal(writes.length, 0)
  await sections.savePlan('creador', 'camp', plan)
  assert.equal(writes.length, 1)
  status = 'IN_REVIEW'
  await assert.rejects(() => sections.savePlan('creador', 'camp', plan), DraftNotEditable)
  status = 'CHANGES_REQUESTED'
  await sections.savePlan('creador', 'camp', plan)
  assert.equal(writes.length, 2)
})

test('la moneda no cambia mientras hay recompensas guardadas', async () => {
  const drafts = { findOwn: async () => ({ id: 'camp', status: 'DRAFT', campaignType: 'REWARD' }) } as unknown as DraftRepository
  let wrote = false
  const repository = {
    readFunding: async () => ({ goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: null, endsAt: null }),
    readRewards: async () => [{ title: 'Producto' }], currencyActive: async () => true,
    saveFunding: async () => { wrote = true }
  } as unknown as SectionsRepository
  const sections = new CampaignSections(drafts, repository)
  await assert.rejects(() => sections.saveFunding('creador', 'camp', {
    goalAmount: 100, currencyCode: 'USD', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: null, endsAt: null
  }), (error: unknown) => error instanceof SectionInvalid && Boolean(error.fields.currencyCode))
  assert.equal(wrote, false)
})

test('la API valida objetos anidados y fechas antes de guardar', async () => {
  const valid = plainToInstance(PlanDto, { activities: [{ name: 'Obra', responsibleName: 'Ana', plannedStartOn: '2026-11-01', plannedEndOn: '2026-11-02' }], milestones: [] })
  assert.equal((await validate(valid)).length, 0)
  const invalid = plainToInstance(PlanDto, { activities: [{ name: 4, responsibleName: 'Ana', plannedStartOn: 'no', plannedEndOn: '2026-11-02' }], milestones: [] })
  assert.ok((await validate(invalid)).some(error => error.property === 'activities'))
  assert.ok((await validate(plainToInstance(FundingDto, { goalAmount: '100', currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE' }))).some(error => error.property === 'goalAmount'))
})
