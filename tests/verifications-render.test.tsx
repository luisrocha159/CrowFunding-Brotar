import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { VerificationEditor } from '../src/features/verifications/VerificationEditor'
import type { VerificationDetail } from '../src/features/verifications/verificationsClient'
test('identidad: aviso, campos y observaciones privados se renderizan como texto escapado',()=>{
  const malicious='<script>alert("private")</script>'
  const detail: VerificationDetail={id:'case',typeName:'Identidad',typeCode:'KYC_IDENTITY',organizationId:null,organizationName:null,status:'REQUIRES_INFO',updatedAt:'2026-10-22T00:00:00Z',version:'1',resultNotes:malicious,rejectionReason:null,submittedAt:null,
    policy:{version:'fixture',treatmentNotice:malicious,evidenceReference:'fixture',approvedBy:'fixture',approvedAt:'2026-10-22T00:00:00Z',requiresAcceptance:true,fields:[{key:'name',label:'Nombre',required:true,maxLength:120}],documents:[]},fields:{name:malicious},documents:[],history:[],revisions:[]}
  const html=renderToStaticMarkup(<VerificationEditor detail={detail} readOnly onSaved={()=>{}} onReload={()=>{}} />)
  assert.doesNotMatch(html,/<script>/)
  assert.match(html,/&lt;script&gt;/)
  assert.match(html,/value="&lt;script&gt;/)
  assert.doesNotMatch(html,/Enviar a revisión/)
})
