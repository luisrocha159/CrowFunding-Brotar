import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { emptyFinanceFilters, financeMoney, financeQuery, financeReportFrom, type FinanceReport } from '../src/features/finance/financeClient'
import { FinanceResults } from '../src/features/finance/FinancePage'

const id='11111111-1111-4111-8111-111111111111'
const report: FinanceReport={items:[{kind:'PAYMENT',id,contributionId:id,reference:'BRT-C-00000001',campaignId:id,campaignTitle:'<script>Ñ</script>',sponsorId:id,
  createdAt:'2026-10-19T00:00:00.000Z',status:'DISPUTED',contributionStatus:'CONFIRMED',currencyCode:'BOB',amount:'0.30',feeAmount:'0.01',netAmount:'0.29',refundedAmount:'0.10',sandbox:true}],
  totals:[{currencyCode:'BOB',status:'DISPUTED',count:'1',amount:'0.30',feeAmount:'0.01',netAmount:'0.29',refundedAmount:'0.10'}],nextCursor:null}
test('S3-06 frontend: contrato estricto, IDs, estados, precisión, fechas y duplicados sin ocultar fallos',()=>{
  assert.deepEqual(financeReportFrom(report),report)
  assert.deepEqual(financeReportFrom({items:[],totals:[],nextCursor:null}),{items:[],totals:[],nextCursor:null})
  for (const value of [null,{}, {...report,nextCursor:'no'}, {...report,items:[report.items[0],report.items[0]]},
    {...report,items:[{...report.items[0],amount:0.30}]},{...report,items:[{...report.items[0],status:'COMPLETED'}]},
    {...report,items:[{...report.items[0],createdAt:'mañana'}]},{...report,totals:[{...report.totals[0],count:1}]}]) assert.throws(()=>financeReportFrom(value))
  assert.equal(financeMoney('9999999999999999.99','BOB'),'9.999.999.999.999.999,99 BOB')
  assert.equal(financeQuery({...emptyFinanceFilters,status:'PENDING',from:'2026-10-19'},id),`status=PENDING&from=2026-10-19&cursor=${id}`)
})
test('S3-06 frontend: resultados separan estados, moneda, entorno y datos escapados, sin tratar neto como saldo',()=>{
  const html=renderToStaticMarkup(<FinanceResults report={report} />)
  for (const text of ['En disputa','Confirmado','Proveedor sandbox','0,30 BOB','0,10 BOB','Neto del intento','no es saldo disponible','ID de patrocinador']) assert.ok(html.includes(text),text)
  assert.ok(html.includes('&lt;script&gt;Ñ&lt;/script&gt;'));assert.equal(html.includes('<script>'),false)
})
