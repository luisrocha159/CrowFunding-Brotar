import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashboardFrom, creatorActions } from '../src/features/campaign-progress/creatorDashboardClient'

test('panel valida paginación, totales monetarios exactos y datos ausentes', () => {
  const response = { items: [], total: 0, page: 1, pageSize: 20, states: [], funding: [{ currencyCode: 'BOB', amountRaised: '0.00', demoAmountRaised: '10.25' }] }
  assert.equal(dashboardFrom(response).funding[0]?.demoAmountRaised, '10.25')
  assert.throws(() => dashboardFrom({ ...response, total: -1 }))
  assert.throws(() => dashboardFrom({ ...response, funding: [{ currencyCode: 'BOB', amountRaised: 10.25, demoAmountRaised: '0.00' }] }))
  assert.throws(() => dashboardFrom({ ...response, items: [{ id: 'c', status: 'PUBLISHED' }] }))
})

test('panel dirige corrección, ejecución, rendición y cierre al UUID del proyecto', () => {
  const item = { id: 'project-id', status: 'CHANGES_REQUESTED', pendingActivities: 1, pendingRewards: 2, pendingCases: 0, reportStatus: null, verificationStatus: null, organizationId: null, legalStatus: null, representativeStatus: null }
  assert.ok(creatorActions(item).some(a => a.href === '/mis-proyectos/project-id' && a.label.includes('Corregir')))
  const active = creatorActions({ ...item, status: 'IN_EXECUTION' })
  for (const suffix of ['avances', 'rendicion', 'cierre']) assert.ok(active.some(a => a.href === `/mis-proyectos/project-id/${suffix}`))
  assert.ok(active.some(a => a.href === '/mi-verificacion'))
})
