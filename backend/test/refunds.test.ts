import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {refundTransition,availableRefund} from '../src/refunds/domain/refund'
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
