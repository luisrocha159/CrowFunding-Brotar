import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReconciliationItems, ReconciliationSummary, PendingResults } from '../src/features/finance/ReconciliationPage'
import { financeMoney } from '../src/features/finance/financeClient'
import { pendingFrom, periodError, reasonError, reconciliationDetailFrom, reconciliationError, reconciliationListFrom, type ReconciliationDetail } from '../src/features/finance/reconciliationClient'
import { SessionError } from '../src/shared/api/sessionError'

const id='11111111-1111-4111-8111-111111111111',itemId='22222222-2222-4222-8222-222222222222'
const demo={mode:'DEMO',label:'SIMULACIÓN · SIN DINERO REAL · NO PAGAR'}
const batch: ReconciliationDetail={id,from:'2026-10-22',to:'2026-10-22',currencyCode:'BOB',status:'OPEN',totalInternal:'0.00',totalProvider:'0.30',difference:'-0.30',
  createdBy:id,closedBy:null,closedAt:null,snapshotAt:'2026-10-22T12:00:00.000Z',items:[{id:itemId,paymentId:id,reference:`DEMO-${id}`,internalReference:'BRT-C-00000001',internalStatus:'EXPIRED',
    status:'MISSING_INTERNAL',originalStatus:'MISSING_INTERNAL',internalAmount:'0.00',providerAmount:'0.30',resolution:null,reason:null,resolvedBy:null,resolvedAt:null,compensationAmount:null}]}
test('S3-07: contrato financiero validado, sin redondeo, duplicados ni diferencias incoherentes',()=>{
  const input={...demo,...batch}
  assert.deepEqual(reconciliationDetailFrom(input),input)
  assert.equal(reconciliationListFrom({...demo,items:[batch],nextCursor:null}).items.length,1)
  for(const value of [null,{}, {...input,mode:'REAL'},{...input,totalInternal:0},{...input,difference:'0.30'},
    {...input,from:'2026-02-30'},{...input,closedAt:'no'},{...input,status:'CLOSED'},
    {...input,items:[batch.items[0],batch.items[0]]},{...input,items:[{...batch.items[0],originalStatus:'RESOLVED'}]},
    {...input,items:[{...batch.items[0],status:'RESOLVED'}]}])assert.throws(()=>reconciliationDetailFrom(value))
  assert.throws(()=>reconciliationListFrom({...demo,items:[batch],nextCursor:itemId}))
  assert.equal(financeMoney('-0.30','BOB'),'-0,30 BOB')
  assert.equal(financeMoney('-9999999999999999.99','BOB'),'-9.999.999.999.999.999,99 BOB')
  assert.equal(financeMoney('-0.00','BOB'),'0,00 BOB')
})
test('S3-07: fechas, motivos y errores orientan al usuario sin inventar éxito',()=>{
  assert.equal(periodError({from:'2026-10-01',to:'2026-10-31',currencyCode:'BOB'}),'')
  for(const filters of [{from:'2026-02-30',to:'2026-03-01',currencyCode:'BOB'},{from:'2026-10-01',to:'2026-11-01',currencyCode:'BOB'},
    {from:'2026-10-02',to:'2026-10-01',currencyCode:'BOB'},{from:'2026-10-01',to:'2026-10-01',currencyCode:'BO'}])assert.ok(periodError(filters))
  assert.ok(reasonError(' '.repeat(30)));assert.ok(reasonError('a'.repeat(501)));assert.ok(reasonError('Motivo con carácter\u200b invisible.'))
  assert.equal(reasonError('Contraste de evidencia sintética correctamente documentado.'),'')
  for(const status of [0,400,401,403,404,409,429,503])assert.ok(reconciliationError(new SessionError(status)))
  assert.match(reconciliationError(new SessionError(409)),/no se fuerza el cuadre/)
})
test('S3-07: lectura, resoluciones y pendientes accesibles, escapados y separados del dinero real',()=>{
  const summary=renderToStaticMarkup(<ReconciliationSummary batch={batch} />)
  for(const label of ['-0,30 BOB','no un saldo disponible','Creado por','Sin cierre registrado'])assert.ok(summary.includes(label),label)
  const readOnly=renderToStaticMarkup(<ReconciliationItems batch={batch} />)
  assert.ok(readOnly.includes('Falta confirmación interna'));assert.ok(readOnly.includes('Referencia del aporte'))
  assert.equal(readOnly.includes('Registrar resolución'),false)
  const writable=renderToStaticMarkup(<ReconciliationItems batch={batch} operate />)
  assert.ok(writable.includes('Registrar resolución'));assert.ok(writable.includes('Motivo'));assert.ok(writable.includes('Compensación') || writable.includes('compensación'))
  const closed=renderToStaticMarkup(<ReconciliationItems batch={{...batch,status:'CLOSED'}} operate />)
  assert.equal(closed.includes('Registrar resolución'),false)
  const resolved={...batch,items:[{...batch.items[0]!,status:'RESOLVED' as const,resolution:'COMPENSATE_DEMO' as const,reason:'<script>Motivo Ñ & evidencia</script>',resolvedBy:id,resolvedAt:'2026-10-22T12:05:00.000Z',compensationAmount:'0.30'}]}
  assert.ok(reconciliationDetailFrom({...demo,...resolved}))
  const html=renderToStaticMarkup(<ReconciliationItems batch={resolved} />)
  assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>'),false);assert.ok(html.includes('Responsable'))
  const pending={id,contributionId:id,campaignId:id,campaignTitle:'Prueba <script>Ñ</script>',reference:'BRT-C-00000001',amount:'0.30',currencyCode:'BOB',status:'EXPIRED',createdAt:'2026-10-22T12:00:00.000Z',expiresAt:null,expired:true,needsReview:true}
  const parsed=pendingFrom({...demo,items:[pending],nextCursor:null})
  assert.throws(()=>pendingFrom({...demo,items:[{...pending,amount:0.3}],nextCursor:null}))
  const pendHtml=renderToStaticMarkup(<PendingResults items={parsed.items} />)
  assert.ok(pendHtml.includes('Aviso que requiere revisión'));assert.ok(pendHtml.includes('No equivale a un ingreso confirmado'));assert.equal(pendHtml.includes('<script>'),false)
})
