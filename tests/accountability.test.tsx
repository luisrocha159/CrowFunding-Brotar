import {test} from 'node:test'

import assert from 'node:assert/strict'

import {randomUUID} from 'node:crypto'

import {renderToStaticMarkup} from 'react-dom/server'

import {accountabilityFrom,accountabilityListFrom,reportDraft,type AccountabilityState} from '../src/features/campaign-progress/accountabilityClient'

import {AccountabilityDraftEditor} from '../src/features/campaign-progress/AccountabilityPage'

const id=randomUUID(),documentId=randomUUID(),file=randomUUID(),category=randomUUID(),today='2026-10-26'

const value={mode:'DEMO',campaign:{id,title:'DEMO Rendición del huerto',status:'IN_EXECUTION',currency:'BOB'},version:3,today,executionOn:'2026-10-01',funds:{disbursed:'100.30',spent:'80.10',returned:'0.00',pendingReturn:'20.20',available:'0.00'},categories:[{id:category,name:'Herramientas'}],budget:[],reports:[{id:randomUUID(),documentId,version:2,status:'DRAFT',isFinal:false,periodLabel:'Primer período',periodStart:'2026-10-01',periodEnd:today,narrative:'Descripción completa del período ejecutado.',varianceExplanation:'El remanente está pendiente de devolución.',fundsReceived:'100.30',fundsSpent:'80.10',balance:'20.20',currency:'BOB',submittedBy:null,reviewedBy:null,expenses:[{id:randomUUID(),budgetItemId:null,expenseCategoryId:category,description:'Herramientas para el huerto',amount:'80.10',spentOn:today,fileIds:[file]}]}],settlements:[{id:randomUUID(),amount:'20.20',currency:'BOB',status:'REQUESTED',requestedBy:id,requestFileId:file,requestedAt:'2026-10-26T12:00:00Z',authorizedBy:null,completedBy:null,completedAt:null,completionFileId:null}],history:[],totalHistory:0,totalReports:1,totalReturns:1,reportPage:1,returnPage:1,finalLocked:false,page:1,pageSize:20}

test('rendición cliente: importes exactos, estados y versiones validados; la solicitud no equivale a devolución completada',()=>{

 const state=accountabilityFrom(value);assert.equal(state.funds.returned,'0.00');assert.equal(state.funds.pendingReturn,'20.20');assert.equal(state.reports[0]!.expenses[0]!.amount,'80.10')

 for(const invalid of [null,{}, {...value,version:0},{...value,today:'2026-02-30'},{...value,funds:{...value.funds,disbursed:100.30}},{...value,settlements:[{...value.settlements[0],status:'PAID_REAL'}]},{...value,reports:[{...value.reports[0],expenses:[{...value.reports[0]!.expenses[0],fileIds:['public-url']}]}]}])assert.throws(()=>accountabilityFrom(invalid))

 assert.throws(()=>accountabilityListFrom({items:[]}));assert.equal(accountabilityListFrom({items:[value.campaign],page:1,pageSize:20,total:1}).total,1)

})

test('borrador guardado: edición conserva evidencia previa sin modificar la instantánea',()=>{

 const report=accountabilityFrom(value).reports[0]!,draft=reportDraft(report)

 assert.equal(draft.documentId,documentId);assert.deepEqual(draft.expenses[0]!.fileIds,[file]);draft.expenses[0]!.fileIds=[];assert.deepEqual(report.expenses[0]!.fileIds,[file]);assert.equal('id' in draft.expenses[0]!,false)

})

test('editor periódico: campos recuperados, evidencia privada, fechas reales y confirmación explícita',()=>{

 const data=accountabilityFrom(value),html=renderToStaticMarkup(<AccountabilityDraftEditor initial={reportDraft(data.reports[0]!)} data={data as AccountabilityState} save={async()=>{}} documentUrl={f=>`/private/${f}`} cancel={()=>{}}/>)

 assert.match(html,/Primer período/);assert.match(html,/80.10/);assert.match(html,new RegExp(`/private/${file}`));assert.match(html,/Desvincular evidencia/);assert.match(html,/type="date"/);assert.match(html,/min="2026-10-01"/);assert.match(html,/type="checkbox"/);assert.match(html,/Confirmo esta acción DEMO/);assert.match(html,/Guardar borrador y conservar versión anterior/)

})



test('rendición: páginas independientes conservan totales globales y navegación más allá de100',async()=>{

 const {AccountabilityPagination}=await import('../src/features/campaign-progress/AccountabilityPage')

 const data=accountabilityFrom({...value,totalReports:101,totalReturns:101,reportPage:6,returnPage:2,page:3,finalLocked:true})

 assert.equal(data.reportPage,6);assert.equal(data.returnPage,2);assert.equal(data.page,3);assert.equal(data.finalLocked,true)

 for(const patch of [{totalReports:-1},{reportPage:0},{returnPage:1.5},{finalLocked:undefined}])assert.throws(()=>accountabilityFrom({...value,...patch}))

 const first=renderToStaticMarkup(<AccountabilityPagination label="Páginas de informes" page={1} total={101} setPage={()=>{}}/>),last=renderToStaticMarkup(<AccountabilityPagination label="Páginas de devoluciones" page={6} total={101} setPage={()=>{}}/>)

 assert.match(first,/Páginas de informes/);assert.match(last,/Páginas de devoluciones/);assert.match(last,/Página 6/);assert.equal((first.match(/ disabled=""/g)??[]).length,1);assert.equal((last.match(/ disabled=""/g)??[]).length,1)

})





test('resumen público: tabla de comparación e indicadores, final acumulativo y HTML escapado',async()=>{

 const {publicAccountabilityFrom}=await import('../src/features/campaign-progress/publicAccountabilityClient');const {PublicAccountabilityCards}=await import('../src/features/campaign-progress/PublicAccountabilityPage')

 const report={reportId:randomUUID(),isFinal:true,periodLabel:'Informe final',periodStart:'2026-10-01',periodEnd:today,narrative:'<script>texto</script>',varianceExplanation:'Sin variaciones públicas.',fundsReceived:'100.30',fundsSpent:'80.10',balance:'-1.00',currency:'BOB',comparison:[{category:'Materiales',planned:'90.00',spent:'80.10'}],indicators:[{name:'Árboles plantados',unit:'unidades',expected:'100',achieved:'80'}],publishedAt:'2026-10-26 12:00:00+00'}

 const state=publicAccountabilityFrom({items:[report],total:1,page:1,pageSize:20}),html=renderToStaticMarkup(<PublicAccountabilityCards items={state.items}/>)

 assert.match(html,/No sumes/);assert.match(html,/Materiales/);assert.match(html,/Árboles plantados/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'))

 for(const patch of [{balance:'NaN'},{comparison:[{category:'Prueba',planned:'9.999',spent:'1.00'}]},{fileIds:[file]},{isFinal:'true'}])assert.throws(()=>publicAccountabilityFrom({items:[{...report,...patch}],total:1,page:1,pageSize:20}))

})

