import assert from 'node:assert/strict'
import { test } from 'node:test'
import { InvalidSimulation, SimulationConflict, validateSimulationSelection, simulationTransition, type SupportOptions } from '../src/contributions/application/support-simulation'
const options: SupportOptions = { campaignId: 'campaign', title: 'Campaña', campaignType: 'REWARD', currency: 'BOB', minimum: '20.00', eligible: true, unavailableReason: null, rewards: [{ id: 'reward', title: 'Recompensa', minimum: '50.00', available: 1 }] }
test('selección simulada usa mínimos oficiales, moneda y disponibilidad sin reservar cupos', () => {
  assert.equal(validateSimulationSelection(options, { amount: '50', rewardId: 'reward' }).amount, '50.00')
  for (const input of [{ amount: '19.99', rewardId: null }, { amount: '49.99', rewardId: 'reward' }, { amount: '50.001', rewardId: 'reward' }, { amount: '1e3', rewardId: 'reward' }, { amount: '0', rewardId: null }, { amount: '10', rewardId: 'foreign' }]) assert.throws(() => validateSimulationSelection(options, input), InvalidSimulation)
  assert.throws(() => validateSimulationSelection({ ...options, rewards: [{ ...options.rewards[0]!, available: 0 }] }, { amount: '100', rewardId: 'reward' }), SimulationConflict)
  assert.throws(() => validateSimulationSelection({ ...options, eligible: false }, { amount: '100', rewardId: 'reward' }), SimulationConflict)
  assert.equal(validateSimulationSelection({ ...options, campaignType: 'DONATION', minimum: null, rewards: [] }, { amount: '0.01', rewardId: null }).amount, '0.01')
})
test('simulación conserva referencia al reintentar, rechaza versiones obsoletas y no cambia una confirmación', () => {
  assert.deepEqual(simulationTransition({ state: 'FAILED', version: 3, attempts: 1 }, { expectedVersion: 3, state: 'INITIATED' }), { state: 'INITIATED', version: 4, attempts: 2 })
  assert.deepEqual(simulationTransition({ state: 'INITIATED', version: 1, attempts: 1 }, { expectedVersion: 1, state: 'PENDING' }), { state: 'PENDING', version: 2, attempts: 1 })
  assert.throws(() => simulationTransition({ state: 'FAILED', version: 3, attempts: 1 }, { expectedVersion: 2, state: 'INITIATED' }), SimulationConflict)
  assert.throws(() => simulationTransition({ state: 'CONFIRMED', version: 3, attempts: 1 }, { expectedVersion: 3, state: 'INITIATED' }), SimulationConflict)
  assert.throws(() => simulationTransition({ state: 'PENDING', version: 3, attempts: 1 }, { expectedVersion: 3, state: 'REFUNDED' }), InvalidSimulation)
})
