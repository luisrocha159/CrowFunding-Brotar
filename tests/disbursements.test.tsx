import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
import {DisbursementSummary} from '../src/features/disbursements/DisbursementSummary'
import {destinationFrom,destinationError,disbursementFrom,disbursementPageFrom,payoutOptions} from '../src/features/disbursements/disbursementClient'
import {DestinationPanel} from '../src/features/disbursements/DisbursementPages'
import {SessionError} from '../src/shared/api/sessionError'
const id='11111111-1111-4111-8111-111111111111',date='2026-10-23T12:00:00Z'
const payout={mode:'DEMO',id,number:'BRT-P-0000001',campaignId:id,campaignTitle:'DEMO Huerto',status:'PENDING',amount:'3.10',netAmount:'3.10',platformFee:'0.00',providerFee:'0.00',otherCosts:'0.00',currencyCode:'BOB',version:1,requestedBy:id,authorizedBy:null,executedBy:null,externalReference:null,scheduledFor:null,createdAt:date,authorizedAt:null,processedAt:null,completedAt:null,failureMessage:null,reason:'Motivo de desembolso sintético',destinationReference:'DEMO-HUERTO',destinationHolder:'DEMO Huerto',events:[]}
test('desembolsos cliente: importes/estados/referencias/versiones no se inventan',()=>{
 assert.equal(disbursementFrom(payout).netAmount,'3.10')
 assert.equal(disbursementPageFrom({mode:'DEMO',items:[payout],total:1,page:1,pageSize:20}).items.length,1)
 for(const bad of [null,{}, {...payout,amount:3.1},{...payout,status:'PAID_REAL'},{...payout,version:0},{...payout,events:[{}]},{...payout,requestedByContact:{name:123,email:'privado@example.invalid'}},{...payout,authorizedByContact:'no-es-un-contacto'}])assert.throws(()=>disbursementFrom(bad),SessionError)
 assert.ok(Object.hasOwn(payoutOptions('PENDING'),'AUTHORIZE'));assert.ok(!Object.hasOwn(payoutOptions('APPROVED'),'COMPLETE_DEMO'));assert.deepEqual(payoutOptions('COMPLETED'),{})
})

test('resumen de desembolso: reserva pendiente, importe exacto y responsables legibles sin exponerlos como HTML',()=>{
 const detail=disbursementFrom({...payout,amount:'999999999999.99',netAmount:'999999999999.99',requestedByContact:{name:'Ricardo <script>privado</script>',email:'ricardo@example.invalid'}})
 const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(DisbursementSummary,{detail,administrative:true})))
 assert.match(html,/Pendiente de autorización/);assert.match(html,/999\.999\.999\.999,99 BOB/)
 assert.match(html,/todavía no se ha entregado/);assert.doesNotMatch(html,/Importe entregado|<script>/)
 assert.match(html,/Ricardo &lt;script&gt;privado&lt;\/script&gt;/);assert.match(html,/ricardo@example.invalid/)
 assert.match(html,/Fechas, referencias y datos técnicos/)
})
test('destinos cliente: solo ficción explícita, sin números bancarios ni aprobaciones por carga',()=>{
 const d={mode:'DEMO',campaignId:id,campaignTitle:'DEMO',currencyCode:'BOB',destination:{id,status:'PENDING',holder:'DEMO Huerto Ñandú',reference:'DEMO-HUERTO',version:1,reviewedBy:null,reviewedAt:null},events:[]}
 assert.equal(destinationFrom(d).destination?.status,'PENDING');assert.equal(destinationError('DEMO-HUERTO','DEMO Huerto Ñandú'),null);assert.notEqual(destinationError('123456789','Persona real'),null)
 assert.equal(destinationError('PRUEBA-HUERTO','PRUEBA Huerto Ñandú'),null)
 assert.notEqual(destinationError('PRUEBA-'+ 'A'.repeat(39),'PRUEBA Titular'),null)
 assert.throws(()=>destinationFrom({...d,destination:{...d.destination,version:0}}),SessionError)
 const html=renderToStaticMarkup(createElement(DestinationPanel,{value:destinationFrom(d),administrative:true,canOperate:false,onSaved:()=>{}}))
 assert.ok(html.includes('solo consultan'));assert.ok(!html.includes('<form'));assert.ok(html.includes('Pendiente'))
})
