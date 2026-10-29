import assert from 'node:assert/strict'
import {test} from 'node:test'
import {assertLegalAcceptance,InvalidLegalAgreement} from '../src/legal/domain/legal-agreement'
import {LEGAL_VERSION} from '../src/legal/domain/legal-v1-20261028'
import {LEGAL_DEFINITION,LEGAL_HASH,legalDigest} from '../src/legal/legal-record'
test('acuerdo: versión exacta y aceptación explícita; no infiere booleanos ni versiones',()=>{
 for(const version of [undefined,null,'','anterior',{},[LEGAL_VERSION]])assert.throws(()=>assertLegalAcceptance(version,true),InvalidLegalAgreement)
 for(const accepted of [undefined,null,false,1,'true'])assert.throws(()=>assertLegalAcceptance(LEGAL_VERSION,accepted),InvalidLegalAgreement)
 assert.doesNotThrow(()=>assertLegalAcceptance(LEGAL_VERSION,true))
})
test('acuerdo: huella estable al pasar por JSONB y sensible al texto; tres finalidades separadas',()=>{
 const reordered=JSON.parse(JSON.stringify(LEGAL_DEFINITION)) as Record<string,unknown>
 assert.equal(legalDigest(Object.fromEntries(Object.entries(reordered).reverse())),LEGAL_HASH)
 assert.notEqual(legalDigest({...reordered,mode:'REAL'}),LEGAL_HASH)
 assert.deepEqual(LEGAL_DEFINITION.documents.map(d=>d.code),['TERMS','PRIVACY','IDENTITY'])
 assert.match(LEGAL_HASH,/^[a-f0-9]{64}$/)
})
