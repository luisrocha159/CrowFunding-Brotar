import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { EntityManager } from 'typeorm'
import { identityForCampaign } from '../src/campaigns/infrastructure/initiative-identity'
import { compareCampaigns, type CampaignIdentity } from '../src/campaigns/domain/duplication'

test('declaración anterior: consulta parametrizada de solo lectura; una campaña sin vínculo devuelve null', async () => {
  const manager = { query: async (sql: string, values: unknown[]) => {
    assert.match(sql,/^SELECT /); assert.ok(!/INSERT|UPDATE|DELETE/.test(sql)); assert.deepEqual(values,['campaign-id']); return []
  } } as unknown as EntityManager
  assert.equal(await identityForCampaign(manager,'campaign-id'),null)
})

test('declaraciones antiguas: misma etapa aporta evidencia orientativa y no afirma bloqueo automático', () => {
  const a: CampaignIdentity = { id: 'a', title: 'Primera', summary: '', status: 'IN_REVIEW', submittedAt: null, country: 'BO', locality: 'La Paz', address: '', problem: '', solution: '', beneficiaries: '', results: '', goal: '20', currency: 'BOB', budget: [], activities: [], initiativeId: 'initiative', stageId: 'stage' }
  const report = compareCampaigns(a,{ ...a,id: 'b' })
  assert.equal(report?.kind,'COPY')
  assert.ok(report?.reasons.every(reason => !/no se admite|bloquead/i.test(reason)))
  assert.equal(compareCampaigns(a,{ ...a,id: 'c',stageId: 'later' })?.kind,'POSSIBLE')
})
