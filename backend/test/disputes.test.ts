import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {disputeTransition,caseText} from '../src/disputes/domain/dispute'
import {LedgerConflict,LedgerInvalid} from '../src/contributions/domain/payment'
test('disputas: investigar, pedir respuesta, escalar, resolver, reabrir y cerrar son transiciones explícitas',()=>{
 assert.equal(disputeTransition('OPEN','CLAIM'),'UNDER_REVIEW')
 assert.equal(disputeTransition('UNDER_REVIEW','REQUEST_INFO'),'AWAITING_RESPONSE')
 assert.equal(disputeTransition('AWAITING_RESPONSE','RESUME'),'UNDER_REVIEW')
 assert.equal(disputeTransition('UNDER_REVIEW','ESCALATE'),'ESCALATED')
 assert.equal(disputeTransition('UNDER_REVIEW','RECOMMEND_REFUND'),'RESOLVED')
 assert.equal(disputeTransition('RESOLVED','CLOSE'),'CLOSED')
 assert.equal(disputeTransition('RESOLVED','REOPEN'),'UNDER_REVIEW')
 for(const[s,a]of[['OPEN','CLOSE'],['CLOSED','CLAIM'],['AWAITING_RESPONSE','RESOLVE_NO_REFUND']])assert.throws(()=>disputeTransition(s!,a!),LedgerConflict)
 assert.throws(()=>disputeTransition('OPEN','PAY'),LedgerInvalid)
 for(const text of['corto','Texto\u0000 oculto','<script>Información inválida</script>'])assert.throws(()=>caseText(text,20,2000),LedgerInvalid)
 assert.equal(caseText('  Descripción de reclamación ficticia con Ñ.  ',20,2000),'Descripción de reclamación ficticia con Ñ.')
})
