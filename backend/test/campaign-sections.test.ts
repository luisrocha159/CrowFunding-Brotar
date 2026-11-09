import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { validatePlan, validateBudget, validateFunding, validateRewards, type PlanInput, type BudgetInput, type RewardInput } from '../src/campaigns/domain/sections'
import { CampaignSections, SectionInvalid, type SectionsRepository } from '../src/campaigns/application/sections'
import { DraftNotEditable, DraftNotFound, type DraftRepository } from '../src/campaigns/application/drafts'
import { FundingDto, PlanDto } from '../src/campaigns/infrastructure/sections.controller'

// Las fechas positivas siguen siendo futuras aunque cambie el calendario real.
const testDay = (offset: number) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

test('S2-02: actividades e hitos exigen responsables, fechas coherentes y vínculo válido', () => {
  const plan: PlanInput = {
    activities: [{ name: 'Construcción', responsibleName: 'Ana', plannedStartOn: testDay(30), plannedEndOn: testDay(39) }],
    milestones: [{ name: 'Entrega', responsibleName: 'Ana', plannedStartOn: testDay(39), plannedEndOn: testDay(39), activityIndexes: [0] }]
  }
  assert.deepEqual(validatePlan(plan), {})
  assert.ok(validatePlan({ ...plan, activities: [{ ...plan.activities[0]!, plannedEndOn: testDay(29) }] })['activities.0.plannedEndOn'])
  assert.ok(validatePlan({ ...plan, activities: [{ ...plan.activities[0]!, plannedStartOn: '2026-02-31' }] })['activities.0.plannedStartOn'])
  assert.ok(validatePlan({ ...plan, milestones: [{ ...plan.milestones[0]!, activityIndexes: [4] }] })['milestones.0.activityIndexes'])
  assert.ok(validatePlan({ ...plan, activities: [{ ...plan.activities[0]!, responsibleName: '' }] })['activities.0.responsibleName'])
})

test('S2-03: presupuesto y riesgos validan importes positivos', () => {
  const budget: BudgetInput = { items: [{ categoryId: 'cat', description: 'Material para la obra', quantity: 2, unitPrice: 5, plannedAmount: 10, notes: '' }], risks: [{ title: 'Retraso', description: 'Retraso del proveedor', likelihood: '50', impact: 'Medio', mitigation: 'Proveedor alternativo' }] }
  assert.deepEqual(validateBudget(budget), {})
  assert.ok(validateBudget({ ...budget, items: [{ ...budget.items[0]!, plannedAmount: 0 }] })['items.0.plannedAmount'])
  assert.deepEqual(validateBudget({ ...budget, items: [{ ...budget.items[0]!, quantity: 1, unitPrice: 0.29, plannedAmount: 0.29 }] }), {})
  assert.ok(validateBudget({ ...budget, risks: [{ ...budget.risks[0]!, title: '' }] })['risks.0.title'])
  assert.ok(validateBudget({ ...budget, risks: [{ ...budget.risks[0]!, impact: 'x'.repeat(41) }] })['risks.0.impact'])
})

test('un hito admite varias actividades, sin referencias repetidas, inexistentes ni cierre anticipado', async () => {
  const activities = [
    { name: 'Preparar terreno', responsibleName: 'Ana', plannedStartOn: testDay(30), plannedEndOn: testDay(34) },
    { name: 'Instalar riego', responsibleName: 'Ana', plannedStartOn: testDay(35), plannedEndOn: testDay(39) }
  ]
  const milestone = { name: 'Huerto listo', responsibleName: 'Ana', plannedStartOn: testDay(39), plannedEndOn: testDay(40), activityIndexes: [0, 1] }
  assert.deepEqual(validatePlan({ activities, milestones: [milestone] }), {})
  assert.deepEqual(validatePlan({ activities, milestones: [milestone, { ...milestone, name: 'Instalación terminada' }] }), {}, 'Una actividad puede participar en varios hitos.')
  assert.deepEqual(validatePlan({ activities, milestones: [{ ...milestone, activityIndexes: [] }] }), {}, 'El vínculo sigue siendo opcional.')
  for (const activityIndexes of [[0, 0], [-1], [2], [0.5]]) assert.ok(validatePlan({ activities, milestones: [{ ...milestone, activityIndexes }] })['milestones.0.activityIndexes'])
  assert.ok(validatePlan({ activities, milestones: [{ ...milestone, plannedEndOn: testDay(38) }] })['milestones.0.plannedEndOn'])
  assert.ok(validatePlan({ activities, milestones: [{ ...milestone, plannedStartOn: testDay(29) }] })['milestones.0.plannedStartOn'])
  for (const activityIndexes of [null, '0', [true], ['0'], [0, 0], [-1], [0.5], Array.from({ length: 51 }, () => 0)]) {
    const dto = plainToInstance(PlanDto, { activities, milestones: [{ ...milestone, activityIndexes }] })
    assert.ok((await validate(dto)).some(error => error.property === 'milestones'))
  }
})

test('S2-04: meta, moneda, modelo y duración tienen límites reales', () => {
  const funding = { goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'ALL_OR_NOTHING', startsAt: `${testDay(30)}T00:00:00.000Z`, endsAt: `${testDay(60)}T00:00:00.000Z` }
  assert.deepEqual(validateFunding(funding), {})
  assert.ok(validateFunding({ ...funding, goalAmount: 0 }).goalAmount)
  assert.ok(validateFunding({ ...funding, fundingModel: 'INVALID' }).fundingModel)
  assert.ok(validateFunding({ ...funding, endsAt: funding.startsAt }).endsAt)
  assert.ok(validateFunding({ ...funding, endsAt: `${testDay(49)}T00:00:00.000Z` }).durationDays, 'La regla del equipo exige coherencia entre duración y fechas.')
  assert.ok(validateFunding({ ...funding, endsAt: null }).endsAt)
})

test('S2-05: recompensas aplicables requieren importe, disponibilidad y fecha', () => {
  const rewards: RewardInput[] = [{ title: 'Producto', description: 'Una unidad', rewardKind: 'PRESALE', minAmount: 25, quantityTotal: 10, estimatedDeliveryOn: testDay(90) }]
  assert.deepEqual(validateRewards('PRESALE', rewards), {})
  assert.ok(validateRewards('PRESALE', [{ ...rewards[0]!, minAmount: 0 }])['rewards.0.minAmount'])
  assert.ok(validateRewards('PRESALE', [{ ...rewards[0]!, quantityTotal: -1 }])['rewards.0.quantityTotal'])
  assert.ok(validateRewards('PRESALE', [{ ...rewards[0]!, estimatedDeliveryOn: null }])['rewards.0.estimatedDeliveryOn'])
  assert.ok(validateRewards('DONATION', rewards).rewards)
  assert.deepEqual(validateRewards('REWARD', []), {}, 'Se puede vaciar la sección mientras se edita; el envío exige recompensas.')
})

test('las secciones se guardan solo para el creador y en estado editable', async () => {
  const plan: PlanInput = { activities: [{ name: 'Obra comunitaria', responsibleName: 'Ana', plannedStartOn: testDay(30), plannedEndOn: testDay(31) }], milestones: [] }
  const writes: PlanInput[] = []
  let status = 'DRAFT'
  const drafts = { findOwn: async (user: string) => user === 'creador' ? { id: 'camp', status, campaignType: 'DONATION' } : null } as unknown as DraftRepository
  const repository = {
    readPlan: async () => plan, savePlan: async (_u: string, _id: string, value: PlanInput) => { writes.push(value) },
    readBudget: async () => ({ items: [], risks: [] }), saveBudget: async () => {},
    readFunding: async () => ({ goalAmount: null, currencyCode: '', durationDays: null, fundingModel: '', startsAt: null, endsAt: null }), saveFunding: async () => {},
    readRewards: async () => [], saveRewards: async () => {}, currencyActive: async () => true,
    expenseCategories: async () => [], currencies: async () => [], countries: async () => [], expenseCategoryActive: async () => true
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
    readBudget: async () => ({ items: [], risks: [] }),
    saveFunding: async () => { wrote = true }
  } as unknown as SectionsRepository
  const sections = new CampaignSections(drafts, repository)
  await assert.rejects(() => sections.saveFunding('creador', 'camp', {
    goalAmount: 100, currencyCode: 'USD', durationDays: 30, fundingModel: 'FLEXIBLE', startsAt: null, endsAt: null
  }), (error: unknown) => error instanceof SectionInvalid && Boolean(error.fields.currencyCode))
  assert.equal(wrote, false)
})

test('la API valida objetos anidados y fechas antes de guardar', async () => {
  const valid = plainToInstance(PlanDto, { activities: [{ name: 'Obra', responsibleName: 'Ana', plannedStartOn: testDay(30), plannedEndOn: testDay(31) }], milestones: [] })
  assert.equal((await validate(valid)).length, 0)
  const invalid = plainToInstance(PlanDto, { activities: [{ name: 4, responsibleName: 'Ana', plannedStartOn: 'no', plannedEndOn: testDay(31) }], milestones: [] })
  assert.ok((await validate(invalid)).some(error => error.property === 'activities'))
  assert.ok((await validate(plainToInstance(FundingDto, { goalAmount: '100', currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE' }))).some(error => error.property === 'goalAmount'))
  const withoutDates = plainToInstance(FundingDto, { goalAmount: 100, currencyCode: 'BOB', durationDays: 30, fundingModel: 'FLEXIBLE' })
  assert.deepEqual(validateFunding(withoutDates), {}, 'Las fechas opcionales omitidas se normalizan a null, sin exigirlas ni lanzar un 500.')
})
