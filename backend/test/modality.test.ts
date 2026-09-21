import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  FUNDING_MODELS, isFundingModel, needsRewardAcknowledgement, requiresRewards
} from '../src/campaigns/domain/modality'
import { DraftNotEditable, DraftNotFound, type Draft, type DraftRepository } from '../src/campaigns/application/drafts'
import { Modalities, ModalityDiscardsRewards, ModalityInvalid } from '../src/campaigns/application/modality'

const stored: Draft = {
  id: 'draft-1', title: 'Campaña', summary: null, campaignType: 'REWARD',
  categoryId: null, organizationId: null, status: 'DRAFT', builderStep: 1, updatedAt: new Date()
}

function build(draft: Partial<Draft> = {}, rewardCount = 0) {
  const applied: { type: string; model: string | null }[] = []
  const drafts = {
    findOwn: async (userId: string, id: string) =>
      userId === 'own' && id === stored.id ? { ...stored, ...draft } : null
  } as unknown as DraftRepository
  const modalities = new Modalities(drafts, {
    rewardCount: async () => rewardCount,
    setModality: async (_userId, _id, type, model) => { applied.push({ type, model }) }
  })
  return { modalities, applied }
}

test('BG-15 CA 2: la donación omite los requisitos de recompensas', () => {
  assert.equal(requiresRewards('DONATION'), false)
  assert.equal(requiresRewards('REWARD'), true)
  assert.equal(requiresRewards('PRESALE'), true)
})

test('el modelo de financiación solo admite los valores del esquema oficial', () => {
  assert.deepEqual([...FUNDING_MODELS], ['ALL_OR_NOTHING', 'FLEXIBLE'])
  assert.equal(isFundingModel('FLEXIBLE'), true)
  assert.equal(isFundingModel('INVENTADO'), false)
})

test('BG-15 CA 3: pasar a donación con recompensas cargadas exige reconocerlo', () => {
  assert.equal(needsRewardAcknowledgement('REWARD', 'DONATION', 2), true)
  assert.equal(needsRewardAcknowledgement('PRESALE', 'DONATION', 1), true)
  // Sin recompensas cargadas no hay nada que advertir.
  assert.equal(needsRewardAcknowledgement('REWARD', 'DONATION', 0), false)
  // Entre modalidades que sí usan recompensas no se pierde nada.
  assert.equal(needsRewardAcknowledgement('REWARD', 'PRESALE', 3), false)
  // Ir hacia una modalidad con recompensas nunca descarta.
  assert.equal(needsRewardAcknowledgement('DONATION', 'REWARD', 0), false)
})

test('el cambio se rechaza hasta reconocerlo y nunca toca las recompensas', async () => {
  const { modalities, applied } = build({}, 2)
  await assert.rejects(
    () => modalities.change('own', stored.id, 'DONATION', null, false),
    (error: unknown) => {
      assert.ok(error instanceof ModalityDiscardsRewards)
      assert.equal(error.rewardCount, 2)
      return true
    })
  assert.equal(applied.length, 0, 'Nada se aplicó sin reconocimiento.')

  const confirmed = await modalities.change('own', stored.id, 'DONATION', 'FLEXIBLE', true)
  assert.equal(confirmed.campaignType, 'DONATION')
  assert.equal(confirmed.rewardsApply, false)
  assert.equal(confirmed.rewardCount, 2, 'Las recompensas siguen ahí: no se descartan.')
  assert.deepEqual(applied, [{ type: 'DONATION', model: 'FLEXIBLE' }])
})

test('propiedad, estado y valores inválidos se comprueban antes de aplicar', async () => {
  const { modalities, applied } = build()
  await assert.rejects(() => modalities.change('ajeno', stored.id, 'DONATION', null, false), DraftNotFound)
  await assert.rejects(() => modalities.change('own', stored.id, 'INVENTADA', null, false), ModalityInvalid)
  await assert.rejects(() => modalities.change('own', stored.id, 'DONATION', 'INVENTADO', false), ModalityInvalid)
  assert.equal(applied.length, 0)

  const closed = build({ status: 'IN_REVIEW' })
  await assert.rejects(() => closed.modalities.change('own', stored.id, 'DONATION', null, false), DraftNotEditable)
  assert.equal(closed.applied.length, 0)
})

test('la lectura informa si la etapa de recompensas aplica', async () => {
  const rewards = await build({ campaignType: 'REWARD' }, 3).modalities.read('own', stored.id)
  assert.equal(rewards.rewardsApply, true)
  assert.equal(rewards.rewardCount, 3)

  const donation = await build({ campaignType: 'DONATION' }).modalities.read('own', stored.id)
  assert.equal(donation.rewardsApply, false)
})
