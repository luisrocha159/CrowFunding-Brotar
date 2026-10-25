import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {reviewDetailFrom,reviewPageFrom,reviewFailure} from '../src/features/verifications/reviewClient'
import {ReviewForm} from '../src/features/verifications/VerificationReviewPage'
const id='06ec727d-4664-45c9-b704-01880c7a8832'
const detail={id,typeName:'KYC DEMO',typeCode:'KYC_IDENTITY',organizationId:null,organizationName:null,status:'IN_REVIEW',updatedAt:'2026-10-23T12:00:00Z',version:'v1',resultNotes:null,rejectionReason:null,submittedAt:'2026-10-23T12:00:00Z',policy:null,fields:{},documents:[{fileId:id,documentTypeId:id,label:'Identidad sintética',originalName:'DEMO.pdf',reviewNotes:null,isValid:null}],history:[],revisions:[],subjectUserId:id,reviewedBy:null,reviewedAt:null}
test('revisión KYC frontend conserva contrato, fechas y propiedad sin interpretar fallos como listas vacías',()=>{
 assert.equal(reviewDetailFrom(detail).id,id)
 for(const patch of [{id:'not-an-id'},{reviewedAt:'not-date'},{subjectUserId:3},{reviewedBy:false}])assert.throws(()=>reviewDetailFrom({...detail,...patch}))
 assert.throws(()=>reviewPageFrom({items:[],total:'0',page:1,pageSize:20}))
 assert.doesNotMatch(reviewFailure(new Error('private secret')),/private secret/)
})
test('revisión KYC formulario exige motivo, elección, documentos y confirmación con controles accesibles',()=>{
 const html=renderToStaticMarkup(<ReviewForm detail={reviewDetailFrom(detail)} onSaved={()=>{}}/>)
 assert.match(html,/minLength="20"/i);assert.match(html,/maxLength="500"/i);assert.match(html,/type="checkbox"/)
 assert.match(html,/Revisé y acepto este documento sintético/);assert.match(html,/REQUIRES_INFO/);assert.match(html,/APPROVED/);assert.match(html,/disabled/)
 assert.doesNotMatch(html,/tarjeta|cuenta bancaria/i)
})
