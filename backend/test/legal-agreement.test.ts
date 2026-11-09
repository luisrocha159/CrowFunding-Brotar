import assert from 'node:assert/strict'
import {test} from 'node:test'
import {assertLegalAcceptance,InvalidLegalAgreement} from '../src/legal/domain/legal-agreement'
import {LEGAL_VERSION} from '../src/legal/domain/legal-v2-20261109'
import {LEGAL_DEFINITION,LEGAL_HASH,legalDigest} from '../src/legal/legal-record'
import {LEGAL_DEFINITION as previous,LEGAL_HASH as previousHash} from '../src/legal/legal-v1-record'

test('publicación 1.1: textos sin rótulo anterior, sin prefijo obligatorio y conservación del archivo y su huella',()=>{
 assert.notEqual(LEGAL_HASH,previousHash)
 assert.equal(legalDigest(previous),previousHash)
 assert.equal(previous.version,'mvp-demo-legal-1.0-20261028')
 assert.equal(LEGAL_DEFINITION.version,'mvp-pruebas-legal-1.1-20261109')
 assert.doesNotMatch(JSON.stringify(LEGAL_DEFINITION.documents),/DEMO/i)
 assert.match(JSON.stringify(LEGAL_DEFINITION.documents),/sin un prefijo obligatorio/)
 assert.match(JSON.stringify(LEGAL_DEFINITION.documents),/dinero real/)
})
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
