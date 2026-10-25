export type BookmarkKind = 'FAVORITE' | 'FOLLOW'
export interface BookmarkState { favorite: boolean; following: boolean }
export interface BookmarkItem { campaignId: string; title: string; slug: string | null; status: string; createdAt: string }
export interface FollowedUpdate { id: string; campaignId: string; campaignTitle: string; slug: string | null; title: string; body: string; publishedAt: string }
export interface BookmarkPage<T> { items: T[]; total: number; page: number; pageSize: number }
export interface BookmarkRepository {
  state(userId: string, campaignId: string): Promise<BookmarkState>
  set(userId: string, campaignId: string, kind: BookmarkKind, active: boolean): Promise<BookmarkState>
  list(userId: string, kind: BookmarkKind, page: number): Promise<BookmarkPage<BookmarkItem>>
  updates(userId: string, page: number): Promise<BookmarkPage<FollowedUpdate>>
}
export class InvalidBookmark extends Error {}
export class BookmarkUnavailable extends Error {}
export class Bookmarks {
  constructor(private readonly repository: BookmarkRepository) {}
  state(userId: string, id: string) { return this.repository.state(userId, id) }
  async set(userId: string, id: string, kind: BookmarkKind, active: boolean) {
    if (!['FAVORITE', 'FOLLOW'].includes(kind) || typeof active !== 'boolean') throw new InvalidBookmark()
    return this.repository.set(userId, id, kind, active)
  }
  async list(userId: string, kind: BookmarkKind, page: number) {
    this.page(page)
    if (!['FAVORITE', 'FOLLOW'].includes(kind)) throw new InvalidBookmark()
    return this.repository.list(userId, kind, page)
  }
  async updates(userId: string, page: number) { this.page(page); return this.repository.updates(userId, page) }
  private page(value: number) { if (!Number.isSafeInteger(value) || value < 1 || value > 100000) throw new InvalidBookmark() }
}
