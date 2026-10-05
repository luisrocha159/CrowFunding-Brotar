import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { missingForSubmission, type SubmissionSnapshot } from '../src/campaigns/domain/submission'
import { CampaignSubmission, SubmissionIncomplete, type SubmissionRepository } from '../src/campaigns/application/submission'
import { DraftNotEditable, DraftNotFound, type DraftRepository } from '../src/campaigns/application/drafts'
import { SubmissionController } from '../src/campaigns/infrastructure/submission.controller'

const complete: SubmissionSnapshot = {
  campaignType: 'REWARD', title: 'Huerto', summary: 'Resumen', categoryId: 'category', coverFileId: 'file',
  countryCode: 'BO', locality: 'La Paz', problem: 'Problema', solution: 'Solución', beneficiaries: 'Familias', expectedResults: 'Cosechas',
  indicatorCount: 1, activityCount: 1, budgetCount: 1, goalAmount: 100, currencyCode: 'BOB', durationDays: 30,
  fundingModel: 'FLEXIBLE', rewardCount: 1
}

test('S2-10: la revisión señala exactamente las secciones incompletas', () => {
  assert.deepEqual(missingForSubmission(complete), [])
  assert.deepEqual(missingForSubmission({ ...complete, coverFileId: null, budgetCount: 0 }).map(item => item.step), [3, 4])
  assert.deepEqual(missingForSubmission({ ...complete, rewardCount: 0 }).map(item => item.step), [6])
  assert.deepEqual(missingForSubmission({ ...complete, campaignType: 'DONATION', rewardCount: 0 }), [])
})

test('S2-11 y S2-13: solo el propietario envía campañas completas y reenvía correcciones', async () => {
  let status = 'DRAFT'
  let snapshot = { ...complete }
  let submissions = 0
  const drafts = { findOwn: async (user: string) => user === 'creador' ? { id: 'camp', status, campaignType: 'REWARD' } : null } as unknown as DraftRepository
  const repository = {
    snapshot: async () => snapshot,
    observations: async () => [{ section: 'story', message: 'Aclara el impacto', fieldPath: 'problem' }],
    submit: async () => { submissions += 1; status = 'IN_REVIEW' }
  } as SubmissionRepository
  const service = new CampaignSubmission(drafts, repository)
  await assert.rejects(() => service.submit('ajeno', 'camp'), DraftNotFound)
  snapshot = { ...complete, budgetCount: 0 }
  await assert.rejects(() => service.submit('creador', 'camp'), SubmissionIncomplete)
  assert.equal(submissions, 0)
  snapshot = { ...complete }
  await service.submit('creador', 'camp')
  assert.equal(submissions, 1)
  await assert.rejects(() => service.submit('creador', 'camp'), DraftNotEditable)
  status = 'CHANGES_REQUESTED'
  assert.equal((await service.review('creador', 'camp')).observations[0]?.message, 'Aclara el impacto')
  await service.submit('creador', 'camp')
  assert.equal(submissions, 2)
})

test('el endpoint de envío exige los roles registrado y creador', () => {
  assert.deepEqual(Reflect.getMetadata('brotar.requiredRoles', SubmissionController.prototype.submit) as string[], ['REGISTERED_USER', 'CREATOR'])
})
