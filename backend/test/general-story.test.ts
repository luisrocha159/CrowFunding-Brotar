import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { LIMITS, normalizeGeneral, validateGeneral, type GeneralInput } from '../src/campaigns/domain/general'
import {
  normalizeIndicator, normalizeStory, validateIndicator, validateStory, STORY_LIMITS,
  type IndicatorInput, type StoryInput
} from '../src/campaigns/domain/story'
import { DraftNotEditable, DraftNotFound, type Draft, type DraftRepository } from '../src/campaigns/application/drafts'
import { CategoryUnavailable, CountryUnavailable, FieldErrors, GeneralInfo, TooManyIndicators } from '../src/campaigns/application/general'

const complete: GeneralInput = {
  title: 'Campaña', summary: 'Resumen corto', categoryId: 'cat-1',
  location: { countryCode: 'BO', locality: 'La Paz', addressLine: '', reference: '' }
}
const story: StoryInput = { problem: 'Problema', solution: 'Solución', beneficiaries: 'Beneficiarios', expectedResults: 'Resultados' }
const indicator: IndicatorInput = { name: 'Familias', description: '', unit: 'familias', baselineValue: 0, targetValue: 120 }

const stored: Draft = {
  id: 'draft-1', title: 'Campaña', summary: null, campaignType: 'DONATION',
  categoryId: null, organizationId: null, status: 'DRAFT', builderStep: 3, updatedAt: new Date()
}

function build(draft: Partial<Draft> = {}, options: { country?: boolean; category?: boolean } = {}) {
  const saved: { general: GeneralInput[]; stories: { story: StoryInput; indicators: IndicatorInput[] }[] } = { general: [], stories: [] }
  const drafts = {
    findOwn: async (userId: string, id: string) => userId === 'own' && id === stored.id ? { ...stored, ...draft } : null
  } as unknown as DraftRepository
  const info = new GeneralInfo(drafts, {
    readGeneral: async () => complete,
    saveGeneral: async (_u, _id, input) => { saved.general.push(input) },
    countryExists: async () => options.country !== false,
    categoryIsActive: async () => options.category !== false,
    readStory: async () => ({ story, indicators: [] }),
    saveStory: async (_u, _id, value, indicators) => { saved.stories.push({ story: value, indicators }) }
  })
  return { info, saved }
}

test('BG-16 CA 1: los límites salen del esquema oficial, no se inventan', () => {
  assert.equal(LIMITS.title, 200, 'campaign.title es varchar(200).')
  assert.equal(LIMITS.summary, 500, 'campaign.summary es varchar(500).')
  assert.equal(LIMITS.locality, 160, 'campaign_location.locality es varchar(160).')
  assert.equal(STORY_LIMITS.indicatorName, 200)
  assert.equal(STORY_LIMITS.unit, 60)
})

test('BG-16 CA 2: cada error se asocia a su campo y se devuelven todos juntos', () => {
  assert.deepEqual(validateGeneral(complete), {})
  const errors = validateGeneral({
    title: '', summary: '', categoryId: null,
    location: { countryCode: null, locality: 'x'.repeat(161), addressLine: '', reference: '' }
  })
  assert.deepEqual(Object.keys(errors).sort(), ['categoryId', 'countryCode', 'locality', 'summary', 'title'])
  assert.ok(validateGeneral({ ...complete, location: { ...complete.location, countryCode: 'bolivia' } }).countryCode)
  assert.ok(validateGeneral({ ...complete, title: 'x'.repeat(201) }).title)
})

test('la información general se normaliza antes de validarse', () => {
  const normalized = normalizeGeneral({
    title: '  Campaña  ', summary: ' Resumen ', categoryId: 'cat-1',
    location: { countryCode: ' bo ', locality: ' La Paz ', addressLine: ' Calle ', reference: ' Ref ' }
  })
  assert.equal(normalized.title, 'Campaña')
  assert.equal(normalized.location.countryCode, 'BO', 'El país se normaliza a mayúsculas.')
  assert.equal(normalized.location.locality, 'La Paz')
})

test('BG-19 CA 2: un indicador declara una meta con su unidad, nunca un resultado', () => {
  assert.deepEqual(validateIndicator(indicator), {})
  assert.ok(validateIndicator({ ...indicator, name: '' }).name)
  // Una meta sin unidad no se interpreta.
  assert.ok(validateIndicator({ ...indicator, unit: '' }).unit)
  // Sin meta, la unidad deja de ser obligatoria.
  assert.deepEqual(validateIndicator({ ...indicator, unit: '', targetValue: null }), {})
  assert.ok(validateIndicator({ ...indicator, targetValue: Number.NaN }).targetValue)

  // El tipo de entrada no admite achievedValue: no hay forma de declarar un resultado.
  assert.equal('achievedValue' in normalizeIndicator(indicator), false)
  assert.deepEqual(Object.keys(normalizeIndicator(indicator)).sort(),
    ['baselineValue', 'description', 'name', 'targetValue', 'unit'])
})

test('la historia se normaliza y respeta su límite de texto', () => {
  assert.deepEqual(normalizeStory({ ...story, problem: '  Problema  ' }).problem, 'Problema')
  assert.deepEqual(validateStory(story), {})
  assert.ok(validateStory({ ...story, solution: 'x'.repeat(STORY_LIMITS.text + 1) }).solution)
})

test('propiedad, estado y referencias se comprueban antes de escribir', async () => {
  const { info, saved } = build()
  await assert.rejects(() => info.saveGeneral('ajeno', stored.id, complete), DraftNotFound)
  await assert.rejects(() => info.readStory('ajeno', stored.id), DraftNotFound)

  const closed = build({ status: 'IN_REVIEW' })
  await assert.rejects(() => closed.info.saveGeneral('own', stored.id, complete), DraftNotEditable)
  await assert.rejects(() => closed.info.saveStory('own', stored.id, story, []), DraftNotEditable)
  assert.equal(closed.saved.general.length, 0)

  await assert.rejects(
    () => info.saveGeneral('own', stored.id, { ...complete, title: '' }),
    (error: unknown) => {
      assert.ok(error instanceof FieldErrors)
      assert.ok(error.fields.title)
      return true
    })
  assert.equal(saved.general.length, 0, 'Ningún rechazo llegó al repositorio.')

  const noCountry = build({}, { country: false })
  await assert.rejects(() => noCountry.info.saveGeneral('own', stored.id, complete), CountryUnavailable)
  const noCategory = build({}, { category: false })
  await assert.rejects(() => noCategory.info.saveGeneral('own', stored.id, complete), CategoryUnavailable)
})

test('los errores de cada indicador se identifican por su posición', async () => {
  const { info, saved } = build()
  await assert.rejects(
    () => info.saveStory('own', stored.id, story, [indicator, { ...indicator, name: '' }]),
    (error: unknown) => {
      assert.ok(error instanceof FieldErrors)
      assert.ok(error.fields['indicators.1.name'], 'El error señala el segundo indicador.')
      assert.equal(error.fields['indicators.0.name'], undefined)
      return true
    })
  assert.equal(saved.stories.length, 0)

  await assert.rejects(
    () => info.saveStory('own', stored.id, story, Array.from({ length: STORY_LIMITS.indicators + 1 }, () => indicator)),
    TooManyIndicators)
})

test('BG-16 CA 3: la revisión no inventa cifras ni verificaciones', async () => {
  const { info } = build()
  const review = await info.review('own', stored.id)
  assert.equal(review.raisedAmount, null, 'Un borrador no ha recaudado nada.')
  assert.equal(review.goalAmount, null)
  assert.equal(review.verified, false, 'No hay verificación en un borrador.')
  assert.equal(review.status, 'DRAFT')
  assert.deepEqual(review.general, complete)
  assert.deepEqual(review.story, story)
})
