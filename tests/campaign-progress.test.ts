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

test('contratos privados rechazan versiones de novedades y recompensas malformadas', async () => {
 const client=await import('../src/features/campaign-progress/publicationClient')
 assert.throws(()=>client.publicationHistoryFrom({items:[{version:0}],total:1,page:1,pageSize:20}))
 assert.throws(()=>client.rewardTrackingFrom({items:[],total:0}))
 const payload={mode:'DEMO',campaign:{id:'campaign',title:'Campaña',status:'IN_EXECUTION'},editable:true,items:[{id:'contribution',reference:'R1',title:'Reconocimiento',promise:'Reconocimiento público',promisedOn:null,status:'PENDING',fulfilledOn:null,fileId:null,notes:null,revision:'r1'}],total:1,fulfilled:0,page:1,pageSize:20}
 assert.equal(client.rewardTrackingFrom(payload).items[0]?.status,'PENDING')
 assert.throws(()=>client.rewardTrackingFrom({...payload,items:[{...payload.items[0],status:'SHIPPED'}]}))
})
