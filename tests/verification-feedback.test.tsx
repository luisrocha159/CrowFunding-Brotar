import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { VerificationEditor } from '../src/features/verifications/VerificationEditor'
import { saveVerification, type VerificationDetail } from '../src/features/verifications/verificationsClient'
import { validateSubmission, verificationSubmissionErrors, InvalidVerification } from '../backend/src/verifications/domain/verification'
import { SessionError } from '../src/shared/api/sessionError'

const policy = {
  version: 'mvp-demo-1.1-20261109', treatmentNotice: 'Solo datos sintéticos.', evidenceReference: 'fixture', approvedBy: 'equipo', approvedAt: '2026-10-23T00:00:00Z',
  fields: [{ key: 'name', label: 'Nombre ficticio', required: true, maxLength: 150 }, { key: 'identifier', label: 'Identificador ficticio', required: true, maxLength: 150 }],
  documents: [{ documentTypeId: '9b7c8ea5-126e-47c9-883c-f7ab30b459d7', label: 'Identidad sintética', required: true }], requiresAcceptance: true
}
const input = { policyVersion: policy.version, fields: { name: 'adawdawdad', identifier: 'awawdawdwadad' }, documents: [], accepted: false }

test('verificación: borrador incompleto permitido; envío exige texto, documento y consentimiento, sin autoaprobar', () => {
  const draft = { ...input, fields: { name: '', identifier: '' } }
  assert.doesNotThrow(() => validateSubmission(policy, draft, false))
  const errors = verificationSubmissionErrors(policy, draft, true)
  for (const key of ['name', 'identifier', `document:${policy.documents[0]!.documentTypeId}`, 'accepted']) assert.ok(errors[key])
  const valid = { ...draft, fields: { name: ' DEMO Ricardo ', identifier: 'PRUEBA Identificador 001' }, accepted: true, documents: [{ documentTypeId: policy.documents[0]!.documentTypeId, fileId: '06ec727d-4664-45c9-b704-01880c7a8832' }] }
  assert.equal(validateSubmission(policy, valid).fields.name, 'DEMO Ricardo')
  assert.deepEqual(verificationSubmissionErrors(policy, valid, true), {})
  assert.doesNotThrow(() => validateSubmission({ ...policy, version: 'otra-politica' }, { ...valid, policyVersion: 'otra-politica', fields: { name: 'Texto autorizado', identifier: 'ID 001' } }))
  for (const name of ['a'.repeat(151), 'DEMO\u0000X']) assert.throws(() => validateSubmission(policy, { ...valid, fields: { ...valid.fields, name } }), InvalidVerification)
  assert.throws(() => validateSubmission(policy, { ...valid, documents: [null] } as unknown as typeof valid), InvalidVerification)
})

test('verificación: acepta campos ficticios sin prefijo y señala todos los obligatorios vacíos', () => {
  assert.doesNotThrow(() => validateSubmission(policy, input, false))
  assert.throws(() => validateSubmission(policy, {...input,fields:{name:' ',identifier:''}}, true), error => {
    assert.ok(error instanceof InvalidVerification)
    assert.ok('fields' in error)
    const fields = error.fields as Record<string, string>
    assert.match(fields.name!, /obligatorio/)
    assert.match(fields.identifier!, /obligatorio/)
    assert.ok(fields.accepted)
    return true
  })
})

test('verificación: la captura no exige prefijos, mantiene los requisitos visibles y marca documentos obligatorios', () => {
  const detail: VerificationDetail = { id: 'case', typeName: 'Identidad', typeCode: 'KYC_IDENTITY', organizationId: null, organizationName: null, status: 'NOT_STARTED', updatedAt: '', version: '1', resultNotes: null, rejectionReason: null, submittedAt: null, policy, fields: {}, documents: [], history: [], revisions: [] }
  const html = renderToStaticMarkup(<VerificationEditor detail={detail} readOnly={false} onSaved={() => {}} onReload={() => {}} />)
  assert.match(html, /Máximo 150 caracteres/)
  const consent=html.match(/<label[^>]*><input type="checkbox"[\s\S]*?<\/label>/)?.[0]
  assert.ok(consent)
  assert.match(consent,/autorizo el tratamiento de mis datos y documentos/)
  assert.doesNotMatch(consent,/mvp|pruebas|política \d|20261109/i)
  assert.match(html,/Leer condiciones de privacidad y verificación/)
  assert.match(html,/Información técnica de la política/)
  assert.match(html,/<button[^>]*type="submit"[^>]*disabled=""[^>]*>Enviar a revisión<\/button>/)
  assert.match(html, /Identidad[^<]*<span[^>]*> \*<\/span>/)
})

test('verificación: el cliente conserva errores por campo del backend y el estado de conflicto', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = (async () => Response.json({ message: ['name: Completa este campo.'] }, { status: 400 })) as typeof fetch
    await assert.rejects(saveVerification('case', '1', input, false), error => {
      assert.ok(error instanceof SessionError && error.status === 400)
      assert.ok('fields' in error)
      assert.deepEqual(error.fields, { name: 'Completa este campo.' })
      return true
    })
    globalThis.fetch = (async () => new Response(null, { status: 409 })) as typeof fetch
    await assert.rejects(saveVerification('case', '1', input, false), error => error instanceof SessionError && error.status === 409)
  } finally { globalThis.fetch = original }
})
