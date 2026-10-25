import { describe, it as test } from 'node:test'
import assert from 'node:assert/strict'
import { creatorFrom, progressFrom, updatesFrom } from '../src/features/campaign-progress/progressClient'
describe('contratos de avances', () => {
  test('rechaza respuestas incompletas y conserva resultados ausentes', () => {
    assert.throws(() => progressFrom({ activities: [] }))
    const state = { revision: 'r1', campaign: { id: 'c1', title: 'Ensayo', status: 'PUBLISHED' }, editable: true, activities: [], milestones: [], indicators: [{ id: 'i1', name: 'Personas', unit: 'personas', targetValue: '100', achievedValue: null }] }
    assert.equal(progressFrom(state).indicators[0]?.achievedValue, null)
    assert.throws(() => progressFrom({ ...state, activities: [{ id: 'a1', progressPercent: 101 }] }))
    assert.equal(updatesFrom({ items: [{ id: 'u1', title: 'Ensayo', body: 'Contenido real', milestoneId: null, publishedAt: null, revision: 'r1', images: [], progress: null }] })[0]?.publishedAt, null)
    assert.throws(() => updatesFrom({ items: [{ id: 'u1', title: 'Ensayo', images: [{ fileId: 2 }] }] }))
    assert.deepEqual(creatorFrom({ items: [] }), [])
    assert.throws(() => creatorFrom({ items: [{ id: 'c1', amountRaised: 10 }] }))
  })
})
