import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
import {reviewDetailFrom,reviewPageFrom,reviewFailure} from '../src/features/verifications/reviewClient'
import {ReviewForm,VerificationSummary} from '../src/features/verifications/VerificationReviewPage'
const id='06ec727d-4664-45c9-b704-01880c7a8832'
const detail={id,typeName:'KYC DEMO',typeCode:'KYC_IDENTITY',organizationId:null,organizationName:null,status:'IN_REVIEW',updatedAt:'2026-10-23T12:00:00Z',version:'v1',resultNotes:null,rejectionReason:null,submittedAt:'2026-10-23T12:00:00Z',policy:null,fields:{},documents:[{fileId:id,documentTypeId:id,label:'Identidad sintética',originalName:'DEMO.pdf',reviewNotes:null,isValid:null}],history:[],revisions:[],subjectUserId:id,reviewedBy:null,reviewedAt:null}

test('resumen del expediente: etiquetas destacadas, datos separados y condiciones conservadas bajo detalle',()=>{
 const policy={version:'mvp-demo-1.1-20261109',treatmentNotice:'Aviso original de privacidad.',evidenceReference:'fixture',approvedBy:'equipo',approvedAt:'2026-11-09T00:00:00Z',fields:[{key:'demoName',label:'Nombre ficticio',required:true,maxLength:150},{key:'demoIdentifier',label:'Identificador ficticio',required:true,maxLength:150}],documents:[],requiresAcceptance:true}
 const value=reviewDetailFrom({...detail,typeName:'Verificación de identidad',submittedByEmail:'titular@example.invalid',policy,fields:{demoName:'Persona <script>',demoIdentifier:'Identificador 001'}})
 const html=renderToStaticMarkup(<MemoryRouter><VerificationSummary detail={value}/></MemoryRouter>)
 assert.match(html,/<dt><strong>Nombre<\/strong><\/dt>/);assert.match(html,/<dt><strong>Identificador<\/strong><\/dt>/)
 assert.match(html,/Persona &lt;script&gt;/);assert.match(html,/<details/);assert.match(html,/Aviso original de privacidad/)
 assert.doesNotMatch(html,/Nombre ficticio|Identificador ficticio/)
 assert.match(html,/<dt><strong>Cuenta remitente<\/strong><\/dt>/);assert.match(html,/titular@example.invalid/)
})
test('revisión KYC frontend conserva contrato, fechas y propiedad sin interpretar fallos como listas vacías',()=>{
 assert.equal(reviewDetailFrom(detail).id,id)
 for(const patch of [{id:'not-an-id'},{reviewedAt:'not-date'},{subjectUserId:3},{reviewedBy:false}])assert.throws(()=>reviewDetailFrom({...detail,...patch}))
 assert.throws(()=>reviewPageFrom({items:[],total:'0',page:1,pageSize:20}))
 assert.doesNotMatch(reviewFailure(new Error('private secret')),/private secret/)
 assert.throws(()=>reviewDetailFrom({...detail,submittedByEmail:42}))
 assert.throws(()=>reviewPageFrom({items:[{...detail,submittedByEmail:42}],total:1,page:1,pageSize:20}))
})
test('revisión KYC formulario exige motivo, elección, documentos y confirmación con controles accesibles',()=>{
 const html=renderToStaticMarkup(<ReviewForm detail={reviewDetailFrom(detail)} onSaved={()=>{}}/>)
 assert.match(html,/minLength="20"/i);assert.match(html,/maxLength="500"/i);assert.match(html,/type="checkbox"/)
 assert.match(html,/Revisé y acepto este documento/);assert.match(html,/REQUIRES_INFO/);assert.match(html,/APPROVED/);assert.match(html,/disabled/)
 assert.doesNotMatch(html,/de prueba|sintético|ficticio/i)
 assert.doesNotMatch(html,/tarjeta|cuenta bancaria/i)
})
