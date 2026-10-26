import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { normalizeSupportInput, supportPage, SupportInvalid, supportFingerprint } from '../src/support-cases/domain/support-case'
import { SupportCases, SupportMissing, type SupportRepository } from '../src/support-cases/application/support-cases'
const campaignId = '1e36e42f-f958-4978-bd28-58dab81b6160'
const requestId = '9743cad9-e8e8-4c28-a6ed-8e421548d759'
const input = { requestId, campaignId, contributionId: null, category: 'INCORRECT_INFORMATION', subject: ' Datos incorrectos ', description: ' Detalles de la incidencia ', evidenceFileIds: [], confirmed: true }
test('incidencias: valida contexto, categoría, confirmación y evidencia sin aceptar estados o prioridades del cliente', () => {
  assert.equal(normalizeSupportInput(input).subject, 'Datos incorrectos')
  for (const patch of [{ confirmed: false }, { requestId: '' }, { campaignId: null }, { campaignId: 'ajena' }, { category: 'ADMIN_RESOLVED' }, { subject: 'abc' }, { description: 'corto' }, { description: 'Texto\0oculto' }, { description: 'x'.repeat(10001) }, { evidenceFileIds: Array(11).fill(requestId) }, { evidenceFileIds: [requestId, requestId] }]) {
    assert.throws(() => normalizeSupportInput({ ...input, ...patch }), SupportInvalid)
  }
  assert.equal(supportPage(undefined), 1); assert.equal(supportPage('3'), 3)
  for (const page of ['0', '-1', '1.5', '10001', 'x']) assert.throws(() => supportPage(page), SupportInvalid)
})
test('incidencias: la huella de idempotencia cambia con contexto o contenido', () => {
  const normalized = normalizeSupportInput(input)
  assert.equal(supportFingerprint(normalized), supportFingerprint(normalizeSupportInput({ ...input, subject: 'Datos incorrectos' })))
  assert.notEqual(supportFingerprint(normalized), supportFingerprint({ ...normalized, description: 'Otra incidencia' }))
  assert.notEqual(supportFingerprint(normalized), supportFingerprint({ ...normalized, contributionId: requestId }))
})
test('incidencias: detalle ajeno y contexto no autorizado son indisponibles', async () => {
  const calls: string[] = []
  const transitionReasons: string[] = []
  const repository: SupportRepository = {
    list: async (user, page) => { calls.push(`${user}:${page}`); return { items: [], page, pageSize: 20, total: 0 } },
    detail: async () => null, context: async () => null, create: async () => { throw new Error('No debería escribir datos inválidos') },
    adminList: async page => ({ items: [], assignees: [], page, pageSize: 20, total: 0 }), adminDetail: async () => null,
    adminMessage: async () => {}, adminTransition: async (_actor, _id, _status, reason) => { transitionReasons.push(reason) }, adminAssign: async () => {}, adminEvidenceOwner: async () => 'owner'
  }
  const cases = new SupportCases(repository)
  assert.deepEqual(await cases.list('actor', '2'), { items: [], page: 2, pageSize: 20, total: 0 })
  assert.deepEqual(calls, ['actor:2'])
  await assert.rejects(() => cases.detail('actor', campaignId), SupportMissing)
  await assert.rejects(() => cases.context('actor', campaignId, undefined), SupportMissing)
  await assert.rejects(() => cases.create('actor', { ...input, confirmed: false }), SupportInvalid)
  await cases.adminTransition('staff', campaignId, 'IN_PROGRESS', '  Se revisó la información pública.  ')
  assert.deepEqual(transitionReasons, ['Se revisó la información pública.'])
  assert.throws(() => cases.adminTransition('staff', campaignId, 'INVALID', 'Este motivo sería suficientemente extenso'), SupportInvalid)
  assert.throws(() => cases.adminTransition('staff', campaignId, 'RESOLVED', 'breve'), SupportInvalid)
})
