import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Bookmarks, InvalidBookmark, type BookmarkRepository, type BookmarkKind } from '../src/campaigns/application/bookmarks'

test('guardar y seguir son independientes, idempotentes y exclusivos del usuario', async () => {
  const entries = new Set<string>()
  const state = async (user: string, id: string) => ({ favorite: entries.has(`${user}:${id}:FAVORITE`), following: entries.has(`${user}:${id}:FOLLOW`) })
  const repository: BookmarkRepository = {
    state,
    set: async (user, id, kind, active) => { const key = `${user}:${id}:${kind}`; if (active) entries.add(key); else entries.delete(key); return state(user, id) },
    list: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    updates: async () => ({ items: [], total: 0, page: 1, pageSize: 20 })
  }
  const bookmarks = new Bookmarks(repository)
  await bookmarks.set('one', 'campaign', 'FAVORITE', true)
  await bookmarks.set('one', 'campaign', 'FAVORITE', true)
  assert.equal(entries.size, 1)
  assert.deepEqual(await bookmarks.state('one', 'campaign'), { favorite: true, following: false })
  await bookmarks.set('one', 'campaign', 'FOLLOW', true)
  assert.deepEqual(await bookmarks.set('one', 'campaign', 'FAVORITE', false), { favorite: false, following: true })
  assert.deepEqual(await bookmarks.state('two', 'campaign'), { favorite: false, following: false })
  await assert.rejects(bookmarks.set('one', 'campaign', 'FAKE' as BookmarkKind, true), InvalidBookmark)
  await assert.rejects(bookmarks.list('one', 'FOLLOW', 0), InvalidBookmark)
  await assert.rejects(bookmarks.list('one', 'FOLLOW', 1.5), InvalidBookmark)
})
