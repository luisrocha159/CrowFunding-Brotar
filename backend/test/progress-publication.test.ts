import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as progress from '../src/campaign-progress/domain/progress'
const validators = progress as unknown as { validatePublicationChange: (input: unknown) => Record<string,string>; validateRewardChange: (input: unknown) => Record<string,string> }
const id='00000000-0000-4000-8000-000000000001'
const correction={action:'CORRECT',revision:'v1',reason:'Corregimos el nombre del resultado.',confirmed:true,title:'Título corregido',body:'Contenido corregido de la novedad publicada.',milestoneId:null,images:[{fileId:id,caption:'Evidencia original'}]}
test('corrección publicada requiere versión, motivo, confirmación y campos de texto válidos',()=>{
 assert.equal(typeof validators.validatePublicationChange,'function')
 assert.deepEqual(validators.validatePublicationChange(correction),{})
 for(const invalid of [{...correction,confirmed:false},{...correction,revision:null},{...correction,reason:'x'},{...correction,body:'<script>contenido inseguro</script>'},{...correction,images:[null]},{...correction,images:[...correction.images,...correction.images]},{...correction,unexpected:true},null])assert.ok(Object.keys(validators.validatePublicationChange(invalid)).length)
})
test('retiro exige confirmación y rechaza reemplazo oculto de contenido',()=>{
 assert.deepEqual(validators.validatePublicationChange({action:'WITHDRAW',revision:'v2',reason:'Se retiró por información incorrecta.',confirmed:true}),{})
 assert.ok(Object.keys(validators.validatePublicationChange({...correction,action:'WITHDRAW'})).length)
})
test('recompensas validan estados, fechas reales y evidencia obligatoria al cumplir',()=>{
 assert.equal(typeof validators.validateRewardChange,'function')
 const input={revision:'r1',status:'IN_PROGRESS',reason:'Preparación del reconocimiento acordado.',confirmed:true,fulfilledOn:null,fileId:null}
 assert.deepEqual(validators.validateRewardChange(input),{})
 const fulfilled={...input,status:'FULFILLED',fulfilledOn:'2026-01-01',fileId:id}
 assert.deepEqual(validators.validateRewardChange(fulfilled),{})
 for(const invalid of [{...fulfilled,fulfilledOn:'2026-02-30'},{...fulfilled,fileId:null},{...fulfilled,fulfilledOn:'2999-01-01'},{...input,fileId:id},{...input,status:'SHIPPED'},{...input,confirmed:false},{...input,reason:'<p>motivo incorrecto</p>'},null])assert.ok(Object.keys(validators.validateRewardChange(invalid)).length)
})
