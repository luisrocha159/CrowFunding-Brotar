import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { verificationStatus, verificationDocumentUrl } from '../src/features/verifications/verificationsClient'
import { parsePartyPage } from '../src/features/verifications/partyClient'
test('identidad: etiquetas distinguen recepción, revisión, aprobación y corrección',()=>{
  assert.equal(verificationStatus('NOT_STARTED'),'Sin enviar')
  assert.equal(verificationStatus('PENDING'),'Enviada')
  assert.equal(verificationStatus('REQUIRES_INFO'),'Requiere información')
  assert.equal(verificationStatus('APPROVED'),'Aprobada')
  assert.equal(verificationDocumentUrl('case','file'),'/api/me/verifications/case/documents/file')
  assert.match(verificationDocumentUrl('../private','file'),/%2F/)
})
test('administración personas: no convierte errores o formas incompletas en listas vacías',()=>{
  assert.deepEqual(parsePartyPage({items:[],page:1,hasMore:false}),{items:[],page:1,hasMore:false})
  assert.throws(()=>parsePartyPage({items:[],page:'1',hasMore:false}))
  assert.throws(()=>parsePartyPage({items:[{id:'x',name:'Persona'}],page:1,hasMore:false}))
})
