import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readSubmission, submitCampaign, SubmissionIncompleteError } from '../src/features/campaigns/submissionClient'

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
