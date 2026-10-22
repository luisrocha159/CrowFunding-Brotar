export interface SupportOptions {
  campaignId: string; title: string; campaignType: 'DONATION' | 'REWARD' | 'PRESALE'; currency: string; minimum: string | null
  eligible: boolean; unavailableReason: string | null; rewards: { id: string; title: string; minimum: string; available: number | null }[]
}
export const simulationStates = ['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'] as const
export type SimulationState = typeof simulationStates[number]
export interface SupportSimulation {
  id: string; reference: string; mode: 'SIMULATION'; campaignId: string; campaignTitle: string; rewardId: string | null; rewardTitle: string | null
  amount: string; currency: string; method: 'TEST_CARD' | 'TEST_QR'; state: SimulationState; version: number; attempts: number; createdAt: string; updatedAt: string
}
export interface SimulationInput { campaignId: string; rewardId: string | null; amount: string; method: 'TEST_CARD' | 'TEST_QR'; requestId: string }
export class InvalidSimulation extends Error {}
export class SimulationConflict extends Error {}
export class SimulationUnavailable extends Error {}
function cents(value: string): bigint {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value)) throw new InvalidSimulation()
  const [integer, fraction = ''] = value.split('.')
  return BigInt(integer!) * 100n + BigInt(fraction.padEnd(2, '0'))
}
export function normalizeSimulationAmount(value: string): string {
  const amount = cents(value)
  if (amount <= 0n) throw new InvalidSimulation()
  return `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`
}
export function validateSimulationSelection(options: SupportOptions, input: { amount: string; rewardId: string | null }) {
  const amount = cents(input.amount)
  if (!options.eligible) throw new SimulationConflict()
  if (amount <= 0n || (options.minimum !== null && amount < cents(options.minimum))) throw new InvalidSimulation()
  const reward = input.rewardId === null ? null : options.rewards.find(item => item.id === input.rewardId)
  if (input.rewardId !== null && (!reward || options.campaignType === 'DONATION')) throw new InvalidSimulation()
  if (options.campaignType === 'PRESALE' && !reward) throw new InvalidSimulation()
  if (reward && amount < cents(reward.minimum)) throw new InvalidSimulation()
  if (reward?.available === 0) throw new SimulationConflict()
  return { amount: `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`, reward: reward ?? null }
}
export function simulationTransition(current: { state: SimulationState; version: number; attempts: number }, input: { expectedVersion: number; state: string }) {
  if (!simulationStates.includes(input.state as SimulationState) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new InvalidSimulation()
  if (current.version !== input.expectedVersion) throw new SimulationConflict()
  const next = input.state as SimulationState
  const allowed = current.state === 'INITIATED' ? ['PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'] : current.state === 'PENDING' ? ['CONFIRMED', 'FAILED', 'EXPIRED'] : current.state === 'FAILED' || current.state === 'EXPIRED' ? ['INITIATED'] : []
  if (!allowed.includes(next)) throw new SimulationConflict()
  return { state: next, version: current.version + 1, attempts: current.attempts + (next === 'INITIATED' ? 1 : 0) }
}
