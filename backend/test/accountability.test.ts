import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {accountabilityData,settlementAvailable} from '../src/accountability/domain/accountability'
const today='2026-10-26'
const form=()=>({documentId:randomUUID(),periodLabel:'Octubre: primer período',periodStart:'2026-10-01',periodEnd:today,narrative:'Resultados documentados del proyecto durante octubre.',varianceExplanation:'Sin variaciones respecto al presupuesto previsto.',expenses:[{budgetItemId:null,expenseCategoryId:randomUUID(),description:'Herramientas del proyecto',amount:'0.10',spentOn:'2026-10-12',fileIds:[randomUUID()]}]})
test('rendición periódica: exactitud, fechas, documentos y campos autorizados',()=>{
 const input=form();assert.equal(accountabilityData('SAVE_DRAFT',input,today).periodLabel,input.periodLabel)
 for(const patch of [{periodStart:'2026-02-30'},{periodEnd:'2026-10-27'},{periodEnd:'2026-09-30'},{fundsReceived:'999'},{periodLabel:'<h1>ensayo</h1>'}])assert.throws(()=>accountabilityData('SAVE_DRAFT',{...input,...patch},today))
 for(const patch of [{amount:0.1},{amount:'0.001'},{currency:'USD'},{spentOn:'2026-09-30'},{fileIds:[input.expenses[0]!.fileIds[0],input.expenses[0]!.fileIds[0]]}])assert.throws(()=>accountabilityData('SAVE_DRAFT',{...input,expenses:[{...input.expenses[0],...patch}]},today))
 assert.doesNotThrow(()=>accountabilityData('SAVE_DRAFT',{...input,expenses:[{...input.expenses[0],fileIds:[]}]},today),'Un borrador puede quedar pendiente de adjuntar evidencia')
})
test('liquidación: exacta, sin balance negativo ni doble reserva',()=>{
 assert.equal(settlementAvailable('100.30','80.10','10.10','0.10'),'10.00')
 assert.throws(()=>settlementAvailable('100','100','0.01','0'))
 const request={settlementId:randomUUID(),amount:'10.00',fileId:randomUUID()}
 assert.deepEqual(accountabilityData('REQUEST_RETURN',request,today),request)
 for(const patch of [{amount:'0'},{amount:'1e2'},{amount:10},{refund:true}])assert.throws(()=>accountabilityData('REQUEST_RETURN',{...request,...patch},today))
 assert.throws(()=>accountabilityData('COMPLETE_RETURN',{settlementId:request.settlementId},today))
})

test('cierre acumulativo: conserva gastos aprobados exactos y no convierte históricos incompletos en cero',async()=>{
 const {assertCumulativeFinal,periodicSpent}=await import('../src/accountability/infrastructure/accountability-integrity')
 const expense={budgetItemId:null,expenseCategoryId:randomUUID(),description:'Herramientas periódicas aprobadas',amount:'0.10',spentOn:'2026-10-12',fileIds:[randomUUID()]}
 const report={id:randomUUID(),status:'APPROVED',start:'2026-10-01',finish:today}
 const manager=(responses:unknown[][])=>({query:async()=>responses.shift()!}) as unknown as import('typeorm').EntityManager
 const input={periodStart:'2026-10-01',periodEnd:today,narrative:'Conclusión acumulativa con evidencia aprobada.',varianceExplanation:'El remanente se liquidó de forma independiente.',expenses:[{...expense,amount:'0.1'}]}
 await assertCumulativeFinal(manager([[{incomplete:0,spent:'0.10'}],[report],[expense]]),randomUUID(),input)
 await assert.rejects(()=>assertCumulativeFinal(manager([[{incomplete:0,spent:'0.10'}],[report],[expense]]),randomUUID(),{...input,expenses:[]}),/Conserva cada gasto/)
 await assert.rejects(()=>assertCumulativeFinal(manager([[{incomplete:0,spent:'0.10'}],[{...report,status:'SUBMITTED'}]]),randomUUID(),input),/Aprueba las rendiciones/)
 await assert.rejects(()=>periodicSpent(manager([[{incomplete:1,spent:'0.00'}]]),randomUUID()),/no se considera saldo cero/)
})

test('cierre por referencia: 120 gastos aprobados conservan identidades y dejan capacidad para 100 adicionales',async()=>{
 const {assertCumulativeFinal}=await import('../src/accountability/infrastructure/accountability-integrity')
 const {closureData}=await import('../src/campaign-lifecycle/domain/closure')
 const revision='a'.repeat(32),source=Array.from({length:120},()=>({sourceExpenseId:randomUUID(),budgetItemId:null,expenseCategoryId:randomUUID(),description:'Gasto periódico aprobado con evidencia',amount:'0.10',spentOn:today,fileIds:[randomUUID()]})),additional={budgetItemId:null,expenseCategoryId:randomUUID(),description:'Último gasto adicional del proyecto',amount:'1.00',spentOn:today,fileIds:[randomUUID()]}
 const input={periodStart:'2026-10-01',periodEnd:today,narrative:'Conclusión acumulativa con evidencia aprobada.',varianceExplanation:'Se incluyen los períodos por referencia explícita.',includeApprovedPeriodic:true as const,periodicRevision:revision,expenses:[additional]}
 const manager=(responses:unknown[][])=>({query:async()=>responses.shift()!}) as unknown as import('typeorm').EntityManager
 assert.doesNotThrow(()=>closureData('SUBMIT_FINAL',input,today))
 const expanded=await assertCumulativeFinal(manager([[{incomplete:0,spent:'12.00'}],[{status:'APPROVED',start:'2026-10-01',finish:today}],[{revision,count:120,spent:'12.00'}],source]),randomUUID(),input)
 assert.equal(expanded.expenses.length,121);assert.deepEqual(expanded.expenses.slice(0,120).map(e=>e.sourceExpenseId),source.map(e=>e.sourceExpenseId));assert.equal(expanded.expenses.reduce((sum,e)=>sum+BigInt(e.amount.replace('.','')),0n),1300n)
 await assert.rejects(()=>assertCumulativeFinal(manager([[{incomplete:0,spent:'12.00'}],[{status:'APPROVED',start:'2026-10-01',finish:today}],[{revision:'b'.repeat(32)}]]),randomUUID(),input),/referencia de gastos periódicos cambió/)
 await assert.rejects(()=>assertCumulativeFinal(manager([[{incomplete:0,spent:'12.00'}],[{status:'APPROVED',start:'2026-10-01',finish:today}],[{revision}],source]),randomUUID(),{...input,expenses:[{...additional,fileIds:source[0]!.fileIds}]}),/no lo presentes otra vez/)
 assert.throws(()=>closureData('SUBMIT_FINAL',{...input,expenses:Array.from({length:101},()=>({...additional,fileIds:[randomUUID()]}))},today),/100 gastos adicionales/)
 assert.throws(()=>closureData('SUBMIT_FINAL',{...input,includeApprovedPeriodic:false},today))
})
