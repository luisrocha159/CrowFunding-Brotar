import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {refundAmountError,refundDetailFrom,refundPageFrom,refundFailure} from '../src/features/refunds/refundClient'
import {RefundActionForm} from '../src/features/refunds/RefundPages'
const id='06ec727d-4664-45c9-b704-01880c7a8832'
const refund={mode:'DEMO',id,paymentId:id,contributionId:id,campaignId:id,campaignTitle:'DEMO',contributionReference:'BRT-C-TEST',amount:'3.10',currencyCode:'BOB',status:'REQUESTED',reasonCode:'OTHER',reason:'Solicitud sintética de prueba justificada.',requestedBy:id,approvedBy:null,externalReference:null,createdAt:'2026-10-23T12:00:00Z',processedAt:null,completedAt:null,failureMessage:null,version:1,disputeId:null,events:[]}
test('devoluciones: contratos estrictos y dinero decimal sin redondeos',()=>{
 assert.equal(refundDetailFrom(refund).amount,'3.10');for(const patch of[{mode:'LIVE'},{amount:3.1},{version:'1'},{status:'APPROVED'},{completedAt:'bad'}])assert.throws(()=>refundDetailFrom({...refund,...patch}))
 assert.throws(()=>refundPageFrom({mode:'DEMO',items:[],total:'0',page:1,pageSize:20}))
 assert.equal(refundAmountError('3.10','10.25'),null)
 for(const amount of['0','0.00','10.26','3.001','1e3','-1','3,10'])assert.ok(refundAmountError(amount,'10.25'))
 assert.doesNotMatch(refundFailure(new Error('private secret')),/private secret/)
})
test('devoluciones: autorización y resultado son acciones distintas, con motivo y confirmación',()=>{
 const html=renderToStaticMarkup(<RefundActionForm detail={refundDetailFrom(refund)} onSaved={()=>{}}/>);assert.match(html,/AUTHORIZE/);assert.match(html,/REJECT/);assert.doesNotMatch(html,/COMPLETE_DEMO/);assert.match(html,/minLength="20"/i);assert.match(html,/type="checkbox"/);assert.match(html,/disabled/)
 const processing=renderToStaticMarkup(<RefundActionForm detail={refundDetailFrom({...refund,status:'PROCESSING',version:2})} onSaved={()=>{}}/>);assert.match(processing,/COMPLETE_DEMO/);assert.match(processing,/FAIL_DEMO/);assert.doesNotMatch(processing,/>Autorizar procesamiento</)
})
