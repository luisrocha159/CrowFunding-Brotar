import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  allowsBuilderEditing, allowsStepMove, isValidBuilderStep, isValidSummary, isValidTitle,
  normalizeDraft, LAST_BUILDER_STEP, TOTAL_BUILDER_STEPS
} from '../src/campaigns/domain/draft'
import {
  Drafts, DraftCategoryUnavailable, DraftInvalid, DraftNotEditable, DraftNotFound,
  DraftOrganizationForbidden, DraftStepUnreachable, type Draft, type DraftInput, type DraftRepository
} from '../src/campaigns/application/drafts'

const stored: Draft = {
  id: 'draft-1', title: 'Campaña', summary: null, campaignType: 'DONATION',
  categoryId: null, organizationId: null, status: 'DRAFT', builderStep: 2, updatedAt: new Date()
}
const input: DraftInput = { title: ' Campaña ', summary: ' Resumen ', campaignType: 'DONATION', categoryId: null, organizationId: null }

function build(overrides: Partial<DraftRepository> = {}, manages = true) {
  const saved: { input: DraftInput; step: number }[] = []
  const repository: DraftRepository = {
    listOwn: async () => [stored],
    findOwn: async (userId, id) => userId === 'own' && id === stored.id ? stored : null,
    create: async (_userId, value) => ({ ...stored, ...value, summary: value.summary || null }),
    save: async (_userId, id, value, step) => {
      saved.push({ input: value, step })
      return { ...stored, ...value, id, summary: value.summary || null, builderStep: step }
    },
    categoryIsActive: async (categoryId) => categoryId === 'activa',
    ...overrides
  }
  return { drafts: new Drafts(repository, { manages: async () => manages }), saved }
}

test('el asistente tiene ocho etapas y solo acepta posiciones válidas', () => {
  assert.equal(TOTAL_BUILDER_STEPS, 8)
  assert.equal(LAST_BUILDER_STEP, 7)
  for (const step of [0, 3, 7]) assert.equal(isValidBuilderStep(step), true)
  for (const step of [-1, 8, 1.5, Number.NaN]) assert.equal(isValidBuilderStep(step), false)
})

test('BG-18 CA 3: se avanza de uno en uno y se retrocede libremente', () => {
  assert.equal(allowsStepMove(2, 3), true, 'Siguiente.')
  assert.equal(allowsStepMove(2, 2), true, 'Guardar sin moverse.')
  assert.equal(allowsStepMove(2, 0), true, 'Anterior, hasta el principio.')
  assert.equal(allowsStepMove(2, 4), false, 'No se salta una etapa sin pasar por ella.')
  assert.equal(allowsStepMove(7, 8), false, 'No se pasa del último.')
})

test('solo el borrador admite edición por el asistente', () => {
  assert.equal(allowsBuilderEditing('DRAFT'), true)
  for (const status of ['IN_REVIEW', 'APPROVED', 'PUBLISHED', 'CLOSED', 'CANCELLED']) {
    assert.equal(allowsBuilderEditing(status), false, status)
  }
})

test('normaliza y valida los datos del borrador', () => {
  assert.deepEqual(normalizeDraft(input), { title: 'Campaña', summary: 'Resumen', campaignType: 'DONATION', categoryId: null, organizationId: null })
  assert.equal(isValidTitle('x'), true)
  assert.equal(isValidTitle('   '.trim()), false)
  assert.equal(isValidTitle('x'.repeat(201)), false)
  assert.equal(isValidSummary(''), true)
  assert.equal(isValidSummary('x'.repeat(301)), false)
})

test('la propiedad y la posición se comprueban antes de guardar', async () => {
  const { drafts, saved } = build()
  await assert.rejects(() => drafts.findOwn('ajeno', stored.id), DraftNotFound, 'Un borrador ajeno no se lee.')
  await assert.rejects(() => drafts.save('ajeno', stored.id, input, 3), DraftNotFound)
  await assert.rejects(() => drafts.save('own', stored.id, input, 5), DraftStepUnreachable)
  await assert.rejects(() => drafts.save('own', stored.id, input, 9), DraftInvalid)
  assert.equal(saved.length, 0, 'Ningún rechazo llegó al repositorio.')

  // Guardado válido: datos normalizados y posición en la misma operación.
  const result = await drafts.save('own', stored.id, input, 3)
  assert.equal(result.builderStep, 3)
  assert.equal(result.title, 'Campaña')
  assert.deepEqual(saved, [{ input: { ...input, title: 'Campaña', summary: 'Resumen' }, step: 3 }])
})

test('no se adopta una organización ajena ni una categoría retirada', async () => {
  const foreign = build({}, false)
  await assert.rejects(
    () => foreign.drafts.create('own', { ...input, organizationId: 'ajena' }),
    DraftOrganizationForbidden)
  assert.equal(foreign.saved.length, 0)

  const { drafts } = build()
  await assert.rejects(() => drafts.create('own', { ...input, categoryId: 'retirada' }), DraftCategoryUnavailable)
  assert.equal((await drafts.create('own', { ...input, categoryId: 'activa' })).categoryId, 'activa')
})

test('una campaña que dejó de ser borrador no se edita por el asistente', async () => {
  const { drafts, saved } = build({ findOwn: async () => ({ ...stored, status: 'IN_REVIEW' }) })
  await assert.rejects(() => drafts.save('own', stored.id, input, 3), DraftNotEditable)
  assert.equal(saved.length, 0)
})
