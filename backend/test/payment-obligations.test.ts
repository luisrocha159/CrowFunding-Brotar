import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {LedgerConflict,LedgerInvalid,nextPaymentState,obligationState} from '../src/contributions/domain/payment'
test('S3-02: derivación única de obligaciones, parciales/total, disputas y avisos tardíos',()=>{
 assert.deepEqual(obligationState('10.25','0',false),{payment:'CONFIRMED',contribution:'CONFIRMED'})
 assert.deepEqual(obligationState('10.25','3.10',true),{payment:'DISPUTED',contribution:'CONFIRMED'})
 assert.deepEqual(obligationState('10.25','3.10',false),{payment:'CONFIRMED',contribution:'CONFIRMED'})
 assert.deepEqual(obligationState('10.25','10.25',true),{payment:'REFUNDED',contribution:'REFUNDED'})
 assert.throws(()=>obligationState('10.25','10.26',false),LedgerConflict)
 assert.throws(()=>obligationState('10.25','0.001',false),LedgerInvalid)
 for(const current of ['REFUNDED','DISPUTED','CONFIRMED'] as const)for(const incoming of ['PENDING','CONFIRMED','FAILED','EXPIRED'] as const)assert.equal(nextPaymentState(current,incoming),current)
})
