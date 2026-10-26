import assert from 'node:assert/strict'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
import {DashboardCards} from '../src/features/campaign-progress/AdministrativeDashboardPage'
import {dashboardFrom} from '../src/features/campaign-progress/dashboardClient'
const finance={paymentsTotal:4,paymentsPending:1,paymentsOverdue:1,paymentsNeedingReview:1,reconciliationOpen:1,reconciliationUnresolved:2,disbursementsPending:1,disbursementsApproved:0,disbursementsProcessing:0,refundsRequested:0,refundsProcessing:1}
const base={readOnly:true,asOf:'2026-10-25T20:00:00.000Z'}
test('resumen: rechaza datos parciales, negativos, decimales y fecha inválida sin convertirlos en cero',()=>{
  assert.deepEqual(dashboardFrom({...base,financeAlerts:finance}),{...base,financeAlerts:finance})
  for(const value of [{...base,asOf:'hoy'},{...base,financeAlerts:{}},{...base,financeAlerts:{...finance,paymentsPending:-1}},{...base,financeAlerts:{...finance,paymentsPending:1.5}},{...base,financeAlerts:{...finance,paymentsTotal:'4'}},{...base,disputeAlerts:{open:0}},{...base,campaigns:[{status:'DRAFT',count:-1}]}])assert.throws(()=>dashboardFrom(value))
})
test('resumen: enlaces financieros, disputas por responsabilidad, consulta fechada y auditor sin controles de escritura',()=>{
  const html=renderToStaticMarkup(<MemoryRouter><DashboardCards data={{...base,financeAlerts:finance}} can={()=>false}/></MemoryRouter>)
  for(const path of ['/administracion/finanzas','/administracion/conciliacion','/administracion/desembolsos?status=PENDING','/administracion/devoluciones?status=REQUESTED'])assert.ok(html.includes(path))
  assert.match(html,/Modo auditor/);assert.match(html,/Consultado/);assert.doesNotMatch(html,/administracion\/disputas|<form|<button|autorizar.*button/i)
  const support=renderToStaticMarkup(<MemoryRouter><DashboardCards data={{...base,readOnly:false,disputeAlerts:{open:2,awaitingResponse:1,escalated:1}}} can={()=>false}/></MemoryRouter>)
  assert.match(support,/administracion\/disputas\?status=ESCALATED/);assert.doesNotMatch(support,/administracion\/finanzas|administracion\/desembolsos/)
})
