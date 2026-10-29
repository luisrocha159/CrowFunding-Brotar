import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import type { OperationsReport } from '../src/finance/infrastructure/financial-operations'
import { readTestDatabaseTarget } from './database-target'

test('S3-06 PostgreSQL/HTTP: consulta, filtros UTC, totales exactos, páginas, CSV privado y permisos revocados', {timeout:120000},async()=>{
  const config=readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
  const {container}=readTestDatabaseTarget(config)
  const sql=(query: string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:query,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim()
  const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1')
  const base=await app.getUrl(),suffix=randomUUID(),providerId=randomUUID(),campaignId=randomUUID(),usdCampaign=randomUUID(),bulkCampaign=randomUUID()
  const users: string[]=[], password=randomBytes(24).toString('hex')
  let addedUsd=false
  // execFileSync bloquea el loop durante las cargas SQL: no reutilizar un socket HTTP que pudo vencer durante esa pausa.
  const call=(path: string,cookie='',body?: unknown)=>fetch(`${base}/api/${path}`,{method:body===undefined?'GET':'POST',headers:{Connection:'close',Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173'},...(body===undefined?{}:{body:JSON.stringify(body)})})
  async function account(role: string) {
    const email=`finance-${role.toLowerCase()}-${suffix}@example.invalid`
    const response=await call('auth/register','',{ legalVersion:'mvp-demo-legal-1.0-20261028',firstName:'Ensayo',lastName:'Finanzas',email,password,demoConsent:true});assert.equal(response.status,201)
    const {id}=await response.json() as {id:string};users.push(id)
    if (role!=='REGISTERED_USER') sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}'`)
    const login=await call('auth/login','',{email,password});assert.equal(login.status,200)
    return {id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}
  }
  try {
    if (sql("SELECT count(*) FROM currency WHERE code='USD'")==='0') {
      sql("INSERT INTO currency(code,name,symbol) VALUES('USD','Moneda sintética de integración','USD')");addedUsd=true
    }
    const owner=await account('REGISTERED_USER'),finance=await account('FINANCE'),admin=await account('ADMIN'),auditor=await account('AUDITOR'),reviewer=await account('REVIEWER')
    const path='admin/finance/payments'
    for (const route of [path,`${path}/export`]) {
      assert.equal((await call(route)).status,401)
      for (const user of [owner,reviewer]) assert.equal((await call(route,user.cookie)).status,403)
      for (const user of [finance,admin,auditor]) assert.equal((await call(route,user.cookie)).status,200)
    }
    sql(`INSERT INTO payment_provider(id,code,name,is_sandbox) VALUES('${providerId}','finance-${suffix}','Proveedor de ensayo financiero',true);
      INSERT INTO campaign(id,slug,title,campaign_type,creator_user_id,status,currency_code) VALUES
      ('${campaignId}','finance-${suffix}','=HYPERLINK("no-ejecutar")','DONATION','${owner.id}','DRAFT','BOB'),
      ('${usdCampaign}','finance-usd-${suffix}','Otra moneda','DONATION','${owner.id}','DRAFT','USD'),
      ('${bulkCampaign}','finance-bulk-${suffix}','Carga de reporte','DONATION','${owner.id}','DRAFT','BOB');`)
    const ids: string[]=[],contributions: string[]=[]
    for (const [status,amount,campaign,currency] of [
      ['CONFIRMED','0.10',campaignId,'BOB'],['CONFIRMED','0.20',campaignId,'BOB'],['PENDING','88.00',campaignId,'BOB'],
      ['FAILED','99.00',campaignId,'BOB'],['EXPIRED','77.00',campaignId,'BOB'],['DISPUTED','0.40',campaignId,'BOB'],['CONFIRMED','10.00',usdCampaign,'USD'],
      ['REFUNDED','0.60',campaignId,'BOB'],['INITIATED','0.70',campaignId,'BOB']]) {
      const id=randomUUID(),contributionId=randomUUID();ids.push(id);contributions.push(contributionId)
      const confirmed=['CONFIRMED','DISPUTED','REFUNDED'].includes(status!)
      const day=currency==='USD'?'2026-01-02T00:00:00Z':'2026-01-01T23:59:59.999999Z'
      sql(`INSERT INTO contribution(id,campaign_id,user_id,amount,currency_code,status,created_at)
        VALUES('${contributionId}','${campaign}','${owner.id}',${amount},'${currency}','${status==='REFUNDED'?'REFUNDED':confirmed?'CONFIRMED':'PENDING'}','${day}');
        INSERT INTO payment(id,contribution_id,provider_id,idempotency_key,external_reference,amount,currency_code,status,confirmed_at,created_at,provider_payload,fee_amount)
        VALUES('${id}','${contributionId}','${providerId}','${randomUUID()}','private-reference-${id}',${amount},'${currency}','${status}',${confirmed?`'${day}'`:'NULL'},'${day}','{"private":"never-export-me"}',${amount==='0.20'?'0.01':'0'});`)
    }
    sql(`INSERT INTO refund(payment_id,contribution_id,amount,currency_code,status) VALUES
      ('${ids[0]}','${contributions[0]}',0.05,'BOB','REFUNDED'),('${ids[0]}','${contributions[0]}',0.03,'BOB','REQUESTED');`)
    const response=await call(`${path}?campaignId=${campaignId}&limit=2`,finance.cookie)
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
    const report=await response.json() as OperationsReport
    assert.equal(report.items.length,2);assert.ok(report.nextCursor)
    const total=report.totals.find(row=>row.status==='CONFIRMED')!
    assert.equal(total.amount,'0.30');assert.equal(total.count,'2');assert.equal(total.refundedAmount,'0.05');assert.equal(total.netAmount,'0.29');assert.equal(total.feeAmount,'0.01')
    assert.ok(report.totals.every(row=>row.currencyCode==='BOB'))
    const found=report.items.map(row=>row.id);let cursor: string | null=report.nextCursor
    while (cursor) {
      const page=await (await call(`${path}?campaignId=${campaignId}&limit=2&cursor=${cursor}`,finance.cookie)).json() as OperationsReport
      assert.deepEqual(page.totals,report.totals);found.push(...page.items.map(row=>row.id));cursor=page.nextCursor
      assert.ok(found.length<=8)
    }
    assert.equal(found.length,8);assert.equal(new Set(found).size,8)
    assert.equal(new Set(report.totals.map(row=>row.status)).size,7,'Los siete estados oficiales se distinguen sin inventar COMPLETED.')
    const byDate=await (await call(`${path}?from=2026-01-01&to=2026-01-01`,admin.cookie)).json() as OperationsReport
    assert.equal(byDate.items.length,8,'La fecha final incluye el último microsegundo UTC, no el día posterior.')
    const both=await (await call(`${path}?status=CONFIRMED`,finance.cookie)).json() as OperationsReport
    assert.deepEqual(both.totals.map(row=>[row.currencyCode,row.amount]),[['BOB','0.30'],['USD','10.00']])
    const zero=await (await call(`${path}?campaignId=${randomUUID()}`,finance.cookie)).json()
    assert.deepEqual(zero,{items:[],totals:[],nextCursor:null})
    for (const query of ['from=2026-02-29','to=2026-04-31','from=2026-02-01&to=2026-01-01','limit=51','limit=1&limit=2','status=COMPLETED','campaignId=no','userId='+owner.id,'cursor='+randomUUID()]) {
      assert.equal((await call(`${path}?${query}`,finance.cookie)).status,400,query)
    }
    for (const query of ['from=2026-02-29','limit=2','cursor='+ids[0]]) assert.equal((await call(`${path}/export?${query}`,finance.cookie)).status,400)
    const exported=await call(`${path}/export?campaignId=${campaignId}`,auditor.cookie)
    assert.equal(exported.status,200);assert.match(exported.headers.get('content-type')!,/^text\/csv/)
    assert.match(exported.headers.get('content-disposition')!,/attachment/);assert.equal(exported.headers.get('cache-control'),'no-store')
    const csv=await exported.text()
    assert.ok(csv.includes('"\'=HYPERLINK(""no-ejecutar"")"'));assert.ok(csv.includes('"0.10"'));assert.ok(csv.includes('patrocinador_id'))
    for (const secret of ['never-export-me','private-reference','password','@example.invalid','provider_payload']) assert.equal(csv.includes(secret),false,secret)
    assert.equal(csv.split('\r\n').filter(Boolean).length,9,'Exporta todo el filtro, no solo dos filas de la página.')
    assert.deepEqual(Object.keys(report.items[0]!).sort(),['kind','id','contributionId','reference','campaignId','campaignTitle','sponsorId','createdAt','status','contributionStatus','currencyCode','amount','feeAmount','netAmount','refundedAmount','sandbox'].sort())
    sql(`WITH inserted AS (INSERT INTO contribution(campaign_id,user_id,amount,currency_code)
      SELECT '${bulkCampaign}','${owner.id}',0.01,'BOB' FROM generate_series(1,5001) RETURNING id)
      INSERT INTO payment(contribution_id,provider_id,idempotency_key,amount,currency_code)
      SELECT id,'${providerId}',gen_random_uuid()::text,0.01,'BOB' FROM inserted;`)
    const tooLarge=await call(`${path}/export?campaignId=${bulkCampaign}`,finance.cookie)
    assert.equal(tooLarge.status,413);assert.match(tooLarge.headers.get('content-type')!,/application\/json/)
    sql(`DELETE FROM payment WHERE id=(SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${bulkCampaign}' LIMIT 1)`)
    const full=await call(`${path}/export?campaignId=${bulkCampaign}`,finance.cookie);assert.equal(full.status,200)
    assert.equal((await full.text()).split('\r\n').filter(Boolean).length,5001,'5000 pagos caben exactamente, más cabecera.')
    sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${finance.id}' AND role_id=(SELECT id FROM role WHERE code='FINANCE')`)
    for (const route of [path,`${path}/export`]) assert.equal((await call(route,finance.cookie)).status,403)
    assert.equal((await call(path,auditor.cookie,{status:'CONFIRMED'})).status,404,'La consulta no expone escrituras financieras.')
    assert.equal(sql(`SELECT status FROM payment WHERE id='${ids[2]}'`),'PENDING')
  } finally {
    await app.close()
    const campaigns=`'${campaignId}','${usdCampaign}','${bulkCampaign}'`
    sql(`DELETE FROM refund WHERE contribution_id IN (SELECT id FROM contribution WHERE campaign_id IN (${campaigns}));
      DELETE FROM payment WHERE contribution_id IN (SELECT id FROM contribution WHERE campaign_id IN (${campaigns}));
      DELETE FROM contribution WHERE campaign_id IN (${campaigns});DELETE FROM campaign WHERE id IN (${campaigns});
      DELETE FROM payment_provider WHERE id='${providerId}';${users.map(id=>`DELETE FROM app_user WHERE id='${id}';`).join('\n')}`)
    if (addedUsd) sql("DELETE FROM currency WHERE code='USD'")
  }
})
