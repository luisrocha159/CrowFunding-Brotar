import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {disbursementAmounts,disbursementTarget,syntheticDestination,schedule} from '../src/disbursements/domain/disbursement'
import {LedgerConflict,LedgerInvalid} from '../src/contributions/domain/payment'
test('desembolso: autorización, proceso y resultado separados, terminales no reabren',()=>{
 assert.equal(disbursementTarget('PENDING','AUTHORIZE'),'APPROVED');assert.equal(disbursementTarget('PENDING','REJECT'),'FAILED')
 assert.equal(disbursementTarget('APPROVED','PROCESS_DEMO'),'PROCESSING');assert.equal(disbursementTarget('PROCESSING','COMPLETE_DEMO'),'COMPLETED')
 for(const s of ['APPROVED','PROCESSING'])assert.equal(disbursementTarget(s,'FAIL_DEMO'),'FAILED')
 for(const[s,a]of[['PENDING','COMPLETE_DEMO'],['PENDING','FAIL_DEMO'],['COMPLETED','AUTHORIZE'],['FAILED','AUTHORIZE'],['APPROVED','COMPLETE_DEMO']])assert.throws(()=>disbursementTarget(s!,a!),LedgerConflict)
 assert.throws(()=>disbursementTarget('PENDING','WIRE_TRANSFER'),LedgerInvalid)
})
test('desembolso: bruto/neto exactos, sin costos inventados ni destinos reales',()=>{
 assert.deepEqual(disbursementAmounts('3.1'),{gross:'3.10',platform:'0.00',provider:'0.00',other:'0.00',net:'3.10'})
 for(const v of ['',' ','0','-1','1e2','NaN','1.001','1000000000000'])assert.throws(()=>disbursementAmounts(v),LedgerInvalid)
 assert.throws(()=>disbursementAmounts('10','0.01'),LedgerInvalid)
 assert.deepEqual(syntheticDestination('DEMO-HUERTO','DEMO Huerto Ñandú'),{reference:'DEMO-HUERTO',holder:'DEMO Huerto Ñandú'})
 for(const [r,h]of[['123456789','Ricardo'],['DEMO-1234','DEMO Titular'],['DEMO-HUERTO','DEMO <script>'],['DEMO-HUERTO','       ']])assert.throws(()=>syntheticDestination(r!,h!),LedgerInvalid)
})
test('desembolso: fecha opcional, calendarios reales y hoy en Bolivia',()=>{
 assert.equal(schedule(null,'2026-10-23'),null);assert.equal(schedule('2026-10-23','2026-10-23'),'2026-10-23');assert.equal(schedule('2028-02-29','2026-10-23'),'2028-02-29')
 for(const d of ['2026-10-22','2026-02-30','2027-02-29','2026-13-01','2026-1-1','ayer',''])assert.throws(()=>schedule(d,'2026-10-23'),LedgerInvalid)
})
