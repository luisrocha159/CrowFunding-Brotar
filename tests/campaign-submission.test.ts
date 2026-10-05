import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { observationStep, readSubmission, submitCampaign, SubmissionIncompleteError } from '../src/features/campaigns/submissionClient'
import { SessionError } from '../src/features/access/session/sessionClient'

test('revisión y envío usan el contrato de la API y su estado', async () => {
  const report = { id: 'camp', status: 'IN_REVIEW', missing: [], observations: [] }
  const calls: string[] = []
  const send = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`)
    return new Response(JSON.stringify(report), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  assert.deepEqual(await readSubmission('camp', undefined, send), report)
  assert.deepEqual(await submitCampaign('camp', undefined, send), report)
  assert.deepEqual(calls, ['GET /api/campaigns/drafts/camp/submission', 'POST /api/campaigns/drafts/camp/submission'])
})

test('el rechazo por faltantes conserva los enlaces a los pasos sin fingir envío', async () => {
  const missing = [{ field: 'budget', label: 'Presupuesto', step: 4 }]
  const send = (async () => new Response(JSON.stringify({ message: 'Incompleta', missing }), {
    status: 422, headers: { 'Content-Type': 'application/json' }
  })) as typeof fetch
  await assert.rejects(() => submitCampaign('camp', undefined, send),
    (error: unknown) => error instanceof SubmissionIncompleteError && error.missing[0]?.step === 4)
})

test('un informe malformado no genera enlaces a pasos inexistentes ni observaciones falsas', async () => {
  const send = (value: unknown) => (async () => new Response(JSON.stringify(value))) as typeof fetch
  await assert.rejects(() => readSubmission('camp', undefined, send({ id: 'camp', status: 'DRAFT', missing: [{ field: 'budget', label: 'Presupuesto', step: 99 }], observations: [] })), SessionError)
  await assert.rejects(() => readSubmission('camp', undefined, send({ id: 'camp', status: 'CHANGES_REQUESTED', missing: [], observations: [null] })), SessionError)
})

test('un 422 malformado conserva un error HTTP y no se interpreta como lista de correcciones', async () => {
  const send = (async () => new Response(JSON.stringify({ missing: [null] }), { status: 422 })) as typeof fetch
  await assert.rejects(() => submitCampaign('camp', undefined, send), (error: unknown) => error instanceof SessionError && !(error instanceof SubmissionIncompleteError) && error.status === 422)
})

test('observaciones de modalidad, actividades e hitos enlazan su paso y no información general', () => {
  assert.equal(observationStep('MODALITY'), 0)
  assert.equal(observationStep('campaign_activity'), 4)
  assert.equal(observationStep('activities'), 4)
  assert.equal(observationStep('milestone'), 4)
  assert.equal(observationStep('PRESALE'), 6)
  assert.equal(observationStep('story'), 2)
})
