import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { bookmarkStateFrom, bookmarkPageFrom, setBookmark } from '../src/features/bookmarks/bookmarksClient'
test('cliente distingue guardar/seguir y rechaza formas ambiguas', async () => {
  assert.deepEqual(bookmarkStateFrom({ favorite: true, following: false }), { favorite: true, following: false })
  assert.throws(() => bookmarkStateFrom({ favorite: true }))
  assert.throws(() => bookmarkPageFrom({ items: [], page: 1, pageSize: 20, total: '0' }))
  const result = await setBookmark('campaign', 'FOLLOW', true, undefined, (async (url, init) => {
    assert.equal(url, '/api/me/bookmarks/campaign/FOLLOW')
    assert.equal(init?.method, 'PUT')
    assert.deepEqual(JSON.parse(String(init?.body)), { active: true })
    return Response.json({ favorite: false, following: true })
  }) as typeof fetch)
  assert.deepEqual(result, { favorite: false, following: true })
})
