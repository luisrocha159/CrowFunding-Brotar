import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {OperationForm} from '../src/features/campaign-lifecycle/OperationForm'
import {cycleFrom,cycleOptions,cyclePageFrom,operationReasonError,operationalRequest,operationFailure} from '../src/features/campaign-lifecycle/cycleClient'
import {mapPublicCampaign} from '../src/features/public/campaignsApi'
import {SessionError} from '../src/shared/api/sessionError'
const id='11111111-1111-4111-8111-111111111111'
const value={mode:'DEMO',id,title:'DEMO Huerto',status:'FUNDING_ENDED',endsAt:'2026-10-23T00:00:00Z',outcome:'EXECUTION_ELIGIBLE',version:2,currencyCode:'BOB',goalAmount:'100.00',fundingTotal:'100.00',cancelRequested:false,cancelReason:null,cancellationCaseId:null,executionStartedAt:null,funds:{confirmed:'100.00',refunded:'0.00',refunds_reserved:'0.00',committed:'0.00',disbursed:'0.00',disputed:'0.00'},obligations:{payments:0,disputes:0,cases:0,reconciliation:0,events:0},closeBlockers:['Falta rendición final'],events:[],eventTotal:0,page:1,pageSize:20}
test('ciclo cliente: contrato comprobado, error no equivale a estado vacío',()=>{
 assert.equal(cycleFrom(value).version,2)
 for(const bad of [null,{}, {...value,version:0},{...value,funds:{confirmed:'NaN'}},{...value,outcome:'SUCCESS_REAL'},{...value,events:[{}]},{...value,obligations:{payments:-1}}])assert.throws(()=>cycleFrom(bad),SessionError)
 assert.equal(cyclePageFrom({mode:'DEMO',items:[value],total:1,page:1,pageSize:20}).total,1)
 assert.throws(()=>cyclePageFrom({items:[]}),SessionError)
})
test('ciclo cliente: opciones dependen del estado, cancelación y condiciones reales',()=>{
 assert.deepEqual(cycleOptions(cycleFrom(value),true),['START_EXECUTION'])
 assert.deepEqual(cycleOptions(cycleFrom({...value,cancelRequested:true,cancelReason:'DEMO Cancelar'}),true),['REJECT_CANCEL','APPROVE_CANCEL'])
 assert.deepEqual(cycleOptions(cycleFrom({...value,status:'IN_EXECUTION',closeBlockers:[]}),true),['CLOSE'])
 assert.deepEqual(cycleOptions(cycleFrom({...value,status:'CLOSED'}),false),[])
 assert.notEqual(operationReasonError(' '.repeat(30)),null);assert.equal(operationReasonError('Motivo de prueba válido y explícito'),null);assert.notEqual(operationReasonError('Motivo con invisible\u200b para probar'),null)
})
test('formulario operativo: confirmación previa, límites, obligatorios y acción explícita',()=>{
 const html=renderToStaticMarkup(createElement(OperationForm,{title:'Ciclo DEMO',options:{END_FUNDING:'Finalizar recaudación'},onSave:async()=>{}}))
 for(const text of ['sin dinero real','minLength="20"','maxLength="500"','aria-label="obligatorio"','disabled=""','Selecciona una acción'])assert.ok(html.includes(text))
})
test('operación HTTP: muestra conflicto comprobado, no éxito ficticio ni error técnico crudo',async()=>{
 const old=globalThis.fetch
 try{globalThis.fetch=(async()=>Response.json({message:'Hay una disputa pendiente.'},{status:409})) as typeof fetch
  try{await operationalRequest('admin/campaign-cycle/x/actions','POST',{})}catch(e){assert.equal(operationFailure(e),'Hay una disputa pendiente.')}
  globalThis.fetch=(async()=>Response.json({message:'consulta SQL secreta'},{status:500})) as typeof fetch
  try{await operationalRequest('x')}catch(e){assert.ok(!operationFailure(e).includes('SQL'))}
 }finally{globalThis.fetch=old}
})
test('campaña pública conserva historia después de finalizar y no la presenta activa',()=>{
 const c={id,slug:'demo',name:'DEMO',summary:'Ejemplo',category:'Ambiente',location:'La Paz',creator:'DEMO',campaignType:'DONATION',status:'CLOSED',goal:'100.00',raised:'0.00',currencyCode:'BOB',publishedAt:'2026-10-01T00:00:00Z',endsAt:'2026-10-23T00:00:00Z',imageId:id,imageAlt:'Ejemplo',description:'',problem:'',solution:'',beneficiaries:'',expectedResults:'',creatorDescription:'',impact:[],rewards:[]}
 assert.equal(mapPublicCampaign(c).status,'finished');assert.equal(mapPublicCampaign({...c,status:'CANCELLED'}).status,'cancelled');assert.throws(()=>mapPublicCampaign({...c,status:'DRAFT'}),SessionError)
})
