import { requestApi, readJson } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'

export interface CategoryInput { slug: string; name: string; description: string; displayOrder: number; parentId: string | null }
export interface Category extends Omit<CategoryInput, 'description'> { id: string; description: string | null; isActive: boolean }
export interface AgreedSetting { key: string; value: unknown; updatedBy: string | null; updatedAt: string | null }
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
export function categoryFrom(value: unknown): Category {
  if (!object(value) || !['id', 'slug', 'name'].every(key => typeof value[key] === 'string' && value[key].length > 0)
    || !(value.description === null || typeof value.description === 'string') || !(value.parentId === null || typeof value.parentId === 'string')
    || typeof value.isActive !== 'boolean' || !Number.isInteger(value.displayOrder) || Number(value.displayOrder) < 0 || Number(value.displayOrder) > 32767) throw new SessionError(0)
  return { id: value.id as string, slug: value.slug as string, name: value.name as string, description: value.description as string | null,
    parentId: value.parentId as string | null, displayOrder: value.displayOrder as number, isActive: value.isActive }
}
export async function listCategories(signal?: AbortSignal, send: typeof fetch = fetch): Promise<Category[]> {
  const result = await readJson(await requestApi('/api/catalogs/admin/categories', { signal }, send))
  if (!Array.isArray(result)) throw new SessionError(0)
  return result.map(categoryFrom)
}
export async function listSettings(signal?: AbortSignal, send: typeof fetch = fetch): Promise<AgreedSetting[]> {
  const result = await readJson(await requestApi('/api/catalogs/admin/settings', { signal }, send))
  if (!Array.isArray(result)) throw new SessionError(0)
  return result.map((row: unknown) => {
    if (!object(row) || typeof row.key !== 'string' || !('value' in row) || !(row.updatedBy === null || typeof row.updatedBy === 'string')
      || !(row.updatedAt === null || typeof row.updatedAt === 'string')) throw new SessionError(0)
    return { key: row.key, value: row.value, updatedBy: row.updatedBy, updatedAt: row.updatedAt }
  })
}
export async function saveCategory(id: string | null, input: CategoryInput, signal?: AbortSignal, send: typeof fetch = fetch): Promise<Category> {
  const path = `/api/catalogs/admin/categories${id ? `/${encodeURIComponent(id)}` : ''}`
  return categoryFrom(await readJson(await requestApi(path, { method: id ? 'PUT' : 'POST', body: input, signal }, send)))
}
export async function setCategoryActive(id: string, isActive: boolean, signal?: AbortSignal, send: typeof fetch = fetch): Promise<Category> {
  return categoryFrom(await readJson(await requestApi(`/api/catalogs/admin/categories/${encodeURIComponent(id)}/state`, { method: 'PUT', body: { isActive }, signal }, send)))
}
