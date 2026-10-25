import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {actualDate,closureData,closureText} from '../src/campaign-lifecycle/domain/closure'
import {CampaignClosure1792800000000} from '../src/shared/infrastructure/database/migrations/1792800000000-CampaignClosure'
const today='2026-10-24'
const form=()=>({periodStart:today,periodEnd:today,narrative:'DEMO Resultados completos del huerto Ñandú.',varianceExplanation:'No hubo diferencias respecto al presupuesto previsto.',expenses:[{budgetItemId:null,expenseCategoryId:randomUUID(),description:'Palas y herramientas para el huerto',amount:'10.25',spentOn:today,fileIds:[randomUUID()]}]})
test('cierre: reversión no destructiva explícita y consistente con el contrato de migraciones',async()=>{await assert.rejects(()=>new CampaignClosure1792800000000().down(),/no se revierte automáticamente/)})
test('cierre: períodos/gastos reales, importes exactos, evidencias y texto con Ñ',()=>{
 assert.deepEqual(closureData('SUBMIT_FINAL',form(),today).constructor,Object)
 for(const v of ['2026-02-29','2026-10-25','1999-01-01','',42,null])assert.throws(()=>actualDate(v,today))
 for(const v of [' '.repeat(30),'Texto invisible\u200b suficiente para pasar','<script>Texto no admitido</script>'])assert.throws(()=>closureText(v,20,500))
 for(const patch of [{amount:'0'},{amount:'1.005'},{amount:10},{spentOn:'2026-10-25'},{description:' '},{fileIds:[]},{budgetItemId:'other'}]){const f=form();assert.throws(()=>closureData('SUBMIT_FINAL',{...f,expenses:[{...f.expenses[0],...patch}]},today))}
 const f=form();assert.throws(()=>closureData('SUBMIT_FINAL',{...f,expenses:[f.expenses[0],f.expenses[0]]},today));assert.throws(()=>closureData('SUBMIT_FINAL',{...f,periodEnd:'2026-10-23'},today))
 assert.throws(()=>closureData('SUBMIT_FINAL',{...f,expenses:[{...f.expenses[0],fileIds:[f.expenses[0]!.fileIds[0],f.expenses[0]!.fileIds[0]]}]},today))
 assert.throws(()=>closureData('SUBMIT_FINAL',{...f,approved:true},today));assert.throws(()=>closureData('SUBMIT_FINAL',null,today))
})
test('cierre: acciones separadas, sin campos prestados de otras acciones',()=>{
 const id=randomUUID(),file=randomUUID()
 assert.deepEqual(closureData('FULFILL_REWARD',{contributionId:id,fulfilledOn:today,fileId:file},today),{contributionId:id,fulfilledOn:today,fileId:file})
 assert.deepEqual(closureData('APPROVE_FINAL',{reportId:id},today),{reportId:id})
 assert.deepEqual(closureData('RESOLVE_CLOSURE_CASE',{caseId:id},today),{caseId:id})
 for(const [action,value]of [['ANY',{}],['APPROVE_FINAL',{reportId:'x'}],['RESOLVE_CLOSURE_CASE',{caseId:id,refund:true}],['FULFILL_REWARD',{contributionId:id,fulfilledOn:'2027-01-01',fileId:file}]])assert.throws(()=>closureData(action as string,value,today))
})
