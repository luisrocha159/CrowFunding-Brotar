import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {refundTransition,availableRefund,automaticRefundReason} from '../src/refunds/domain/refund'
import {LedgerConflict,LedgerInvalid} from '../src/contributions/domain/payment'
test('devoluciones: reserva exacta, límites, estados y efectos separados',()=>{
 assert.equal(availableRefund('10.25','1.10','2.00'),'7.15')
 assert.equal(refundTransition('REQUESTED','AUTHORIZE'),'PROCESSING')
 assert.equal(refundTransition('REQUESTED','REJECT'),'FAILED')
 assert.equal(refundTransition('PROCESSING','COMPLETE_DEMO'),'REFUNDED')
 assert.equal(refundTransition('PROCESSING','FAIL_DEMO'),'FAILED')
 for(const[state,action]of[['REFUNDED','COMPLETE_DEMO'],['FAILED','AUTHORIZE'],['REQUESTED','COMPLETE_DEMO']])assert.throws(()=>refundTransition(state!,action!),LedgerConflict)
 assert.throws(()=>refundTransition('REQUESTED','BANK_TRANSFER'),LedgerInvalid)
 assert.throws(()=>availableRefund('10.00','9.00','2.00'),LedgerConflict)
})

test('automatización: solo cancelación confirmada o todo-o-nada con obligación fijada',()=>{
 assert.equal(automaticRefundReason('CANCELLED','FLEXIBLE','NO_FUNDS'),'PROJECT_CANCELLED')
 assert.equal(automaticRefundReason('FUNDING_ENDED','ALL_OR_NOTHING','REFUND_REQUIRED'),'GOAL_NOT_REACHED')
 for(const [status,model,outcome]of [['PUBLISHED','ALL_OR_NOTHING','REFUND_REQUIRED'],['FUNDING_ENDED','FLEXIBLE','EXECUTION_ELIGIBLE'],['IN_EXECUTION','ALL_OR_NOTHING','EXECUTION_ELIGIBLE'],['CLOSED','ALL_OR_NOTHING','REFUND_REQUIRED']])assert.equal(automaticRefundReason(status!,model!,outcome!),null)
})
