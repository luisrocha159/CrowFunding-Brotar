import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PublicCampaigns, PublicCampaignMissing, type PublicCampaign } from '../src/campaigns/application/public-campaigns'
import { TypeormPublicCampaignRepository } from '../src/campaigns/infrastructure/typeorm-public-campaign.repository'
import type { DatabaseService } from '../src/shared/infrastructure/database/database.service'

test('S2-16 caso de uso conserva vacío y rechaza detalle ausente o slug inválido', async () => {
  const service = new PublicCampaigns({ list: async () => [] })
  assert.deepEqual(await service.list(), [])
  for (const slug of ['ausente', '', '../private', 'a'.repeat(221)]) await assert.rejects(() => service.find(slug), PublicCampaignMissing)
})
test('S2-16 consulta pública exige publicación, portada pública válida y excluye descartadas', async () => {
  const seen: { sql: string; params: unknown[] }[] = []
  const repository = new TypeormPublicCampaignRepository({ connection: () => ({ query: async (sql: string, params: unknown[]) => { seen.push({ sql, params }); return [] } }) } as unknown as DatabaseService)
  await repository.list(); await repository.list("campaña' OR true --")
  assert.deepEqual(seen[0]!.params, []); assert.deepEqual(seen[1]!.params, ["campaña' OR true --"])
  assert.ok(!seen[1]!.sql.includes("campaña' OR true --"))
  assert.match(seen[0]!.sql, /c\.status = 'PUBLISHED' AND c\.deleted_at IS NULL/)
  assert.match(seen[0]!.sql, /fa\.scope = 'PUBLIC'/)
  assert.match(seen[0]!.sql, /v_campaign_funding/)
  assert.match(seen[0]!.sql, /expected_results/)
  assert.doesNotMatch(seen[0]!.sql, /password_hash|email|internal_notes|address_line|provider_payload/)
})
test('S2-16 caso de uso devuelve el detalle público del repositorio y no oculta fallos', async () => {
  const row = { id: 'ensayo' } as PublicCampaign
  assert.equal(await new PublicCampaigns({ list: async slug => { assert.equal(slug, 'publicada'); return [row] } }).find('publicada'), row)
  await assert.rejects(() => new PublicCampaigns({ list: async () => { throw new Error('DB no disponible') } }).list(), /DB no disponible/)
})
