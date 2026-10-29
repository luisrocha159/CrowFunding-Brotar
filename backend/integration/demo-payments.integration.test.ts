import 'reflect-metadata'
import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { DatabaseService } from '../src/shared/infrastructure/database/database.service'
import { DemoReconciliation } from '../src/demo-payments/infrastructure/demo-reconciliation'
import { readTestDatabaseTarget } from './database-target'

interface Checkout { contribution: {id: string;paymentId: string;status: string};ticket: {amount: string;payable: boolean;qrPayload: string} }
interface Batch {id: string;status: string;totalInternal: string;totalProvider: string;difference: string;currencyCode: string;createdBy: string;closedBy: string|null;
  items: {id: string;paymentId: string|null;status: string;originalStatus: string;resolution: string|null;compensationAmount: string|null;resolvedBy: string|null;internalReference: string|null}[]}

test('S3-01/02/07 PostgreSQL/HTTP: checkout DEMO, idempotencia, privacidad, expiración, conciliación y compensación sin doble ingreso', {timeout:180000},async()=>{
  const config=readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
  const {container}=readTestDatabaseTarget(config)
  const sql=(query: string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:query,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim()
  const previousFlag=process.env.DEMO_PAYMENTS_ENABLED;process.env.DEMO_PAYMENTS_ENABLED='true'
  const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1')
  const base=await app.getUrl(),suffix=randomUUID(),campaignId=randomUUID(),rewardCampaign=randomUUID(),rewardId=randomUUID()
  const users: string[]=[],password=randomBytes(24).toString('hex')
  const call=(path: string,cookie='',body?: unknown,extraHeaders: Record<string,string>={})=>fetch(`${base}/api/${path}`,{
    method:body===undefined?'GET':'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',...extraHeaders},
    ...(body===undefined?{}:{body:JSON.stringify(body)})})
  const account=async(role: string)=>{
    const email=`demo-${role.toLowerCase()}-${suffix}@example.invalid`
    const registered=await call('auth/register','',{ legalVersion:'mvp-demo-legal-1.0-20261028',firstName:'Prueba',lastName:'Simulador',email,password,demoConsent:true});assert.equal(registered.status,201)
    const {id}=await registered.json() as {id: string};users.push(id)
    if (role!=='REGISTERED_USER') sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`)
    const login=await call('auth/login','',{email,password});assert.equal(login.status,200)
    return {id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}
  }
  const clearBudget=()=>{
    const hashes=[...users.map(id=>`account:${id}`),'ip:127.0.0.1'].map(key=>createHash('sha256').update(`demo-payments:v1:${key}`).digest('hex'))
    sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN (${hashes.map(h=>`'${h}'`).join(',')});`)
  }
  const providerId=sql("SELECT id FROM payment_provider WHERE code='BROTAR_INTERNAL_DEMO'")
  const raised=()=>sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${campaignId}'`)
  try {
    assert.ok(providerId)
    const owner=await account('REGISTERED_USER'),finance=await account('FINANCE'),admin=await account('ADMIN'),auditor=await account('AUDITOR'),other=await account('CREATOR')
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='FINANCE';
      INSERT INTO campaign(id,slug,title,summary,campaign_type,creator_user_id,status,goal_amount,currency_code,ends_at)
      VALUES('${campaignId}','demo-${suffix}','Campaña sintética de simulación','No es una campaña ni un cobro real','DONATION','${owner.id}','PUBLISHED',100,'BOB',now()+interval '1 day'),
      ('${rewardCampaign}','demo-reward-${suffix}','Cupo sintético de preventa','Una reserva de prueba','PRESALE','${owner.id}','PUBLISHED',100,'BOB',now()+interval '1 day');
      INSERT INTO reward(id,campaign_id,title,description,min_amount,currency_code,quantity_total) VALUES('${rewardId}','${rewardCampaign}','Último cupo','Solo demostración',1,'BOB',1);`)
    const input={campaignId,amount:'0.30',currencyCode:'BOB',requestKey:randomUUID(),demoConsent:true}
    assert.equal((await call('demo-payments/checkout','',input)).status,401)
    process.env.DEMO_PAYMENTS_ENABLED='false'
    assert.equal((await call('demo-payments/checkout',owner.cookie,input)).status,404)
    process.env.DEMO_PAYMENTS_ENABLED='true'
    const nodeEnv=process.env.NODE_ENV;process.env.NODE_ENV='production'
    try {assert.equal((await call('demo-payments/checkout',owner.cookie,input)).status,404)} finally {if(nodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=nodeEnv}
    assert.equal((await call('demo-payments/checkout',auditor.cookie,input)).status,403)
    assert.equal((await call('demo-payments/checkout',owner.cookie,input,{Origin:'https://other.invalid'})).status,403)
    assert.equal((await call('demo-payments/checkout',owner.cookie,input,{'X-Brotar-Request':''})).status,403)
    for (const extra of [{demoConsent:false},{amount:3},{amount:'0'},{amount:'1.001'},{amount:'9999999999999'},{currencyCode:'USD'},{providerId},{status:'CONFIRMED'}]) {
      assert.equal((await call('demo-payments/checkout',owner.cookie,{...input,...extra})).status,400,JSON.stringify(extra))
    }
    const responses=await Promise.all([call('demo-payments/checkout',owner.cookie,input),call('demo-payments/checkout',owner.cookie,{...input,campaignId:campaignId.toUpperCase()})])
    assert.deepEqual(responses.map(x=>x.status),[201,201])
    const [first,replayed]=await Promise.all(responses.map(x=>x.json())) as [Checkout,Checkout]
    assert.equal(first.contribution.id,replayed.contribution.id);assert.equal(first.ticket.amount,'0.30');assert.equal(first.ticket.payable,false)
    assert.equal(first.ticket.qrPayload,`BROTAR-DEMO:${first.contribution.paymentId}`);assert.equal(raised(),'0.00')
    assert.equal(sql(`SELECT provider_payload->>'demoConsent' FROM payment WHERE id='${first.contribution.paymentId}'`),'true')
    assert.equal((await call('demo-payments/checkout',owner.cookie,{...input,amount:'0.31'})).status,409)
    const a=first.contribution
    assert.equal((await call(`demo-payments/${a.paymentId}`,other.cookie)).status,404)
    const ticketResponse=await call(`demo-payments/${a.paymentId}`,owner.cookie)
    assert.equal(ticketResponse.headers.get('cache-control'),'no-store')
    const ticket=await ticketResponse.json() as Record<string,unknown>
    assert.equal((await (await call(`demo-payments/${a.paymentId.toUpperCase()}`,owner.cookie)).json() as {qrPayload:string}).qrPayload,ticket.qrPayload)
    for (const field of ['provider_payload','providerId','userId','actorId','requestHash']) assert.equal(field in ticket,false)
    assert.equal((await call(`demo-payments/${a.paymentId}/simulate`,other.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})).status,404)
    assert.equal((await call(`demo-payments/${a.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID(),amount:'100'})).status,400)
    clearBudget()
    const eventKey=randomUUID(),event={outcome:'CONFIRMED',requestKey:eventKey}
    const confirmation=await call(`demo-payments/${a.paymentId.toUpperCase()}/simulate`,owner.cookie,event);assert.equal(confirmation.status,200)
    const confirmed=await confirmation.json() as {eventId:string;processing:string};assert.equal(confirmed.processing,'APPLIED')
    assert.equal((await (await call(`demo-payments/${a.paymentId}/simulate`,owner.cookie,event)).json() as {replayed:boolean}).replayed,true)
    assert.equal((await call(`demo-payments/${a.paymentId}/simulate`,owner.cookie,{...event,outcome:'FAILED'})).status,409)
    await call(`demo-payments/${a.paymentId}/simulate`,owner.cookie,{...event,requestKey:randomUUID()})
    assert.equal(raised(),'0.30');assert.equal(sql(`SELECT count(*) FROM payment WHERE contribution_id='${a.id}' AND confirmed_at IS NOT NULL`),'1')
    const historyReceipt=await call(`me/contributions/${a.id}/receipt`,owner.cookie);assert.equal(historyReceipt.status,200)
    const receipt=await historyReceipt.json() as {paymentId:string;sandbox:boolean;amount:string};assert.equal(receipt.paymentId,a.paymentId);assert.equal(receipt.sandbox,true);assert.equal(receipt.amount,'0.30')
    assert.equal((await call(`me/contributions/${a.id}/receipt`,other.cookie)).status,404)
    const summaryResponse=await call('me/sponsor-summary',owner.cookie);assert.equal(summaryResponse.status,200)
    const summary=await summaryResponse.json() as {totals:unknown[];demoTotals:{currency:string;grossConfirmed:string}[]}
    assert.deepEqual(summary.totals,[]);assert.deepEqual(summary.demoTotals,[{currency:'BOB',grossConfirmed:'0.30',refunded:'0.00',disputed:'0.00'}])
    const checkout=async(amount='0.30')=>{
      const response=await call('demo-payments/checkout',owner.cookie,{...input,amount,requestKey:randomUUID()});assert.equal(response.status,201)
      return (await response.json() as Checkout).contribution
    }
    const late=await checkout()
    sql(`UPDATE contribution SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id='${late.id}';
      UPDATE payment SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id='${late.paymentId}';`)
    const lateEvent={outcome:'CONFIRMED',requestKey:randomUUID()}
    const quarantined=await call(`demo-payments/${late.paymentId}/simulate`,owner.cookie,lateEvent);assert.equal(quarantined.status,200)
    assert.equal((await quarantined.json() as {processing:string}).processing,'NEEDS_REVIEW')
    assert.equal(raised(),'0.30');assert.equal(sql(`SELECT processing FROM brotar_extension.demo_event WHERE payment_id='${late.paymentId}'`),'NEEDS_REVIEW')
    assert.equal(sql(`SELECT status FROM payment WHERE id='${late.paymentId}'`),'INITIATED','El recibo persiste sin reactivar ni inventar el cobro.')
    assert.equal((await call('admin/finance/demo/expire',admin.cookie,{limit:100})).status,403)
    assert.equal((await call('admin/finance/demo/expire',finance.cookie,{limit:100})).status,200)
    assert.equal(sql(`SELECT status FROM payment WHERE id='${late.paymentId}'`),'EXPIRED')
    const retryKey=randomUUID()
    const retry=await call(`demo-payments/contributions/${late.id}/retry`,owner.cookie,{requestKey:retryKey,demoConsent:true});assert.equal(retry.status,201)
    const second=await retry.json() as Checkout;assert.notEqual(second.contribution.paymentId,late.paymentId)
    assert.equal((await call(`demo-payments/contributions/${late.id}/retry`,owner.cookie,{requestKey:retryKey,demoConsent:true})).status,201)
    assert.equal(sql(`SELECT count(*) FROM payment WHERE contribution_id='${late.id}'`),'2')
    assert.equal(sql(`SELECT provider_payload->>'demoConsent' FROM payment WHERE id='${second.contribution.paymentId}'`),'true')
    const today=sql("SELECT (now() AT TIME ZONE 'UTC')::date")
    const pendingFrom=sql("SELECT ((now()-interval '3 hours') AT TIME ZONE 'UTC')::date")
    const pendingQuery=`admin/finance/demo/pending?from=${pendingFrom}&to=${today}&currencyCode=BOB`
    assert.equal((await call(pendingQuery)).status,401)
    assert.equal((await call(pendingQuery,owner.cookie)).status,403)
    for(const reader of [admin,auditor,finance]) {
      const pendingResponse=await call(pendingQuery,reader.cookie);assert.equal(pendingResponse.status,200)
      assert.equal(pendingResponse.headers.get('cache-control'),'no-store')
      const pending=await pendingResponse.json() as {items: {id: string;amount: string;needsReview: boolean;status: string}[]}
      assert.equal(pending.items.find(x=>x.id===late.paymentId)!.needsReview,true)
      assert.equal(pending.items.find(x=>x.id===late.paymentId)!.status,'EXPIRED')
      assert.equal(pending.items.find(x=>x.id===second.contribution.paymentId)!.amount,'0.30')
      assert.equal(pending.items.some(x=>x.id===a.paymentId),false,'El pago confirmado no es un intento pendiente.')
      for(const row of pending.items)for(const secret of ['email','provider_payload','request_hash','userId'])assert.equal(secret in row,false)
      const currencies=await call('admin/finance/demo/currencies',reader.cookie);assert.equal(currencies.status,200)
      assert.ok((await currencies.json() as {code:string}[]).some(x=>x.code==='BOB'))
    }
    const pendingPage=await (await call(`${pendingQuery}&limit=1`,finance.cookie)).json() as {items:{id:string}[];nextCursor:string}
    assert.equal(pendingPage.items.length,1);assert.ok(pendingPage.nextCursor)
    const pendingNext=await (await call(`${pendingQuery}&limit=1&cursor=${pendingPage.nextCursor}`,finance.cookie)).json() as {items:{id:string}[]}
    assert.equal(pendingNext.items.length,1);assert.notEqual(pendingPage.items[0]!.id,pendingNext.items[0]!.id)
    for(const suffix of ['&limit=51','&limit=1&limit=2','&unknown=1'])assert.equal((await call(pendingQuery+suffix,finance.cookie)).status,400)
    assert.equal((await call(`${pendingQuery}&cursor=${randomUUID()}`,finance.cookie)).status,409)
    assert.equal((await call(pendingQuery.replace('currencyCode=BOB','currencyCode=XYZ'),finance.cookie)).status,400)
    assert.equal((await call(pendingQuery.replace(`from=${pendingFrom}`,'from=2026-02-30'),finance.cookie)).status,400)
    const batchInput={from:today,to:today,currencyCode:'BOB',requestKey:randomUUID()}
    const createBatch=async()=>{
      const response=await call('admin/finance/demo/reconciliations',finance.cookie,{...batchInput,requestKey:randomUUID()});assert.equal(response.status,201)
      return await response.json() as Batch
    }
    assert.equal((await call('admin/finance/demo/reconciliations',admin.cookie,batchInput)).status,403)
    assert.equal((await call('admin/finance/demo/reconciliations',auditor.cookie,batchInput)).status,403)
    assert.equal((await call('admin/finance/demo/reconciliations',owner.cookie,batchInput)).status,403)
    assert.equal((await call('admin/finance/demo/reconciliations',finance.cookie,{...batchInput,from:'2026-02-30'})).status,400)
    assert.equal((await call('admin/finance/demo/reconciliations',finance.cookie,{...batchInput,currencyCode:'XYZ'})).status,400)
    let response=await call('admin/finance/demo/reconciliations',finance.cookie,batchInput);assert.equal(response.status,201)
    const batch=await response.json() as Batch
    assert.equal(batch.createdBy,finance.id);assert.equal(batch.closedBy,null)
    assert.equal(batch.totalInternal,'0.30');assert.equal(batch.totalProvider,'0.60');assert.equal(batch.difference,'-0.30')
    assert.equal(batch.items.find(i=>i.paymentId===a.paymentId)!.status,'MATCHED')
    const missing=batch.items.find(i=>i.paymentId===late.paymentId)!;assert.equal(missing.status,'MISSING_INTERNAL')
    assert.equal((await (await call('admin/finance/demo/reconciliations',finance.cookie,batchInput)).json() as Batch).id,batch.id)
    assert.equal((await call('admin/finance/demo/reconciliations',finance.cookie,{...batchInput,to:'2026-10-01'})).status,400)
    for (const role of [admin,auditor]) assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}`,role.cookie)).status,200)
    assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}`,owner.cookie)).status,403)
    assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}/close`,finance.cookie,{confirmed:true})).status,409)
    assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}/items/${missing.id}/resolve`,finance.cookie,{action:'RECHECK',reason:'El recibo permanece tardío y no debe forzarse.'})).status,409)
    const resolution={action:'COMPENSATE_DEMO',reason:'Compensación sintética de un recibo tardío sin ingreso interno.'}
    response=await call(`admin/finance/demo/reconciliations/${batch.id}/items/${missing.id}/resolve`,finance.cookie,resolution);assert.equal(response.status,200)
    const resolved=await response.json() as Batch
    const item=resolved.items.find(i=>i.id===missing.id)!;assert.equal(item.status,'RESOLVED');assert.equal(item.originalStatus,'MISSING_INTERNAL');assert.equal(item.compensationAmount,'0.30')
    assert.equal(item.resolvedBy,finance.id);assert.ok(item.internalReference)
    assert.equal(resolved.difference,'-0.30','No se modifica la diferencia bruta de la instantánea para simular que cuadraba.')
    assert.equal(raised(),'0.30');assert.equal(sql(`SELECT count(*) FROM refund WHERE payment_id='${late.paymentId}'`),'0','No restar de la campaña un reembolso de dinero nunca ingresado.')
    assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}/items/${missing.id}/resolve`,finance.cookie,resolution)).status,200)
    assert.equal(sql(`SELECT count(*) FROM brotar_extension.demo_compensation WHERE payment_id='${late.paymentId}'`),'1')
    assert.equal((await (await call(`demo-payments/${late.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})).json() as {processing:string}).processing,'COMPENSATED')
    clearBudget()
    const close=await call(`admin/finance/demo/reconciliations/${batch.id}/close`,finance.cookie,{confirmed:true});assert.equal(close.status,200)
    const closed=await close.json() as Batch;assert.equal(closed.status,'CLOSED');assert.equal(closed.closedBy,finance.id)
    assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}/close`,finance.cookie,{confirmed:true})).status,200)
    assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}/items/${missing.id}/resolve`,finance.cookie,resolution)).status,409)
    await call(`demo-payments/${second.contribution.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})
    assert.equal(raised(),'0.60','El nuevo intento sí puede confirmarse una sola vez; el anterior compensado no suma.')
    // Recompensa/preventa: un solo cupo entre dos cuentas simultáneas y rechazo de moneda/modalidad incorrectas.
    clearBudget()
    const reward={...input,campaignId:rewardCampaign,rewardId,amount:'1.00'}
    const attempts=await Promise.all([call('demo-payments/checkout',owner.cookie,{...reward,requestKey:randomUUID()}),call('demo-payments/checkout',other.cookie,{...reward,requestKey:randomUUID()})])
    assert.deepEqual(attempts.map(x=>x.status).sort(),[201,409])
    assert.equal((await call('demo-payments/checkout',owner.cookie,{...reward,rewardId:null,requestKey:randomUUID()})).status,400)
    // Defectos sintéticos controlados: no hay ruta pública que permita elegir importe/referencia del proveedor.
    const mismatch=await checkout('0.40')
    await call(`demo-payments/${mismatch.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})
    sql(`UPDATE brotar_extension.demo_event SET amount=0.41 WHERE payment_id='${mismatch.paymentId}' AND observed_status='CONFIRMED';`)
    const mismatched=await createBatch(),mismatchItem=mismatched.items.find(i=>i.paymentId===mismatch.paymentId)!
    assert.equal(mismatchItem.status,'AMOUNT_MISMATCH')
    assert.equal((await call(`admin/finance/demo/reconciliations/${mismatched.id}/items/${mismatchItem.id}/resolve`,finance.cookie,{action:'RECHECK',reason:'No existe evidencia para resolver el importe distinto.'})).status,409)
    assert.equal((await call(`admin/finance/demo/reconciliations/${mismatched.id}/close`,finance.cookie,{confirmed:true})).status,409)
    sql(`UPDATE brotar_extension.demo_event SET amount=0.40 WHERE payment_id='${mismatch.paymentId}' AND observed_status='CONFIRMED';`)
    assert.equal((await call(`admin/finance/demo/reconciliations/${mismatched.id}/items/${mismatchItem.id}/resolve`,finance.cookie,{action:'RECHECK',reason:'Evidencia corregida en el fixture por un operador autorizado.'})).status,200)
    clearBudget()
    const lost=await checkout('0.20')
    await call(`demo-payments/${lost.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})
    sql(`DELETE FROM brotar_extension.demo_event WHERE payment_id='${lost.paymentId}';`)
    const missingProvider=await createBatch(),lostItem=missingProvider.items.find(i=>i.paymentId===lost.paymentId)!
    assert.equal(lostItem.status,'MISSING_PROVIDER')
    assert.equal((await call(`admin/finance/demo/reconciliations/${missingProvider.id}/items/${lostItem.id}/resolve`,finance.cookie,{action:'RECHECK',reason:'Falta evidencia del proveedor simulado para esta operación.'})).status,409)
    await call(`demo-payments/${lost.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})
    assert.equal((await call(`admin/finance/demo/reconciliations/${missingProvider.id}/items/${lostItem.id}/resolve`,finance.cookie,{action:'RECHECK',reason:'Ahora existe una observación DEMO coincidente con el intento.'})).status,200)
    const duplicate=await checkout('0.20')
    await call(`demo-payments/${duplicate.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})
    sql(`UPDATE brotar_extension.demo_event SET external_reference='DEMO-${lost.paymentId}' WHERE payment_id='${duplicate.paymentId}';`)
    const duplicated=await createBatch(),duplicateItem=duplicated.items.find(i=>i.status==='DUPLICATED')!
    assert.ok(duplicateItem);assert.equal(duplicateItem.paymentId,null)
    assert.equal((await call(`admin/finance/demo/reconciliations/${duplicated.id}/items/${duplicateItem.id}/resolve`,finance.cookie,{action:'COMPENSATE_DEMO',reason:'Una referencia ambigua no permite devolver un importe fiable.'})).status,409)
    assert.equal((await call(`admin/finance/demo/reconciliations/${duplicated.id}/close`,finance.cookie,{confirmed:true})).status,409)
    sql(`UPDATE brotar_extension.demo_event SET external_reference='DEMO-${duplicate.paymentId}' WHERE payment_id='${duplicate.paymentId}';`)
    // Separación de funciones: ni Finanzas resuelve una compensación de su propio aporte.
    clearBudget()
    const ownFinanceResponse=await call('demo-payments/checkout',finance.cookie,{...input,amount:'0.10',requestKey:randomUUID()});assert.equal(ownFinanceResponse.status,201)
    const ownFinance=(await ownFinanceResponse.json() as Checkout).contribution
    sql(`UPDATE contribution SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id='${ownFinance.id}';`)
    await call(`demo-payments/${ownFinance.paymentId}/simulate`,finance.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})
    const selfBatch=await createBatch(),selfItem=selfBatch.items.find(i=>i.paymentId===ownFinance.paymentId)!
    assert.equal(selfItem.status,'MISSING_INTERNAL')
    assert.equal((await call(`admin/finance/demo/reconciliations/${selfBatch.id}/items/${selfItem.id}/resolve`,finance.cookie,resolution)).status,403)
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${other.id}',id FROM role WHERE code='FINANCE';`)
    assert.equal((await call(`admin/finance/demo/reconciliations/${selfBatch.id}/items/${selfItem.id}/resolve`,other.cookie,resolution)).status,200)
    assert.equal(sql(`SELECT count(*) FROM brotar_extension.demo_compensation WHERE payment_id='${ownFinance.paymentId}'`),'1')
    assert.equal((await call(`admin/finance/demo/reconciliations/${batch.id}`,finance.cookie)).headers.get('cache-control'),'no-store')
    const pages=await call('admin/finance/demo/reconciliations?limit=1',finance.cookie);assert.equal(pages.status,200)
    const page=await pages.json() as {items:{id:string}[];nextCursor:string};assert.equal(page.items.length,1);assert.ok(page.nextCursor)
    const nextPage=await (await call(`admin/finance/demo/reconciliations?limit=1&cursor=${page.nextCursor}`,finance.cookie)).json() as {items:{id:string}[]}
    assert.notEqual(nextPage.items[0]!.id,page.items[0]!.id)
    assert.equal((await call(`admin/finance/demo/reconciliations?cursor=${randomUUID()}`,finance.cookie)).status,409)
    // Revocación se comprueba también en el servicio, no solo ocultando botones.
    sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${finance.id}' AND role_id=(SELECT id FROM role WHERE code='FINANCE');`)
    assert.equal((await call('admin/finance/demo/reconciliations',finance.cookie,{...batchInput,requestKey:randomUUID()})).status,403)
    await assert.rejects(app.get(DemoReconciliation).create(admin.id,{...batchInput,requestKey:randomUUID()}),/Finanzas/)
    await assert.rejects(app.get(DemoReconciliation).create(finance.id,{...batchInput,requestKey:randomUUID()}),/Finanzas/)
    // Límite persistente compartido por una segunda instancia de guard/API; X-Forwarded-For no lo esquiva.
    clearBudget()
    for(let n=0;n<20;n++) assert.equal((await call(`demo-payments/${a.paymentId}/simulate`,owner.cookie,event,{'X-Forwarded-For':`192.0.2.${n}`})).status,200)
    const secondApp=await NestFactory.create(AppModule,{logger:false});configureHttp(secondApp,readEnvironment({NODE_ENV:'test'}))
    await secondApp.listen(0,'127.0.0.1')
    try {
      const limited=await fetch(`${await secondApp.getUrl()}/api/demo-payments/${a.paymentId}/simulate`,{method:'POST',headers:{Cookie:owner.cookie,
        'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173'},body:JSON.stringify(event)})
      assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60')
    } finally {await secondApp.close()}
    assert.equal(raised(),'1.40')
    const source=app.get(DatabaseService).connection()
    await assert.rejects(source.query("UPDATE brotar_extension.demo_event SET amount=999 WHERE id=$1",[confirmed.eventId]),/permission denied/)
    await assert.rejects(source.query('DELETE FROM brotar_extension.demo_compensation WHERE payment_id=$1',[late.paymentId]),/permission denied/)
    assert.ok(Number(sql(`SELECT count(*) FROM audit_log WHERE entity_name='demo_event' AND actor_user_id='${owner.id}'`))>0)
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_id='${missing.id}' AND actor_user_id='${finance.id}' AND action='STATUS_CHANGE'`),'1')
    const recovery=execFileSync(process.execPath,['scripts/drill-recovery.mjs'],{encoding:'utf8',timeout:90000,env:{...process.env,BROTAR_DRILL_DIR:join(tmpdir(),'brotar-s3-demo-recovery-20261021')}})
    assert.match(recovery,/Ensayo completado/);assert.match(recovery,/"demoEvents": [1-9]/);assert.match(recovery,/"demoCompensations": 2/)
  } finally {
    await app.close()
    if(previousFlag===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=previousFlag
    if(users.length) {
      const ids=users.map(id=>`'${id}'`).join(',')
      sql(`DELETE FROM reconciliation WHERE created_by IN (${ids});
        DELETE FROM brotar_extension.demo_compensation WHERE payment_id IN (SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id IN ('${campaignId}','${rewardCampaign}'));
        DELETE FROM brotar_extension.demo_event WHERE payment_id IN (SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id IN ('${campaignId}','${rewardCampaign}'));
        DELETE FROM payment_event WHERE payment_id IN (SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id IN ('${campaignId}','${rewardCampaign}'));
        DELETE FROM payment WHERE contribution_id IN (SELECT id FROM contribution WHERE campaign_id IN ('${campaignId}','${rewardCampaign}'));
        DELETE FROM contribution WHERE campaign_id IN ('${campaignId}','${rewardCampaign}'); DELETE FROM reward WHERE campaign_id='${rewardCampaign}';
        DELETE FROM campaign WHERE id IN ('${campaignId}','${rewardCampaign}');DELETE FROM app_user WHERE id IN (${ids});`)
      clearBudget()
    }
  }
})
