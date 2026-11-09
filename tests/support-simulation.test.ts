import assert from 'node:assert/strict'
import { test } from 'node:test'
import { simulationFrom, supportOptionsFrom, createSimulation, transitionSimulation } from '../src/features/contributions/simulationClient'
const simulation = { id: 's', reference: 'SIM-s', mode: 'SIMULATION', campaignId: 'c', campaignTitle: 'Campaña', rewardId: null, rewardTitle: null, amount: '20.00', currency: 'BOB', method: 'TEST_QR', state: 'PENDING', version: 2, attempts: 1, createdAt: '2026-10-22T12:00:00Z', updatedAt: '2026-10-22T12:01:00Z' }

test('importe y elección: recompensa opcional con mínimo de campaña, sin conceder un premio por el importe',async()=>{
 const {simulationSelectionError}=await import('../src/features/contributions/simulationClient')
 const options={campaignId:'c',title:'Campaña',campaignType:'REWARD' as const,currency:'BOB',minimum:'10.00',eligible:true,unavailableReason:null,rewards:[{id:'r',title:'Semillas',minimum:'50.00',available:2}]}
 assert.equal(simulationSelectionError(options,'10.00',null),null)
 assert.equal(simulationSelectionError(options,'60.00',null),null)
 assert.match(simulationSelectionError(options,'49.99','r')!,/50.00/)
 assert.match(simulationSelectionError(options,'9.99',null)!,/10.00/)
 assert.equal(simulationSelectionError(options,'50.00','r'),null)
})

test('tarjetas: comparación exacta de centavos, mínimos de campaña, agotados y formatos inválidos',async()=>{
 const {rewardAvailability}=await import('../src/features/contributions/simulationClient')
 const reward={id:'r',title:'Semillas',minimum:'50.00',available:2}
 const options={campaignId:'c',title:'Campaña',campaignType:'REWARD' as const,currency:'BOB',minimum:null,eligible:true,unavailableReason:null,rewards:[reward]}
 assert.deepEqual(rewardAvailability(options,'49.99',reward),{enabled:false,message:'Faltan 0.01 BOB para elegirla.'})
 assert.equal(rewardAvailability(options,'50',reward).enabled,true)
 assert.equal(rewardAvailability(options,'50.01',reward).enabled,true)
 assert.equal(rewardAvailability(options,'100',{...reward,available:0}).enabled,false)
 assert.equal(rewardAvailability({...options,minimum:'60.00'},'50.00',reward).enabled,false)
 for(const input of ['', '0','-1','1e2','50.001','NaN'])assert.equal(rewardAvailability(options,input,reward).enabled,false)
})
test('simulación rechaza datos de pago real y mantiene modo explícito en cada escritura', async () => {
  assert.equal(simulationFrom(simulation).state, 'PENDING')
  assert.throws(() => simulationFrom({ ...simulation, mode: 'LIVE' }))
  assert.throws(() => simulationFrom({ ...simulation, reference: 'BRT-C-123' }))
  assert.throws(() => simulationFrom({ ...simulation, method: 'CREDIT_CARD' }))
  const send = (async (_url: unknown, init?: RequestInit) => {
    assert.equal(JSON.parse(String(init?.body)).mode, 'SIMULATION')
    assert.equal(new Headers(init?.headers).get('X-Brotar-Request'), '1')
    return Response.json(simulation)
  }) as typeof fetch
  await createSimulation({ campaignId: 'c', rewardId: null, amount: '20.00', method: 'TEST_QR', requestId: 'key' }, undefined, send)
  await transitionSimulation('s', 'PENDING', 1, undefined, send)
})
test('opciones no inventan mínimos ni cantidades cuando PostgreSQL los deja vacíos', () => {
  const options = supportOptionsFrom({ campaignId: 'c', title: 'Campaña', campaignType: 'DONATION', currency: 'BOB', minimum: null, eligible: false, unavailableReason: 'Período no definido', rewards: [] })
  assert.equal(options.minimum, null); assert.equal(options.eligible, false)
  assert.throws(() => supportOptionsFrom({ ...options, minimum: 1 }))
})

test('validación local informa mínimos, cupo y formato antes de guardar selección', async () => {
  const { simulationSelectionError } = await import('../src/features/contributions/simulationClient')
  const options = supportOptionsFrom({ campaignId: 'c', title: 'Campaña', campaignType: 'PRESALE', currency: 'BOB', minimum: '10.00', eligible: true, unavailableReason: null, rewards: [{ id: 'r', title: 'Recompensa', minimum: '20.00', available: 1 }] })
  assert.equal(simulationSelectionError(options, '20.00', 'r'), null)
  assert.match(simulationSelectionError(options, '19.99', 'r')!, /20.00/)
  assert.match(simulationSelectionError(options, '1e3', 'r')!, /decimales/)
  assert.match(simulationSelectionError(options, '20.00', null)!, /recompensa/)
  assert.match(simulationSelectionError({ ...options, rewards: [{ ...options.rewards[0]!, available: 0 }] }, '20.00', 'r')!, /disponible/)
})
