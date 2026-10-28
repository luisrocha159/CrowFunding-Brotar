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

test('cierre: importe adicional exacto conserva capacidad independiente de los períodos aprobados',async()=>{
 const {additionalFinalAmount}=await import('../src/features/campaign-lifecycle/closureClient')
 assert.equal(additionalFinalAmount('13.00','12.00'),'1.00');assert.equal(additionalFinalAmount('100.30','80.10'),'20.20');assert.equal(additionalFinalAmount('80.10','80.10'),'0.00');assert.equal(additionalFinalAmount('80.10','80.11'),null)
})

test('formulario final: 120 aprobados quedan por referencia y solo se edita el gasto adicional',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server'),{MemoryRouter}=await import('react-router-dom'),{FinalReportForm}=await import('../src/features/campaign-lifecycle/ClosurePage')
 const {createElement}=await import('react')
 const d={id:randomUUID(),today:'2026-10-26',executionOn:'2026-10-01',currencyCode:'BOB',funds:{disbursed:'13.00'},settlement:{completed:'0.00',pending:'0.00',requiredSpent:'13.00'},periodicSummary:{count:120,spent:'12.00',revision:'a'.repeat(32)},periodicExpenses:[],budget:[],categories:[]} as unknown as import('../src/features/campaign-lifecycle/closureClient').ClosureDetail
 const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(FinalReportForm,{d,save:async()=>{}})))
 assert.match(html,/120 gastos periódicos aprobados/);assert.match(html,/100 gastos adicionales por 1.00/);assert.equal((html.match(/<legend>/g)??[]).length,1);assert.match(html,/Gasto adicional/);assert.doesNotMatch(html,/Gasto 120/)
})
