import {test} from 'node:test'
import assert from 'node:assert/strict'
import {MemoryRouter} from 'react-router-dom'
import {renderToStaticMarkup} from 'react-dom/server'
import {AccountIdentity} from '../src/shared/components/AccountIdentity'
import {accountContactsValid} from '../src/shared/api/accountContact'
import {RefundSummary,RefundHistory} from '../src/features/refunds/RefundSummary'
import {refundDetailFrom} from '../src/features/refunds/refundClient'

test('identificación: nombre destacado, correo legible y texto escapado; fallback sin personas inventadas',()=>{
 const html=renderToStaticMarkup(<AccountIdentity contact={{name:'Ana <script>',email:'ana@example.invalid'}}/>);assert.match(html,/<strong>Ana &lt;script&gt;<\/strong>/);assert.match(html,/ana@example.invalid/);assert.doesNotMatch(html,/<script>/)
 assert.match(renderToStaticMarkup(<AccountIdentity contact={null}/>),/Cuenta no disponible/)
 assert.equal(accountContactsValid({actorContact:{name:null,email:'actor@example.invalid'}}),true)
 for(const contact of [{name:'X',email:{}},{name:45,email:'x'},[],{name:'X',email:''}])assert.equal(accountContactsValid({actorContact:contact}),false)
})

test('devolución: aportante y actor correctos en administración; contactos internos ocultos en vista personal',()=>{
 const id='11111111-1111-4111-8111-111111111111',contact={name:'Ana',email:'ana@example.invalid'},staff={name:'Finanzas',email:'finance@example.invalid'}
 const d=refundDetailFrom({mode:'DEMO',id,paymentId:id,contributionId:id,campaignId:id,campaignTitle:'Huerto',contributionReference:'BRT-C-1',amount:'10.00',currencyCode:'BOB',status:'FAILED',reasonCode:'OTHER',reason:'Solicitud con una explicación suficientemente detallada.',requestedBy:id,approvedBy:null,externalReference:null,createdAt:'2026-11-09T12:00:00Z',processedAt:null,completedAt:null,failureMessage:'Motivo de rechazo',version:2,disputeId:null,contributorContact:contact,requestedByContact:contact,events:[{id,actorId:id,actorContact:staff,action:'REJECT',previousStatus:'REQUESTED',status:'FAILED',reason:'Explicación de rechazo registrada por Finanzas.',at:'2026-11-09T13:00:00Z'}]})
 const admin=renderToStaticMarkup(<MemoryRouter><RefundSummary detail={d} administrative/><RefundHistory detail={d} administrative/></MemoryRouter>);assert.match(admin,/ana@example.invalid/);assert.match(admin,/finance@example.invalid/);assert.match(admin,/Aportante/)
 const own=renderToStaticMarkup(<MemoryRouter><RefundSummary detail={d} administrative={false}/><RefundHistory detail={d}/></MemoryRouter>);assert.doesNotMatch(own,/finance@example.invalid|ana@example.invalid/)
})
