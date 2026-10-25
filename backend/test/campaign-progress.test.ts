import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateProgress, validateUpdate, type ProgressInput } from '../src/campaign-progress/domain/progress'
const id = '00000000-0000-4000-8000-000000000001'
const valid: ProgressInput = { revision: 'v1', activities: [{ id, responsibleName: 'Responsable de ensayo', status: 'IN_PROGRESS', progressPercent: 25, actualStartOn: '2026-01-01', actualEndOn: null }], milestones: [], indicators: [{ id, achievedValue: 20 }] }
test('avances validan fechas reales, porcentaje, ids únicos y valores alcanzados', () => {
  assert.deepEqual(validateProgress(valid), {})
  assert.ok(Object.keys(validateProgress({ ...valid, activities: [{ ...valid.activities[0]!, progressPercent: 101 }] })).length)
  assert.ok(Object.keys(validateProgress({ ...valid, activities: [{ ...valid.activities[0]!, status: 'COMPLETED' }] })).length)
  assert.ok(Object.keys(validateProgress({ ...valid, activities: [{ ...valid.activities[0]!, actualStartOn: '2026-03-31', actualEndOn: '2026-02-30' }] })).length)
  assert.ok(Object.keys(validateProgress({ ...valid, activities: [valid.activities[0]!, valid.activities[0]!] })).length)
  assert.ok(Object.keys(validateProgress({ ...valid, indicators: [{ id, achievedValue: -1 }] })).length)
})
test('novedades requieren contenido válido y evidencias no duplicadas', () => {
  const input = { title: 'Avance de prueba', body: 'Se completó la preparación de los materiales.', milestoneId: null, images: [{ fileId: id, caption: 'Materiales de ensayo' }], publish: false, revision: null }
  assert.deepEqual(validateUpdate(input), {})
  assert.ok(Object.keys(validateUpdate({ ...input, body: '<script>alert(1)</script>' })).length)
  assert.ok(Object.keys(validateUpdate({ ...input, images: [...input.images, ...input.images] })).length)
})
