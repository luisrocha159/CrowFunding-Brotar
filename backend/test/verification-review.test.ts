import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {reviewPlan} from '../src/verifications/domain/review'
import {InvalidVerification} from '../src/verifications/domain/verification'
const fileId='06ec727d-4664-45c9-b704-01880c7a8832'
const reason='Documento sintético revisado de manera explícita.'
test('revisión exige iniciar, motivo y validación exacta de cada documento actual para aprobar',()=>{
 assert.equal(reviewPlan('PENDING',{decision:'IN_REVIEW',reason,documents:[]},[fileId]).decision,'IN_REVIEW')
 assert.throws(()=>reviewPlan('PENDING',{decision:'APPROVED',reason,documents:[{fileId,isValid:true,notes:''}]},[fileId]),InvalidVerification)
 assert.equal(reviewPlan('IN_REVIEW',{decision:'APPROVED',reason,documents:[{fileId,isValid:true,notes:''}]},[fileId]).documents[0]?.isValid,true)
 for(const documents of [[],[{fileId,isValid:false,notes:''}],[{fileId,isValid:true,notes:''},{fileId,isValid:true,notes:''}]])assert.throws(()=>reviewPlan('IN_REVIEW',{decision:'APPROVED',reason,documents},[fileId]),InvalidVerification)
 for(const status of ['NOT_STARTED','APPROVED','REJECTED','EXPIRED','REQUIRES_INFO'])assert.throws(()=>reviewPlan(status,{decision:'REJECTED',reason,documents:[]},[fileId]),InvalidVerification)
 for(const invalid of ['corto','a'.repeat(501),'Texto con \u0000 oculto','<script>mensaje no permitido</script>'])assert.throws(()=>reviewPlan('IN_REVIEW',{decision:'REJECTED',reason:invalid,documents:[]},[fileId]),InvalidVerification)
})
