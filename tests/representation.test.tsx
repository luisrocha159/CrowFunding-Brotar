import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {renderToStaticMarkup} from 'react-dom/server'
import {parseRepresentation,parseRepresentationPage,validateRepresentationRequest,validateRepresentationAction,representationActions} from '../src/features/verifications/representationClient'
import {RepresentationRequestForm,RepresentationDetailCard} from '../src/features/verifications/RepresentationRequests'
const id='3cfd2859-d51b-4de0-aad2-e581e7ce1643',target='391f9400-aa1b-4f69-a580-a1ff0a76e320',stamp='2026-10-27T10:00:00.000Z',reason='Solicitud explícita de representación de ensayo.'
const summary={id,organizationId:id,organizationName:'DEMO <Huerto>',kind:'REPRESENTATIVE',targetUserId:target,targetName:'DEMO Destinatario',requestedBy:id,requesterName:'DEMO Propietario',status:'REQUESTED',version:1,requestedAt:stamp,acceptedAt:null,acceptedBy:null,decidedAt:null,decidedBy:null,reason,decisionReason:null,allowedActions:['ACCEPT','DECLINE']}
test('representación: contratos privados, fechas/versiones y páginas completas sin truncamiento',()=>{
 assert.equal(parseRepresentation({...summary,events:[]}).status,'REQUESTED')
 assert.equal(parseRepresentationPage({items:[summary],total:21,page:2,pageSize:20}).total,21)
 for(const patch of [{version:0},{status:'VERIFIED'},{acceptedAt:'fecha'},{allowedActions:['ESCALATE']},{allowedActions:['APPROVE']},{targetUserId:'correo@example.invalid'}])assert.throws(()=>parseRepresentation({...summary,...patch,events:[]}))
 assert.throws(()=>parseRepresentationPage({items:Array.from({length:21},()=>summary),total:21,page:1,pageSize:20}))
 assert.throws(()=>parseRepresentationPage({items:[],total:-1,page:1,pageSize:20}))
})
test('representación: motivo, destinatario y confirmación obligatorios por acción',()=>{
 const input={kind:'REPRESENTATIVE' as const,targetUserId:target,reason,confirmed:true}
 assert.deepEqual(validateRepresentationRequest(input),{})
 for(const patch of [{kind:'ADMIN'},{targetUserId:'no-uuid'},{reason:'corto'},{confirmed:false}])assert.ok(Object.keys(validateRepresentationRequest({...input,...patch})).length)
 assert.deepEqual(validateRepresentationAction({action:'ACCEPT',reason,confirmed:true}),{})
 assert.ok(Object.keys(validateRepresentationAction({action:'APPROVE',reason,confirmed:false})).length)
 assert.ok(Object.keys(validateRepresentationAction({action:'GRANT_ADMIN',reason,confirmed:true})).length)
})
test('representación: petición no equivale a acceso; aceptar y aprobar son acciones separadas',()=>{
 assert.deepEqual(representationActions(parseRepresentation({...summary,events:[]}),false),['ACCEPT','DECLINE'])
 const accepted=parseRepresentation({...summary,status:'ACCEPTED',version:2,acceptedAt:stamp,acceptedBy:target,allowedActions:['APPROVE','REJECT'],events:[]})
 assert.deepEqual(representationActions(accepted,true),['APPROVE','REJECT'])
 assert.deepEqual(representationActions(accepted,false),[])
 assert.deepEqual(representationActions(parseRepresentation({...summary,status:'APPROVED',version:3,acceptedAt:stamp,acceptedBy:target,decidedAt:stamp,decidedBy:target,allowedActions:[],events:[]}),true),[])
})
test('representación: interfaz separa consentimiento operativo de legal y solo ofrece acciones autorizadas',()=>{
 const form=renderToStaticMarkup(<RepresentationRequestForm organizationId={id} expectedVersion="0" onChanged={()=>{}}/>)
 assert.match(form,/Solicitar representación/);assert.match(form,/aceptación/);assert.match(form,/aprobación/);assert.match(form,/Identificador del destinatario/)
 const card=renderToStaticMarkup(<RepresentationDetailCard detail={parseRepresentation({...summary,events:[]})} administrative={false} busy={false} onAction={async()=>{}}/>)
 assert.match(card,/Aceptar propuesta/);assert.doesNotMatch(card,/Aprobar y aplicar/);assert.match(card,/&lt;Huerto&gt;/);assert.doesNotMatch(card,/<Huerto>/)
 const audit=renderToStaticMarkup(<RepresentationDetailCard detail={parseRepresentation({...summary,allowedActions:[],events:[]})} administrative busy={false} onAction={async()=>{}}/>)
 assert.doesNotMatch(audit,/Registrar decisión/)
})
test('representación: no ofrece ni valida transferencias o concesiones directas por membresía',async()=>{
 const {validateMembershipChange}=await import('../src/features/verifications/partyClient')
 for(const patch of [{action:'TRANSFER' as const,role:'MEMBER'},{action:'ADD' as const,role:'OWNER'},{action:'CHANGE' as const,role:'LEGAL_REPRESENTATIVE'}])assert.ok(Object.keys(validateMembershipChange({userId:target,reason,confirmed:true,...patch})).length)
})
