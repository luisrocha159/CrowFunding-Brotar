import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {refundAmountError,refundDetailFrom,refundPageFrom,refundFailure,refundEligibilityFrom} from '../src/features/refunds/refundClient'
import {RefundActionForm} from '../src/features/refunds/RefundPages'
import {RefundNavigation,RefundSummary,RefundBalance} from '../src/features/refunds/RefundSummary'
import {MemoryRouter} from 'react-router-dom'
const id='06ec727d-4664-45c9-b704-01880c7a8832'
const refund={mode:'DEMO',id,paymentId:id,contributionId:id,campaignId:id,campaignTitle:'DEMO',contributionReference:'BRT-C-TEST',amount:'3.10',currencyCode:'BOB',status:'REQUESTED',reasonCode:'OTHER',reason:'Solicitud sintética de prueba justificada.',requestedBy:id,approvedBy:null,externalReference:null,createdAt:'2026-10-23T12:00:00Z',processedAt:null,completedAt:null,failureMessage:null,version:1,disputeId:null,events:[]}
test('devoluciones: contratos estrictos y dinero decimal sin redondeos',()=>{
 assert.equal(refundDetailFrom(refund).amount,'3.10');for(const patch of[{mode:'LIVE'},{amount:3.1},{version:'1'},{status:'APPROVED'},{completedAt:'bad'}])assert.throws(()=>refundDetailFrom({...refund,...patch}))
 assert.throws(()=>refundPageFrom({mode:'DEMO',items:[],total:'0',page:1,pageSize:20}))
 assert.equal(refundAmountError('3.10','10.25'),null)
 for(const amount of['0','0.00','10.26','3.001','1e3','-1','3,10'])assert.ok(refundAmountError(amount,'10.25'))
 assert.doesNotMatch(refundFailure(new Error('private secret')),/private secret/)
})

test('devoluciones: accesos de trabajo separados de los aportes personales',()=>{
 const admin=renderToStaticMarkup(<MemoryRouter><RefundNavigation administrative base="/administracion/devoluciones" onReload={()=>{}}/></MemoryRouter>)
 assert.match(admin,/Panel de finanzas/);assert.match(admin,/href="\/administracion\/finanzas"/);assert.doesNotMatch(admin,/Mis aportes|href="\/mis-aportes"/)
 const own=renderToStaticMarkup(<MemoryRouter><RefundNavigation administrative={false} base="/mis-devoluciones" onReload={()=>{}}/></MemoryRouter>)
 assert.match(own,/Mis aportes/);assert.doesNotMatch(own,/Panel de finanzas/)
})

test('devoluciones: saldo restante, causas legibles, evidencias privadas y referencias secundarias',()=>{
 const balance={paymentId:id,contributionId:id,reference:'BRT-C-TEST',campaignTitle:'Huerto',campaignStatus:'PUBLISHED',currencyCode:'BOB',original:'100.00',returned:'30.00',reserved:'20.00',remaining:'50.00',automaticReason:null,openRefundId:id,canRequest:false,blocks:['Hay una solicitud en trámite.'],allowedReasons:['OTHER']}
 assert.equal(refundEligibilityFrom(balance).remaining,'50.00')
 for(const patch of [{remaining:50},{automaticReason:'BANK_TRANSFER'},{openRefundId:'bad'},{allowedReasons:['PROJECT_CANCELLED']},{blocks:[null]}])assert.throws(()=>refundEligibilityFrom({...balance,...patch}))
 const html=renderToStaticMarkup(<RefundBalance balance={refundEligibilityFrom(balance)}/>);assert.match(html,/Ya devuelto/);assert.match(html,/En trámite/);assert.match(html,/50,00 BOB/)
 const detail=refundDetailFrom({...refund,reasonCode:'REWARD_ISSUE',evidence:[{fileId:id,name:'respaldo.pdf'}]})
 const own=renderToStaticMarkup(<MemoryRouter><RefundSummary detail={detail} administrative={false}/></MemoryRouter>)
 assert.match(own,/Problema con la recompensa/);assert.doesNotMatch(own,/REWARD_ISSUE/);assert.match(own,/\/api\/me\/refunds\/.*\/evidence\//);assert.match(own,/<details[^>]*><summary>Referencias y datos técnicos/)
 const admin=renderToStaticMarkup(<MemoryRouter><RefundSummary detail={detail} administrative/></MemoryRouter>);assert.match(admin,/\/api\/admin\/finance\/refunds\//);assert.doesNotMatch(admin,/Consultar mi aporte/)
 assert.throws(()=>refundDetailFrom({...refund,evidence:[{fileId:'foreign',name:'x'}]}))
})
test('devoluciones: autorización y resultado son acciones distintas, con motivo y confirmación',()=>{
 const html=renderToStaticMarkup(<RefundActionForm detail={refundDetailFrom(refund)} onSaved={()=>{}}/>);assert.match(html,/AUTHORIZE/);assert.match(html,/REJECT/);assert.doesNotMatch(html,/COMPLETE_DEMO/);assert.match(html,/minLength="20"/i);assert.match(html,/type="checkbox"/);assert.match(html,/disabled/)
 const processing=renderToStaticMarkup(<RefundActionForm detail={refundDetailFrom({...refund,status:'PROCESSING',version:2})} onSaved={()=>{}}/>);assert.match(processing,/COMPLETE_DEMO/);assert.match(processing,/FAIL_DEMO/);assert.doesNotMatch(processing,/>Autorizar procesamiento</)
})
