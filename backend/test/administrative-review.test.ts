import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AdministrativeReview, type AdministrativeRepository } from '../src/campaigns/application/administrative-review'
import { PublicationDisabled, ReviewInvalid, ReviewMissing, publicationEnabled, validateDecision, type DecisionInput } from '../src/campaigns/domain/administrative-review'
import { CampaignRejected1791244800000 } from '../src/shared/infrastructure/database/migrations/1791244800000-CampaignRejected'
import type { QueryRunner } from 'typeorm'

const input: DecisionInput = { decision: 'APPROVED', comment: '', expectedRound: 1, observations: [] }
test('decisiones: motivos obligatorios y normalizados; aprobación sigue siendo privada', () => {
  assert.equal(validateDecision(input).decision, 'APPROVED')
  for (const decision of ['REJECTED', 'CHANGES_REQUESTED'] as const) {
    assert.throws(() => validateDecision({ ...input, decision, comment: '  ' }), ReviewInvalid)
    assert.equal(validateDecision({ ...input, decision, comment: ' Motivo claro ' }).comment, 'Motivo claro')
  }
  assert.deepEqual(validateDecision({ ...input, decision: 'CHANGES_REQUESTED', comment: ' Ajustar ' }).observations,
    [{ section: 'general', fieldPath: null, message: 'Ajustar' }])
})
test('decisiones: límites, ronda y secciones/observaciones inválidas no llegan al repositorio', () => {
  for (const patch of [{ expectedRound: 0 }, { expectedRound: 32768 }, { expectedRound: 1.5 }, { comment: 'a'.repeat(5001) }, { decision: 'PUBLISHED' }]) {
    assert.throws(() => validateDecision({ ...input, ...patch } as DecisionInput), ReviewInvalid)
  }
  for (const item of [{ section: 'inventada', fieldPath: null, message: 'Ajuste' }, { section: 'story', fieldPath: null, message: ' ' }, { section: 'story', fieldPath: '../privado', message: 'Ajuste' }]) {
    assert.throws(() => validateDecision({ ...input, decision: 'CHANGES_REQUESTED', comment: 'Ajustar', observations: [item] }), ReviewInvalid)
  }
  assert.throws(() => validateDecision({ ...input, observations: [{ section: 'story', fieldPath: null, message: 'Ajustar' }] }), ReviewInvalid)
  assert.throws(() => validateDecision({ ...input, decision: 'CHANGES_REQUESTED', comment: 'Ajustar', observations: Array.from({ length: 51 }, () => ({ section: 'story', fieldPath: null, message: 'Ajustar' })) }), ReviewInvalid)
})
test('aplicación: publica solo con activación explícita; no usa una decisión para publicar', async () => {
  let writes = 0
  const repository: AdministrativeRepository = { detail: async () => null, decide: async () => { writes++; return { id: 'id', status: 'APPROVED', round: 1 } }, publish: async () => { writes++; return { id: 'id', status: 'PUBLISHED', round: 1 } } }
  const blocked = new AdministrativeReview(repository, false)
  assert.throws(() => blocked.publish('actor', 'id', 1), PublicationDisabled)
  await assert.rejects(() => blocked.detail('id'), ReviewMissing)
  assert.equal(writes, 0)
  const enabled = new AdministrativeReview(repository, true)
  for (const round of [0, -1, 1.5, 32768, NaN]) await assert.rejects(() => enabled.publish('actor', 'id', round), ReviewInvalid)
  assert.equal(writes, 0)
  assert.equal((await enabled.decide('actor', 'id', input)).status, 'APPROVED')
  assert.equal((await enabled.publish('actor', 'id', 1)).status, 'PUBLISHED')
  assert.equal(writes, 2)
})
test('D05: configuración estricta sin activación implícita ni roles nuevos', () => {
  assert.equal(publicationEnabled({}), false)
  assert.equal(publicationEnabled({ CAMPAIGN_ADMIN_PUBLICATION_ENABLED: 'false' }), false)
  assert.equal(publicationEnabled({ CAMPAIGN_ADMIN_PUBLICATION_ENABLED: 'true' }), true)
  assert.throws(() => publicationEnabled({ CAMPAIGN_ADMIN_PUBLICATION_ENABLED: 'yes' }), /true o false/)
})
test('migración REJECTED: complementa el enum sin tocar SQL oficial, datos ni tablas; no ofrece down destructivo', async () => {
  const seen: string[] = []
  const runner = { query: async (sql: string) => { seen.push(sql) } } as unknown as QueryRunner
  const migration = new CampaignRejected1791244800000()
  await migration.up(runner)
  assert.deepEqual(seen, ["ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'REJECTED'"])
  await assert.rejects(() => migration.down(), /respaldo/)
})
