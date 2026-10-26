import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {demoTicketFrom,demoFailure} from '../src/features/contributions/demoClient'
import {SettingEditor} from '../src/features/catalogs/SettingEditor'
import {sponsorSummaryFrom} from '../src/features/contributions/contributionsClient'
const ticket={paymentId:'8cdca2ce-4764-44a1-8aab-584f70ede7df',contributionId:'7ca21b07-2ad1-478f-9940-08030cb37190',reference:'BRT-TEST',amount:'10.00',currencyCode:'BOB',status:'INITIATED',attempt:1,expiresAt:'2026-10-23T12:00:00Z',expired:false,mode:'DEMO',payable:false,qrPayload:'BROTAR-DEMO:8cdca2ce-4764-44a1-8aab-584f70ede7df'}
test('checkout DEMO rechaza boletos pagables, respuestas ambiguas y referencias externas',()=>{
 assert.equal(demoTicketFrom(ticket).payable,false)
 for(const patch of [{mode:'LIVE'},{payable:true},{paymentId:'other'},{amount:10},{amount:'1e3'},{currencyCode:'BOB '},{status:'PAID'},{attempt:0},{expiresAt:'bad'},{qrPayload:'https://bank.invalid/pay'}])assert.throws(()=>demoTicketFrom({...ticket,...patch}))
 assert.doesNotMatch(demoFailure(new Error('private secret')),/private secret/)
})
test('parámetros DEMO tienen límites enteros y confirmación; auditor solo consulta',()=>{
 const setting={key:'support.first_response_hours',value:48,updatedBy:null,updatedAt:null}
 const editable=renderToStaticMarkup(<SettingEditor setting={setting} editable onSaved={()=>{}} />)
 assert.match(editable,/min="1"/);assert.match(editable,/max="48"/);assert.match(editable,/step="1"/);assert.match(editable,/type="checkbox"/);assert.match(editable,/Guardar parámetro/)
 const readonly=renderToStaticMarkup(<SettingEditor setting={setting} editable={false} onSaved={()=>{}} />)
 assert.doesNotMatch(readonly,/<button|type="checkbox"/);assert.match(readonly,/disabled/)
})
test('panel conserva separados los totales reales y DEMO y no acepta importes numéricos',()=>{
 const summary={contributionCount:1,campaignsSupported:1,statusCounts:[],totals:[],demoTotals:[{currency:'BOB',grossConfirmed:'10.00',refunded:'0.00',disputed:'0.00'}],sandboxPaymentCount:1,favorites:0,following:0,openSupportCases:0,openDisputes:0,pendingRefunds:0}
 assert.equal(sponsorSummaryFrom(summary).demoTotals?.[0]?.grossConfirmed,'10.00')
 assert.throws(()=>sponsorSummaryFrom({...summary,demoTotals:[{...summary.demoTotals[0],grossConfirmed:10}]}))
})
