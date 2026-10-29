import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { InvalidVerification, VerificationPolicyUnavailable, assertEditableVerification, approvedPolicy, validateSubmission, type VerificationPolicy, type VerificationSubmission } from '../src/verifications/domain/verification'

const policy: VerificationPolicy = {
  version: 'test-policy-only', treatmentNotice: 'Datos sintéticos para prueba.', evidenceReference: 'test-fixture', approvedBy: 'fixture', approvedAt: '2026-10-22T00:00:00Z',
  fields: [{ key: 'name', label: 'Nombre de prueba', required: true, maxLength: 120 }], documents: [{ documentTypeId: '9b7c8ea5-126e-47c9-883c-f7ab30b459d7', label: 'Respaldo de prueba', required: true }], requiresAcceptance: true
}
test('política académica DEMO solo acepta campos sintéticos explícitos, nunca sustituye la legal',()=>{
 const demo={...policy,version:'mvp-demo-1.0-20261023'}
 const input={ legalVersion:'mvp-demo-legal-1.0-20261028',policyVersion:demo.version,fields:{name:'DEMO Persona ficticia'},documents:demo.documents.map(d=>({documentTypeId:d.documentTypeId,fileId:'06ec727d-4664-45c9-b704-01880c7a8832'})),accepted:true}
 assert.equal(validateSubmission(demo,input).fields.name,'DEMO Persona ficticia')
 assert.throws(()=>validateSubmission(demo,{...input,fields:{name:'Persona real'}}),InvalidVerification)
 assert.throws(()=>validateSubmission(demo,{...input,accepted:false}),InvalidVerification)
})
const document = { documentTypeId: policy.documents[0]!.documentTypeId, fileId: '9b7c8ea5-126e-47c9-883c-f7ab30b459d8' }
test('identidad: nunca acepta información con política ausente ni aprobación sin evidencia', () => {
  const input = { legalVersion:'mvp-demo-legal-1.0-20261028', policyVersion: policy.version, fields: { name: 'Ana' }, documents: [document], accepted: true }
  assert.throws(() => validateSubmission(null, input), VerificationPolicyUnavailable)
  assert.throws(() => validateSubmission({ ...policy, evidenceReference: '' }, input), VerificationPolicyUnavailable)
  assert.throws(() => validateSubmission(policy, { ...input, policyVersion: 'old' }), VerificationPolicyUnavailable)
})
test('identidad: valida requisitos exactos y no recoge campos arbitrarios, archivos duplicados ni aceptación ausente', () => {
  const input = { legalVersion:'mvp-demo-legal-1.0-20261028', policyVersion: policy.version, fields: { name: ' Ana ' }, documents: [document], accepted: true }
  assert.deepEqual(validateSubmission(policy, input).fields, { name: 'Ana' })
  const invalid: VerificationSubmission[] = [
    { ...input, fields: { name: '' } }, { ...input, fields: { name: 'Ana', bankAccount: 'secret' } },
    { ...input, documents: [] }, { ...input, accepted: false },
    { ...input, documents: [document, document] }, { ...input, fields: { name: 'a'.repeat(121) } }
  ]
  for (const bad of invalid) assert.throws(() => validateSubmission(policy, bad), InvalidVerification)
})
test('identidad: corrección permite únicamente casos sin enviar o con información solicitada', () => {
  for (const state of ['NOT_STARTED', 'REQUIRES_INFO']) assert.doesNotThrow(() => assertEditableVerification(state))
  for (const state of ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED']) assert.throws(() => assertEditableVerification(state), InvalidVerification)
})

test('identidad: datos con NUL se rechazan incluso al guardar borrador', () => {
  const input = { legalVersion:'mvp-demo-legal-1.0-20261028', policyVersion: policy.version, fields: { name: 'Ana\u0000X' }, documents: [document], accepted: true }
  assert.throws(() => validateSubmission(policy, input), InvalidVerification)
  assert.throws(() => validateSubmission(policy, input, false), InvalidVerification)
})
test('identidad: una política malformada se considera no disponible sin errores de tipo', () => {
  const input = { legalVersion:'mvp-demo-legal-1.0-20261028', policyVersion: policy.version, fields: { name: 'Ana' }, documents: [document], accepted: true }
  const malformed = { ...policy, treatmentNotice: 42 } as unknown as VerificationPolicy
  assert.throws(() => validateSubmission(malformed, input), VerificationPolicyUnavailable)
})


test('identidad: política se comprueba como datos desconocidos en todos sus campos', () => {
  for (const key of ['version','treatmentNotice','evidenceReference','approvedBy','approvedAt'] as const) {
    for (const value of [42, [], {}, null, undefined, 'a\u0000b']) assert.equal(approvedPolicy({ ...policy, [key]: value }), false)
  }
  for (const field of [null, 'texto', { ...policy.fields[0], label: 42 }, { ...policy.fields[0], key: [] }]) assert.equal(approvedPolicy({ ...policy, fields: [field] }), false)
  for (const doc of [null, 'texto', { ...policy.documents[0], label: 42 }, { ...policy.documents[0], documentTypeId: '-'.repeat(36) }]) assert.equal(approvedPolicy({ ...policy, documents: [doc] }), false)
  assert.equal(approvedPolicy(policy), true)
})
test('identidad: rechaza sustitutos Unicode aislados y conserva Unicode válido y texto literal', () => {
  const input = { legalVersion:'mvp-demo-legal-1.0-20261028', policyVersion: policy.version, fields: { name: 'Ana' }, documents: [document], accepted: true }
  for (const name of ['A\uD800B', 'A\uDC00B']) assert.throws(() => validateSubmission(policy, { ...input, fields: { name } }), InvalidVerification)
  for (const name of ['Ana 🌱', '<script>alert(1)</script>']) assert.equal(validateSubmission(policy, { ...input, fields: { name } }).fields.name, name)
})
