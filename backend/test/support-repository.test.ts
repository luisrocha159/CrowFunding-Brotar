import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { SupportCaseRepository } from '../src/support-cases/infrastructure/support-case.repository'
import { SupportForbidden } from '../src/support-cases/application/support-cases'
import { normalizeSupportInput, supportFingerprint } from '../src/support-cases/domain/support-case'
import type { DatabaseService } from '../src/shared/infrastructure/database/database.service'
const input = normalizeSupportInput({ requestId: '9743cad9-e8e8-4c28-a6ed-8e421548d759', campaignId: '1e36e42f-f958-4978-bd28-58dab81b6160', contributionId: null, category: 'OTHER', subject: 'Test', description: 'Test', evidenceFileIds: [], confirmed: true })
test('soporte: revalida rol tras esperar por idempotencia incluso al recuperar una solicitud previa', async () => {
  const manager = { query: async (sql: string) => {
    if (sql.includes('public.app_user')) return [{ code: 'REGISTERED_USER' }, { code: 'AUDITOR' }]
    if (sql.includes('support_case_context')) return [{ id: input.campaignId, reference: 'BRT-S-1', status: 'OPEN', createdAt: new Date(), requestHash: supportFingerprint(input) }]
    return []
  } }
  const database = { connection: () => ({ transaction: async (operation: (transaction: typeof manager) => Promise<unknown>) => operation(manager) }) } as unknown as DatabaseService
  await assert.rejects(() => new SupportCaseRepository(database).create('actor', input), SupportForbidden)
})
