import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {finalErrors,closureFrom,closureListFrom,type FinalForm} from '../src/features/campaign-lifecycle/closureClient'
test('rendición final: errores por campo, fechas, blancos, monto exacto y evidencia',()=>{
 const f:FinalForm={periodStart:'2026-10-24',periodEnd:'2026-10-24',narrative:'Resultados del huerto Ñandú completamente descritos.',varianceExplanation:'Sin diferencias en el presupuesto planificado.',expenses:[{budgetItemId:null,expenseCategoryId:randomUUID(),description:'Herramientas necesarias para el huerto',amount:'10.25',spentOn:'2026-10-24',fileIds:[randomUUID()]}]}
 assert.deepEqual(finalErrors(f,'2026-10-24','10.25'),{})
 assert.ok(finalErrors({...f,narrative:' '.repeat(30)},'2026-10-24','10.25').narrative)
 assert.ok(finalErrors({...f,periodEnd:'2026-02-29'},'2026-10-24','10.25').periodEnd)
 assert.ok(finalErrors(f,'2026-10-24','10.26').total)
 assert.ok(finalErrors({...f,expenses:[{...f.expenses[0]!,amount:'1e2',fileIds:[]}]},'2026-10-24','10.25')['amount.0'])
 assert.ok(finalErrors({...f,expenses:[f.expenses[0]!,f.expenses[0]!]},'2026-10-24','20.50')['fileIds.1'])
 assert.ok(finalErrors({...f,expenses:[{...f.expenses[0]!,fileIds:[f.expenses[0]!.fileIds[0]!,f.expenses[0]!.fileIds[0]!]}]},'2026-10-24','10.25')['fileIds.0'])
})
test('contrato de cierre no convierte respuestas incompletas en éxito',()=>{
 assert.throws(()=>closureFrom({mode:'DEMO',status:'CLOSED'}));assert.throws(()=>closureListFrom({items:[]}))
 assert.deepEqual(closureListFrom({mode:'DEMO',items:[],total:0,page:1,pageSize:20}).items,[])
})
