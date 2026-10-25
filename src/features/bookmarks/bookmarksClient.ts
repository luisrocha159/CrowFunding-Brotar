import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
export type BookmarkKind = 'FAVORITE' | 'FOLLOW'
export interface BookmarkState { favorite: boolean; following: boolean }
export interface BookmarkItem { campaignId: string; title: string; slug: string | null; status: string; createdAt: string }
export interface FollowedUpdate { id: string; campaignId: string; campaignTitle: string; slug: string | null; title: string; body: string; publishedAt: string }
export interface BookmarkPage<T> { items: T[]; total: number; page: number; pageSize: number }
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
export function bookmarkStateFrom(value: unknown): BookmarkState {
  if (!object(value) || typeof value.favorite !== 'boolean' || typeof value.following !== 'boolean') throw new SessionError(0)
  return { favorite: value.favorite, following: value.following }
}
function pageFrom<T>(value: unknown, check: (item: unknown) => boolean): BookmarkPage<T> {
  if (!object(value) || !Array.isArray(value.items) || value.items.length > 20 || !value.items.every(check) ||
    !Number.isSafeInteger(value.total) || Number(value.total) < 0 || !Number.isSafeInteger(value.page) || Number(value.page) < 1 || value.pageSize !== 20) throw new SessionError(0)
  return value as unknown as BookmarkPage<T>
}
const nullableSlug = (value: unknown) => value === null || (typeof value === 'string' && value.length > 0)
export function bookmarkPageFrom(value: unknown): BookmarkPage<BookmarkItem> {
  return pageFrom(value, item => object(item) && ['campaignId', 'title', 'status', 'createdAt'].every(key => typeof item[key] === 'string') && nullableSlug(item.slug))
}
export function updatePageFrom(value: unknown): BookmarkPage<FollowedUpdate> {
  return pageFrom(value, item => object(item) && ['id', 'campaignId', 'campaignTitle', 'title', 'body', 'publishedAt'].every(key => typeof item[key] === 'string') && nullableSlug(item.slug))
}
export async function readBookmarkState(id: string, signal?: AbortSignal) {
  return bookmarkStateFrom(await readJson(await requestApi(`/api/me/bookmarks/${encodeURIComponent(id)}`, { signal })))
}
export async function setBookmark(id: string, kind: BookmarkKind, active: boolean, signal?: AbortSignal, send?: typeof fetch) {
  return bookmarkStateFrom(await readJson(await requestApi(`/api/me/bookmarks/${encodeURIComponent(id)}/${kind}`, { method: 'PUT', body: { active }, signal }, send)))
}
export async function readBookmarks(kind: BookmarkKind, page: number, signal?: AbortSignal) {
  return bookmarkPageFrom(await readJson(await requestApi(`/api/me/bookmarks?kind=${kind}&page=${page}`, { signal })))
}
export async function readFollowedUpdates(page: number, signal?: AbortSignal) {
  return updatePageFrom(await readJson(await requestApi(`/api/me/bookmarks/updates?page=${page}`, { signal })))
}
