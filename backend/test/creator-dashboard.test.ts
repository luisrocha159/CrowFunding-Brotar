import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashboardQuery } from '../src/campaign-progress/infrastructure/creator-dashboard.repository'
test('panel rechaza páginas ambiguas y ámbitos no autorizados', () => {
  assert.deepEqual(dashboardQuery('2', 'institutional'), { page: 2, scope: 'institutional' })
  for (const page of ['0', '-1', '1.5', '1e2', '100001', '']) assert.throws(() => dashboardQuery(page, 'all'))
  assert.throws(() => dashboardQuery('1', 'other-user'))
})
