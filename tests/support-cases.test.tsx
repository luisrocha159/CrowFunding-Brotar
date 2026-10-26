import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { supportInput, supportError, supportDetailFrom, readSupportCases, createSupportCase, supportContext, uploadSupportEvidence, replySupportCase, supportReplyError } from '../src/features/support-cases/supportClient'
import {SupportReplyForm} from '../src/features/support-cases/SupportReplyForm'
import { SupportCaseForm } from '../src/features/support-cases/SupportCaseForm'
import { SessionError } from '../src/shared/api/sessionError'
const id = '9743cad9-e8e8-4c28-a6ed-8e421548d759'
const context = { campaignId: id, campaignTitle: 'Proyecto', contributionId: null, contributionReference: null, publicReport: false }
const publicContext = { ...context, publicReport: true }
const draft = { category: 'INCORRECT_INFORMATION', subject: ' Datos incorrectos ', description: ' Detalle suficientemente descriptivo ', confirmed: true }
const row = { id, reference: 'BRT-S-0000001', category: 'INCORRECT_INFORMATION', subject: 'Datos', status: 'OPEN', createdAt: '2026-10-22T10:00:00.000Z', updatedAt: '2026-10-22T10:00:00.000Z', campaignId: id, contributionId: null }
test('soporte: no envía actor, prioridad o resolución; normaliza y requiere confirmación', () => {
  assert.deepEqual(supportInput(draft, context, id, []).input, { ...draft, requestId: id, subject: 'Datos incorrectos', description: 'Detalle suficientemente descriptivo', campaignId: id, contributionId: null, evidenceFileIds: [] })
  for (const patch of [{ category: '' }, { subject: ' ' }, { description: 'x\0y' }, { confirmed: false }]) assert.ok(Object.keys(supportInput({ ...draft, ...patch }, context, id, []).errors).length)
})
test('soporte: lista solo interpreta una respuesta válida y codifica el contexto', async () => {
  assert.deepEqual(await readSupportCases(2, undefined, (async (url, init) => { assert.equal(url, '/api/me/support-cases?page=2'); assert.equal(init?.credentials, 'same-origin'); return Response.json({ items: [row], total: 21, page: 2, pageSize: 20 }) }) as typeof fetch), { items: [row], total: 21, page: 2, pageSize: 20 })
  assert.deepEqual(await supportContext(id, null, undefined, (async url => { assert.equal(url, `/api/me/support-cases/context?campaignId=${id}`); return Response.json(context) }) as typeof fetch), context)
  await assert.rejects(() => readSupportCases(1, undefined, (async () => Response.json([])) as typeof fetch), SessionError)
})
test('soporte: contrato de detalle privado rechaza fechas, estados y adjuntos malformados', () => {
  const detail = { ...row, replyAllowed:true, description: 'Reporte', evidence: [{ fileId: id, name: 'Prueba.pdf', mimeType: 'application/pdf' }], messages: [{ id, body: 'Mensaje', createdAt: row.createdAt, from: 'support' }] }
  assert.deepEqual(supportDetailFrom(detail), detail)
  for (const patch of [{ status: 'PAID' }, { createdAt: 'invalid' }, { evidence: [{ fileId: 'https://evil.invalid', name: 'Archivo', mimeType: 'application/pdf' }] }, { messages: [{ id, body: 'Privado', createdAt: row.createdAt, from: 'internal' }] }]) assert.throws(() => supportDetailFrom({ ...detail, ...patch }), SessionError)
})

test('respuesta propia: validación, referencia de reintento y confirmación real, sin actor ni estado del cliente',async()=>{
  const body='Adjunto la información solicitada del niño y la campaña.'
  assert.equal(supportReplyError(body),undefined)
  for(const invalid of ['  ','x'.repeat(19),'x'.repeat(5001),'Mensaje con un control inválido \0','<b>Mensaje con etiquetas HTML</b>'])assert.ok(supportReplyError(invalid))
  let calls=0
  const send=(async(url,init)=>{calls++;assert.equal(url,`/api/me/support-cases/${id}/messages`);assert.equal(init?.method,'POST');assert.equal((init?.headers as Record<string,string>)['X-Brotar-Request'],'1');assert.deepEqual(JSON.parse(init?.body as string),{requestId:id,body});return Response.json({ok:true})}) as typeof fetch
  await replySupportCase(id,id,` ${body} `,undefined,send);await replySupportCase(id,id,body,undefined,send);assert.equal(calls,2)
  await assert.rejects(()=>replySupportCase(id,id,' ',undefined,send),SessionError);assert.equal(calls,2)
  await assert.rejects(()=>replySupportCase(id,id,body,undefined,(async()=>Response.json({})) as typeof fetch),SessionError)
  const html=renderToStaticMarkup(<SupportReplyForm id={id} onSent={()=>{}} onUnauthorized={()=>{}}/>)
  assert.match(html,/Tu respuesta/);assert.match(html,/required/);assert.match(html,/maxLength="5000"/i);assert.match(html,/20 y 5000/)
})
test('soporte: POST conserva clave de reintento y valida confirmación de referencia real', async () => {
  const input = supportInput(draft, context, id, []).input
  assert.deepEqual(await createSupportCase(input, undefined, (async (url, init) => {
    assert.equal(url, '/api/me/support-cases'); assert.equal(init?.method, 'POST'); assert.equal((init?.headers as Record<string, string>)['X-Brotar-Request'], '1')
    assert.deepEqual(JSON.parse(init?.body as string), input)
    return Response.json({ id, reference: row.reference, status: 'OPEN', createdAt: row.createdAt })
  }) as typeof fetch), { id, reference: row.reference, status: 'OPEN', createdAt: row.createdAt })
  await assert.rejects(() => createSupportCase(input, undefined, (async () => Response.json({ id, ok: true })) as typeof fetch), SessionError)
})
test('soporte: evidencia siempre privada y de propósito soporte; errores no filtran detalles', async () => {
  const file = new File(['%PDF-test'], 'prueba.pdf', { type: 'application/pdf' })
  assert.equal((await uploadSupportEvidence(file, undefined, (async (_url, init) => {
    const body = JSON.parse(init?.body as string)
    assert.equal(body.visibility, 'PRIVATE'); assert.equal(body.purpose, 'SUPPORT_EVIDENCE')
    return Response.json({ id, ownerUserId: id, visibility: 'PRIVATE', purpose: 'SUPPORT_EVIDENCE', originalName: file.name, mimeType: file.type, sizeBytes: file.size, sha256: 'hash', createdAt: row.createdAt })
  }) as typeof fetch)).id, id)
  await assert.rejects(() => uploadSupportEvidence(new File(['x'], 'secret.txt', { type: 'text/plain' })), SessionError)
  assert.doesNotMatch(supportError(new Error('password-secret')), /password-secret/)
  assert.match(supportError(new SessionError(409)), /solicitud|incidencias/)
})
test('soporte: formulario requiere confirmación y no promete resolución o devolución', () => {
  const html = renderToStaticMarkup(<SupportCaseForm context={context} onCreated={() => {}} onUnauthorized={() => {}} />)
  assert.match(html, /type="checkbox"/); assert.match(html, /<label[^>]*for=/); assert.match(html, /PRIVATE|privad/i)
  assert.doesNotMatch(html, /48 horas|72 horas|24 horas/)
  const publicHtml = renderToStaticMarkup(<SupportCaseForm context={publicContext} onCreated={() => {}} onUnauthorized={() => {}} />)
  assert.match(publicHtml, /INCORRECT_INFORMATION/); assert.match(publicHtml, /PROJECT_NOT_EXECUTED/)
  assert.doesNotMatch(publicHtml, /UNRECOGNIZED_PAYMENT|REFUND_REQUEST|REWARD_NOT_RECEIVED|OTHER/)
})
