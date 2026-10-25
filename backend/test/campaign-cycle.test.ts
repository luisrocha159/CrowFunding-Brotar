import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {cycleTarget,fundingOutcome} from '../src/campaign-lifecycle/domain/cycle'
import {LedgerConflict,LedgerInvalid} from '../src/contributions/domain/payment'
test('ciclo: todo-o-nada compara céntimos exactos y flexible no inventa fondos',()=>{
 assert.equal(fundingOutcome('ALL_OR_NOTHING','99.99','100.00'),'REFUND_REQUIRED')
 assert.equal(fundingOutcome('ALL_OR_NOTHING','100.00','100.00'),'EXECUTION_ELIGIBLE')
 assert.equal(fundingOutcome('FLEXIBLE','0.01','100.00'),'EXECUTION_ELIGIBLE')
 assert.equal(fundingOutcome('FLEXIBLE','0.00','100.00'),'NO_FUNDS')
 assert.equal(fundingOutcome('ALL_OR_NOTHING','0.00','100.00'),'NO_FUNDS')
 assert.equal(fundingOutcome('ALL_OR_NOTHING','1999999999999.98','999999999999.99'),'EXECUTION_ELIGIBLE','El total de varios aportes admite numeric(16,2), sin floats ni límite de un solo pago.')
 assert.throws(()=>fundingOutcome('inventado','100','100'),LedgerConflict)
 assert.throws(()=>fundingOutcome('FLEXIBLE','0.001','100'),LedgerInvalid)
})
test('ciclo: solo transiciones explícitas, solicitud no equivale a cancelación ni aprobación a publicación',()=>{
 assert.equal(cycleTarget('PUBLISHED','END_FUNDING',false,'PENDING'),'FUNDING_ENDED')
 assert.equal(cycleTarget('FUNDING_ENDED','START_EXECUTION',false,'EXECUTION_ELIGIBLE'),'IN_EXECUTION')
 assert.equal(cycleTarget('IN_EXECUTION','REQUEST_CANCEL',false,'EXECUTION_ELIGIBLE'),'IN_EXECUTION')
 assert.equal(cycleTarget('PUBLISHED','REJECT_CANCEL',true,'PENDING'),'PUBLISHED')
 assert.equal(cycleTarget('PUBLISHED','APPROVE_CANCEL',true,'PENDING'),'CANCELLED')
 assert.equal(cycleTarget('IN_EXECUTION','CLOSE',false,'EXECUTION_ELIGIBLE'),'CLOSED')
 for(const [state,action,cancel,outcome] of [['CLOSED','REQUEST_CANCEL',false,'PENDING'],['PUBLISHED','START_EXECUTION',false,'EXECUTION_ELIGIBLE'],['FUNDING_ENDED','START_EXECUTION',false,'REFUND_REQUIRED'],['FUNDING_ENDED','START_EXECUTION',true,'EXECUTION_ELIGIBLE'],['PUBLISHED','APPROVE_CANCEL',false,'PENDING'],['PUBLISHED','CLOSE',false,'PENDING'],['CLOSED','CLOSE',false,'NO_FUNDS']] as const)assert.throws(()=>cycleTarget(state,action,cancel,outcome),LedgerConflict)
 assert.throws(()=>cycleTarget('PUBLISHED','PUBLISH_BANK_FUNDS',false,'PENDING'),LedgerInvalid)
})
