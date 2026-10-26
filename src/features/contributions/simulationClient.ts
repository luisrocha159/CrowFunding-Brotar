import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
export interface SupportOptions {
  campaignId: string; title: string; campaignType: 'DONATION' | 'REWARD' | 'PRESALE'; currency: string; minimum: string | null
  eligible: boolean; unavailableReason: string | null; rewards: { id: string; title: string; minimum: string; available: number | null }[]
}
export type SimulationState = 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED'
export interface SupportSimulation {
  id: string; reference: string; mode: 'SIMULATION'; campaignId: string; campaignTitle: string; rewardId: string | null; rewardTitle: string | null
  amount: string; currency: string; method: 'TEST_CARD' | 'TEST_QR'; state: SimulationState; version: number; attempts: number; createdAt: string; updatedAt: string
}
export interface SimulationInput { campaignId: string; rewardId: string | null; amount: string; method: 'TEST_CARD' | 'TEST_QR'; requestId: string }
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const decimal = (v: unknown) => typeof v === 'string' && /^\d{1,12}\.\d{2}$/.test(v)
export function supportOptionsFrom(v: unknown): SupportOptions {
  if (!object(v) || !['campaignId', 'title', 'currency'].every(key => text(v[key])) || !['DONATION', 'REWARD', 'PRESALE'].includes(String(v.campaignType)) || !(v.minimum === null || decimal(v.minimum)) ||
    typeof v.eligible !== 'boolean' || !(v.unavailableReason === null || text(v.unavailableReason)) || !Array.isArray(v.rewards) || !v.rewards.every(r => object(r) && text(r.id) && text(r.title) && decimal(r.minimum) && (r.available === null || (Number.isSafeInteger(r.available) && Number(r.available) >= 0)))) throw new SessionError(0)
  return v as unknown as SupportOptions
}
export function simulationFrom(v: unknown): SupportSimulation {
  if (!object(v) || v.mode !== 'SIMULATION' || !['id', 'campaignId', 'campaignTitle', 'currency'].every(key => text(v[key])) || v.reference !== `SIM-${v.id}` || !decimal(v.amount) ||
    !['TEST_CARD', 'TEST_QR'].includes(String(v.method)) || !['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'].includes(String(v.state)) ||
    !['version', 'attempts'].every(key => Number.isSafeInteger(v[key]) && Number(v[key]) > 0) || !['createdAt', 'updatedAt'].every(key => text(v[key]) && Number.isFinite(Date.parse(String(v[key])))) ||
    !(v.rewardId === null || text(v.rewardId)) || !(v.rewardTitle === null || text(v.rewardTitle))) throw new SessionError(0)
  return v as unknown as SupportSimulation
}
export async function readSupportOptions(id: string, signal?: AbortSignal) { return supportOptionsFrom(await readJson(await requestApi(`/api/me/support-options/${encodeURIComponent(id)}`, { signal }))) }
export async function readSimulations(signal?: AbortSignal) {
  const value = await readJson(await requestApi('/api/me/simulations', { signal }))
  if (!object(value) || !Array.isArray(value.items) || value.items.length > 20) throw new SessionError(0)
  return value.items.map(simulationFrom)
}
export async function readSimulation(id: string, signal?: AbortSignal) { return simulationFrom(await readJson(await requestApi(`/api/me/simulations/${encodeURIComponent(id)}`, { signal }))) }
export async function createSimulation(input: SimulationInput, signal?: AbortSignal, send?: typeof fetch) { return simulationFrom(await readJson(await requestApi('/api/me/simulations', { method: 'POST', body: { ...input, mode: 'SIMULATION' }, signal }, send))) }
export async function transitionSimulation(id: string, state: SimulationState, expectedVersion: number, signal?: AbortSignal, send?: typeof fetch) { return simulationFrom(await readJson(await requestApi(`/api/me/simulations/${encodeURIComponent(id)}`, { method: 'PUT', body: { state, expectedVersion, mode: 'SIMULATION' }, signal }, send))) }

/** Validación de ayuda; PostgreSQL vuelve a comprobar toda selección al guardarla y confirmarla. */
export function simulationSelectionError(options: SupportOptions, value: string, rewardId: string | null): string | null {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value)) return 'Usa un importe positivo con hasta dos decimales separados por punto.'
  const cents = (amount: string) => { const [integer, fraction = ''] = amount.split('.'); return BigInt(integer!) * 100n + BigInt(fraction.padEnd(2, '0')) }
  const amount = cents(value)
  if (amount <= 0n) return 'El importe debe ser mayor que cero.'
  if (!options.eligible) return options.unavailableReason ?? 'La campaña no está disponible.'
  if (options.minimum && amount < cents(options.minimum)) return `El mínimo registrado es ${options.minimum} ${options.currency}.`
  const reward = options.rewards.find(item => item.id === rewardId)
  if ((options.campaignType !== 'DONATION' && !reward) || (rewardId && (!reward || options.campaignType === 'DONATION'))) return 'Selecciona una recompensa disponible para esta modalidad.'
  if (reward && amount < cents(reward.minimum)) return `La recompensa exige al menos ${reward.minimum} ${options.currency}.`
  if (reward?.available === 0) return 'La recompensa no tiene cupo disponible.'
  return null
}
