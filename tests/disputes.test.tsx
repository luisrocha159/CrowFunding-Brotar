import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {allowedDisputeActions,disputeDetailFrom,disputePageFrom} from '../src/features/disputes/disputeClient'
import {DisputeActionForm} from '../src/features/disputes/DisputePages'
const id='06ec727d-4664-45c9-b704-01880c7a8832'
const fixture={mode:'DEMO',id,reference:'BRT-D-TEST',paymentId:id,contributionId:id,campaignId:id,campaignTitle:'DEMO',supportCaseId:id,supportReference:'BRT-S-TEST',priority:3,category:'OTHER',description:'Reclamación de prueba ficticia válida.',status:'OPEN',raisedBy:id,assignedTo:null,resolution:null,createdAt:'2026-10-23T12:00:00Z',updatedAt:'2026-10-23T12:00:00Z',version:1,financialHold:true,holdAmount:'10.25',resolutionCode:null,recommendedAmount:null,linkedRefundId:null,currencyCode:'BOB',refundStatus:null,messages:[],events:[],evidence:[],historyPage:1,messageTotal:0,eventTotal:0,pageSize:20}
test('disputas: contrato privado estricto y cierre solo sin obligación pendiente',()=>{
 const d=disputeDetailFrom(fixture);assert.deepEqual(allowedDisputeActions(d),['CLAIM'])
 for(const patch of[{priority:6},{financialHold:'true'},{recommendedAmount:1},{status:'PAID'},{messages:[{body:'forged'}]}])assert.throws(()=>disputeDetailFrom({...fixture,...patch}))
 assert.throws(()=>disputePageFrom({mode:'DEMO',items:[],page:1,total:'0',pageSize:20}))
 const recommended=disputeDetailFrom({...fixture,status:'RESOLVED',resolutionCode:'REFUND_RECOMMENDED',recommendedAmount:'3.10'})
 assert.ok(!allowedDisputeActions(recommended).includes('CLOSE'))
 assert.ok(allowedDisputeActions({...recommended,financialHold:false,linkedRefundId:id,refundStatus:'REFUNDED'}).includes('CLOSE'))
})
test('disputas: Soporte no tiene botones de pago; motivo, confirmación y acciones según estado',()=>{
 const html=renderToStaticMarkup(<DisputeActionForm detail={disputeDetailFrom({...fixture,status:'UNDER_REVIEW'})} onSaved={()=>{}}/>);assert.match(html,/RECOMMEND_REFUND/);assert.match(html,/REQUEST_INFO/);assert.doesNotMatch(html,/COMPLETE_DEMO|AUTHORIZE/);assert.match(html,/minLength="20"/i);assert.match(html,/type="checkbox"/);assert.match(html,/disabled/)
})
