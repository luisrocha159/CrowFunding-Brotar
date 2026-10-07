import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'

export interface ManagedUser {
  id: string; email: string; name: string; status: string; locked: boolean; roles: string[]
  canEnableCreator: boolean; provisional: true
}
export function managedUserFrom(value: unknown): ManagedUser {
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const user = value as Record<string, unknown>
  if (!['id', 'email', 'name', 'status'].every(key => typeof user[key] === 'string')
    || typeof user.locked !== 'boolean' || typeof user.canEnableCreator !== 'boolean' || user.provisional !== true
    || !Array.isArray(user.roles) || !user.roles.every(role => typeof role === 'string')) throw new SessionError(0)
  return user as unknown as ManagedUser
}
export async function findManagedUser(email: string, signal?: AbortSignal, send?: typeof fetch) {
  return managedUserFrom(await readJson(await requestApi(`/api/admin/users?email=${encodeURIComponent(email.trim().toLowerCase())}`, { signal }, send)))
}
export async function enableCreator(id: string, reason: string, signal?: AbortSignal, send?: typeof fetch) {
  const value: unknown = await readJson(await requestApi(`/api/admin/users/${encodeURIComponent(id)}/creator`, {
    method: 'POST', body: { confirmed: true, reason: reason.trim() }, signal
  }, send))
  if (!value || typeof value !== 'object') throw new SessionError(0)
  const result = value as Record<string, unknown>
  if (result.id !== id || result.role !== 'CREATOR' || typeof result.created !== 'boolean' || result.provisional !== true) throw new SessionError(0)
  return { created: result.created }
}
