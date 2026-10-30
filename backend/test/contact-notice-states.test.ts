import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {stateNotice,supportNotice} from '../src/contacts/contact-mail'

test('S3-26: los estados reales de los siete módulos se comunican sin códigos técnicos',()=>{
 const codes=['CHANGES_REQUESTED','PENDING_VERIFICATION','FUNDING_ENDED','NOT_STARTED','INITIATED','DISPUTED','UNDER_REVIEW','AWAITING_RESPONSE','ESCALATED','IN_PROGRESS']
 for(const code of codes)assert.ok(!stateNotice('CAMPAIGN',code).body.includes(code),code)
 assert.match(stateNotice('CAMPAIGN','CHANGES_REQUESTED').body,/observaciones/)
 assert.match(stateNotice('CAMPAIGN','FUNDING_ENDED').body,/financiamiento finalizado/)
 assert.match(stateNotice('PAYMENT','DISPUTED').body,/en disputa/)
 assert.ok(stateNotice('CAMPAIGN','FUTURE_STATE').body.includes('FUTURE_STATE'),'Un código futuro no se convierte en éxito inventado.')
})

test('S3-26: los avisos no prometen transferencia ni copian mensajes o motivos privados',()=>{
 for(const entity of ['CAMPAIGN','VERIFICATION','PAYMENT','REFUND','DISPUTE','DISBURSEMENT','REWARD_FULFILLMENT'])assert.match(stateNotice(entity,'APPROVED').body,/no acredita transferencias reales/)
 for(const kind of ['MESSAGE','STATUS'] as const)assert.match(supportNotice(kind,'RESOLVED').body,/no procesa pagos ni devoluciones/)
})
