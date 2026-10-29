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
import { ContributionLedger, type ContributionPage, type OwnContribution, type VerifiedPaymentEvent } from '../src/contributions/infrastructure/contribution-ledger'
import { LedgerConflict, LedgerInvalid } from '../src/contributions/domain/payment'
import { ACCESS_POLICY, effectivePermissions } from '../src/roles/domain/access-policy'
import { readTestDatabaseTarget } from './database-target'

test('S3-16/02/18 PostgreSQL: permisos por responsabilidad, céntimos, cupos, eventos, aislamiento y rollback sandbox', { timeout: 120000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV,'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],
    { input: query,encoding:'utf8',timeout:10000,stdio:['pipe','pipe','pipe'] }).trim()
  const app = await NestFactory.create(AppModule,{ logger:false })
  configureHttp(app,readEnvironment({ NODE_ENV:'test' }))
  await app.listen(0,'127.0.0.1')
  const base = await app.getUrl(), suffix=randomUUID(), providerId=randomUUID(), campaignId=randomUUID(), rewardCampaign=randomUUID(), rewardId=randomUUID()
  const users: string[] = []
  const password = randomBytes(24).toString('hex')
  const call = (path: string,cookie='',body?: unknown) => fetch(`${base}/api/${path}`,{
    method:body===undefined?'GET':'POST',headers:{ Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173' },
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  })
  const account = async (role: string) => {
    const email=`s3-${role.toLowerCase()}-${suffix}@example.invalid`
    const registered=await call('auth/register','',{ legalVersion:'mvp-demo-legal-1.0-20261028', firstName:'Ensayo',lastName:'Responsabilidades',email,password,demoConsent:true })
    assert.equal(registered.status,201)
    const { id }=await registered.json() as { id:string }; users.push(id)
    if (role!=='REGISTERED_USER') sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`)
    const login=await call('auth/login','',{email,password}); assert.equal(login.status,200)
    return { id,cookie:login.headers.get('set-cookie')!.split(';')[0]! }
  }
  try {
    const accounts: Record<string,Awaited<ReturnType<typeof account>>> = {}
    for (const role of ['REGISTERED_USER','CREATOR','SPONSOR','REVIEWER','COMPLIANCE','FINANCE','SUPPORT','ADMIN','AUDITOR']) {
      const user = await account(role); accounts[role]=user
      const permissions=await call('access/permissions',user.cookie); assert.equal(permissions.status,200)
      const expected = Object.entries(ACCESS_POLICY).filter(([,rule]) => (rule.roles as readonly string[]).some(code=>[role,'REGISTERED_USER'].includes(code))).map(([code])=>code)
      assert.deepEqual(await permissions.json(),{permissions:effectivePermissions(expected,role==='AUDITOR'),readOnly:role==='AUDITOR'})
      const queue=await call('admin/campaigns/review',user.cookie)
      assert.equal(queue.status,['REVIEWER','ADMIN','AUDITOR'].includes(role)?200:403,role)
      if (role!=='ADMIN') assert.equal((await call(`admin/campaigns/${campaignId}/publish`,user.cookie,{confirmed:true,expectedRound:1})).status,403)
    }
    const reviewer=accounts.REVIEWER!, auditor=accounts.AUDITOR!, owner=accounts.REGISTERED_USER!, outsider=accounts.CREATOR!
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='ADMIN';`)
    const readOnly=await (await call('access/permissions',auditor.cookie)).json() as { permissions:string[];readOnly:boolean }
    assert.equal(readOnly.readOnly,true); assert.equal(readOnly.permissions.includes('campaign.publish'),false)
    assert.equal((await call(`admin/campaigns/${campaignId}/decision`,auditor.cookie,{decision:'APPROVED',comment:'',expectedRound:1,observations:[]})).status,403)
    // El revisor supera autorización; el identificador inexistente llega al 404, no a una escritura falsa.
    assert.equal((await call(`admin/campaigns/${campaignId}/decision`,reviewer.cookie,{decision:'APPROVED',comment:'',expectedRound:1,observations:[]})).status,404)
    sql(`UPDATE user_role SET granted_at=now()-interval '2 days',expires_at=now()-interval '1 day'
      WHERE user_id='${reviewer.id}' AND role_id=(SELECT id FROM role WHERE code='REVIEWER');`)
    assert.equal((await call('admin/campaigns/review',reviewer.cookie)).status,403)
    sql(`INSERT INTO payment_provider(id,code,name,is_sandbox) VALUES('${providerId}','fixture-${suffix}','Ensayo sin proveedor externo',true);
      INSERT INTO campaign(id,slug,title,summary,campaign_type,creator_user_id,status,goal_amount,currency_code,ends_at)
      VALUES('${campaignId}','ledger-${suffix}','Ensayo financiero aislado','Fixture explícito, no campaña del usuario','DONATION','${owner.id}','PUBLISHED',100,'BOB',now()+interval '1 day'),
        ('${rewardCampaign}','reward-${suffix}','Ensayo de cupos aislado','Fixture explícito de concurrencia','REWARD','${owner.id}','PUBLISHED',100,'BOB',now()+interval '1 day');
      INSERT INTO reward(id,campaign_id,title,description,min_amount,currency_code,quantity_total)
      VALUES('${rewardId}','${rewardCampaign}','Un único cupo','Recompensa sintética de integración',1,'BOB',1);`)
    const ledger=app.get(ContributionLedger)
    const input={ campaignId,rewardId:null,providerId,amount:'0.30',currencyCode:'BOB',requestKey:randomUUID() }
    const [a,b]=await Promise.all([ledger.start(owner.id,input),ledger.start(owner.id,input)])
    assert.equal(a.id,b.id); assert.equal(a.amount,'0.30'); assert.equal(a.paymentStatus,'INITIATED')
    assert.equal(sql(`SELECT provider_payload->>'requestHash' FROM payment WHERE id='${a.paymentId}'`),
      createHash('sha256').update(JSON.stringify([campaignId,null,'0.30','BOB',providerId])).digest('hex'),'Mantener compatibles las claves internas anteriores al consentimiento explícito DEMO.')
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_id='${a.id}' AND action='CREATE' AND actor_user_id='${owner.id}'`),'1','El reintento no duplica la auditoría del aporte.')
    assert.equal(sql(`SELECT changed_by FROM status_history WHERE entity_type='PAYMENT' AND entity_id='${a.paymentId}' AND from_status IS NULL`),owner.id,'El alta del intento conserva al usuario autenticado, no al proveedor; no se inventa un trigger para contribution.')
    const raised=()=>sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${campaignId}'`)
    assert.equal(raised(),'0.00')
    await assert.rejects(ledger.start(owner.id,{...input,amount:'0.31'}),LedgerConflict)
    await assert.rejects(ledger.start(owner.id,{...input,amount:'1.001',requestKey:randomUUID()}),LedgerInvalid)
    await assert.rejects(ledger.start(owner.id,{...input,currencyCode:'USD',requestKey:randomUUID()}),LedgerInvalid)
    assert.equal((await call(`contributions/${a.id}`,owner.cookie)).status,200)
    const own=await (await call(`contributions/${a.id}`,owner.cookie)).json() as Record<string,unknown>
    assert.equal(typeof own.expiresAt,'string')
    for (const field of ['provider_payload','providerPayload','externalReference','userId','providerId']) assert.equal(field in own,false)
    assert.equal((await call(`contributions/${a.id}`,outsider.cookie)).status,404)
    assert.equal((await call(`contributions/${a.id}`)).status,401)
    assert.equal((await call('contributions',accounts.ADMIN!.cookie,{...input,status:'CONFIRMED'})).status,404)
    assert.equal((await call('payments/webhook',accounts.ADMIN!.cookie,{paymentId:a.paymentId,status:'CONFIRMED'})).status,404)
    const event: VerifiedPaymentEvent={providerId,paymentId:a.paymentId,eventId:randomUUID(),state:'PENDING',amount:'0.30',currencyCode:'BOB'}
    await ledger.applyVerifiedEvent(event); assert.equal(raised(),'0.00')
    await assert.rejects(ledger.applyVerifiedEvent({...event,eventId:randomUUID(),amount:'0.31'}),LedgerConflict)
    await assert.rejects(ledger.applyVerifiedEvent({...event,eventId:randomUUID(),currencyCode:'USD'}),LedgerConflict)
    await assert.rejects(ledger.applyVerifiedEvent({...event,eventId:randomUUID(),feeAmount:'0.40'}),LedgerInvalid)
    const confirmed={...event,eventId:randomUUID(),state:'CONFIRMED' as const,externalReference:`charge-${suffix}`,feeAmount:'0.01'}
    const confirmations=await Promise.all([ledger.applyVerifiedEvent(confirmed),ledger.applyVerifiedEvent(confirmed)])
    assert.deepEqual(confirmations.map(x=>x.replayed).sort(),[false,true]); assert.equal(raised(),'0.30')
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_id='${a.paymentId}' AND action='PAYMENT_EVENT' AND actor_user_id IS NULL AND actor_role='SYSTEM'`),'2','Dos eventos distintos, no dos confirmaciones por reintento; sin actor humano inventado.')
    assert.equal(sql(`SELECT count(*) FROM status_history WHERE entity_id='${a.paymentId}' AND from_status IS NOT NULL AND changed_by IS NOT NULL`),'0','Los avisos internos no heredan al aportante de una conexión reutilizada.')
    assert.deepEqual(await ledger.applyVerifiedEvent(event),{status:'CONFIRMED',replayed:true},'Repetir un aviso viejo devuelve el estado vigente, no PENDING histórico.')
    assert.equal(sql(`SELECT net_amount FROM payment WHERE id='${a.paymentId}'`),'0.29')
    await assert.rejects(ledger.applyVerifiedEvent({...confirmed,amount:'0.31'}),LedgerConflict)
    await ledger.applyVerifiedEvent({...event,eventId:randomUUID()}); assert.equal((await ledger.own(owner.id,a.id))!.paymentStatus,'CONFIRMED')
    // Otro evento con otra referencia no modifica una confirmación ya registrada.
    await assert.rejects(ledger.applyVerifiedEvent({...confirmed,eventId:randomUUID(),externalReference:'otra'}),LedgerConflict)
    const failed=await ledger.start(owner.id,{...input,requestKey:randomUUID()})
    await ledger.applyVerifiedEvent({...event,paymentId:failed.paymentId,eventId:randomUUID(),state:'FAILED'})
    assert.equal((await ledger.own(owner.id,failed.id))!.status,'CANCELLED'); assert.equal(raised(),'0.30')
    const expired=await ledger.start(owner.id,{...input,requestKey:randomUUID()})
    await ledger.applyVerifiedEvent({...event,paymentId:expired.paymentId,eventId:randomUUID(),state:'EXPIRED'})
    await assert.rejects(ledger.applyVerifiedEvent({...confirmed,paymentId:expired.paymentId,eventId:randomUUID(),externalReference:'late'}),LedgerConflict)
    // El mismo aporte conserva ambos intentos. La clave repetida no genera un tercero.
    const retryKey=randomUUID()
    const [retried,replayed]=await Promise.all([ledger.retry(owner.id,failed.id,retryKey),ledger.retry(owner.id,failed.id,retryKey)])
    assert.equal(retried.id,failed.id); assert.equal(retried.paymentId,replayed.paymentId); assert.notEqual(retried.paymentId,failed.paymentId)
    assert.equal(retried.status,'PENDING'); assert.equal(retried.paymentStatus,'INITIATED')
    assert.equal(sql(`SELECT status FROM payment WHERE id='${failed.paymentId}'`),'FAILED')
    assert.equal(sql(`SELECT count(*) FROM payment WHERE contribution_id='${failed.id}'`),'2')
    await assert.rejects(ledger.retry(owner.id,expired.id,retryKey),LedgerConflict)
    await assert.rejects(ledger.retry(outsider.id,failed.id,randomUUID()),LedgerConflict)
    await assert.rejects(ledger.retry(owner.id,failed.id,randomUUID()),LedgerConflict,'No hay dos intentos abiertos para un aporte.')
    await assert.rejects(ledger.retry(owner.id,a.id,randomUUID()),LedgerConflict,'Un aporte confirmado nunca se reabre.')
    const overdue=await ledger.start(owner.id,{...input,requestKey:randomUUID()})
    sql(`UPDATE contribution SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id='${overdue.id}';`)
    assert.equal(await ledger.expireDue(),1); assert.equal(await ledger.expireDue(),0)
    assert.equal((await ledger.own(owner.id,overdue.id))!.status,'EXPIRED')
    assert.equal(sql(`SELECT count(*) FROM payment_event WHERE payment_id='${overdue.paymentId}' AND event_type='demo.reservation_expired'`),'1')
    await assert.rejects(ledger.applyVerifiedEvent({...confirmed,paymentId:overdue.paymentId,eventId:randomUUID(),externalReference:'late-maintenance'}),LedgerConflict)
    const reopened=await ledger.retry(owner.id,overdue.id,randomUUID()); assert.equal(reopened.status,'PENDING')
    sql(`UPDATE campaign SET ends_at=now()+interval '10 minutes' WHERE id='${campaignId}'`)
    const endingSoon=await ledger.start(owner.id,{...input,requestKey:randomUUID()})
    assert.equal(sql(`SELECT c.expires_at=ca.ends_at FROM contribution c JOIN campaign ca ON ca.id=c.campaign_id WHERE c.id='${endingSoon.id}'`),'t','La reserva nunca se prolonga más allá del fin de campaña.')
    sql(`UPDATE campaign SET ends_at=now()+interval '1 day' WHERE id='${campaignId}'`)
    await assert.rejects(ledger.start(auditor.id,{...input,requestKey:randomUUID()}),LedgerConflict,'AUDITOR tampoco escribe invocando el núcleo directamente.')
    for (const limit of [0,501,1.5,NaN]) await assert.rejects(ledger.expireDue(limit),LedgerInvalid)
    const reused=await ledger.start(owner.id,{...input,requestKey:randomUUID()})
    await assert.rejects(ledger.applyVerifiedEvent({...confirmed,paymentId:reused.paymentId,eventId:randomUUID()}),LedgerConflict)
    assert.equal((await ledger.own(owner.id,reused.id))!.paymentStatus,'INITIATED','Conflicto revierte también el estado del pago/aporte.')
    assert.equal(raised(),'0.30')
    sql(`INSERT INTO refund(payment_id,contribution_id,amount,currency_code,status)
      VALUES('${a.paymentId}','${a.id}',0.10,'BOB','REFUNDED');
      INSERT INTO dispute(contribution_id,payment_id,campaign_id,raised_by,reason_code,description)
      VALUES('${a.id}','${a.paymentId}','${campaignId}','${owner.id}','FIXTURE','Disputa sintética de este ensayo');
      UPDATE payment SET status='DISPUTED' WHERE id='${a.paymentId}';`)
    await ledger.applyVerifiedEvent({...event,eventId:randomUUID()})
    assert.equal((await ledger.own(owner.id,a.id))!.paymentStatus,'DISPUTED')
    assert.equal(raised(),'0.20','La vista oficial descuenta solo la devolución completada y conserva el pago original.')
    assert.equal(sql(`SELECT count(*) FROM dispute WHERE payment_id='${a.paymentId}'`),'1')
    const limited={...input,campaignId:rewardCampaign,rewardId,amount:'1.00'}
    const concurrent=await Promise.allSettled([ledger.start(owner.id,{...limited,requestKey:randomUUID()}),ledger.start(outsider.id,{...limited,requestKey:randomUUID()})])
    assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1,'Solo un intento reserva el último cupo.')
    const reserved=concurrent.find(x=>x.status==='fulfilled')! as PromiseFulfilledResult<Awaited<ReturnType<typeof ledger.start>>>
    await ledger.applyVerifiedEvent({...event,paymentId:reserved.value.paymentId,eventId:randomUUID(),amount:'1.00',state:'EXPIRED'})
    const next=await ledger.start(owner.id,{...limited,requestKey:randomUUID()}); assert.ok(next.id)
    sql(`UPDATE contribution SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id='${next.id}';`)
    await assert.rejects(ledger.applyVerifiedEvent({...confirmed,paymentId:next.paymentId,eventId:randomUUID(),amount:'1.00',externalReference:'expired-hold'}),LedgerConflict)
    assert.ok((await ledger.start(owner.id,{...limited,requestKey:randomUUID()})).id,'La reserva vencida libera el cupo sin borrar historial.')
    // Historial propio: incluye registros sin intento, pero no inventa un pago ni confirma un aporte.
    const historicalIds=Array.from({length:3},()=>randomUUID())
    const foreign=await ledger.start(outsider.id,{...input,requestKey:randomUUID()})
    const latestPayment=randomUUID()
    sql(`INSERT INTO contribution(id,campaign_id,user_id,amount,currency_code)
      VALUES ${historicalIds.map(id=>`('${id}','${campaignId}','${owner.id}',0.30,'BOB')`).join(',')};
      INSERT INTO payment(id,contribution_id,provider_id,idempotency_key,amount,currency_code,attempt_number,status)
      VALUES('${latestPayment}','${reused.id}','${providerId}','${randomUUID()}',0.30,'BOB',2,'FAILED');
      UPDATE contribution SET created_at=date_trunc('second',now())-interval '3 hours'+interval '0.123456 seconds'
      WHERE user_id='${owner.id}' AND campaign_id IN ('${campaignId}','${rewardCampaign}');`)
    const latest=await (await call(`contributions/${reused.id}`,owner.cookie)).json() as OwnContribution
    assert.equal(latest.paymentId,latestPayment); assert.equal(latest.paymentStatus,'FAILED')
    const noAttempt=await (await call(`contributions/${historicalIds[0]}`,owner.cookie)).json() as OwnContribution
    assert.equal(noAttempt.paymentId,null); assert.equal(noAttempt.paymentStatus,null); assert.equal(noAttempt.expiresAt,null)
    assert.equal(noAttempt.status,'PENDING','Ausencia de intento no se disfraza como confirmación/fallo.')
    const empty=await call('contributions',accounts.FINANCE!.cookie)
    assert.equal(empty.status,200); assert.deepEqual(await empty.json(),{items:[],nextCursor:null})
    assert.equal((await call('contributions')).status,401)
    for (const query of ['limit=0','limit=51','limit=1.5','limit=1e1','limit=01','limit=1&limit=2',
      'cursor=','cursor=no-uuid',`cursor=${a.id}&cursor=${b.id}`,'userId='+outsider.id,'status=CONFIRMED']) {
      assert.equal((await call(`contributions?${query}`,owner.cookie)).status,400,query)
    }
    const unavailable=[]
    for (const id of [foreign.id,randomUUID()]) {
      const invalid=await call(`contributions?cursor=${id}`,owner.cookie)
      assert.equal(invalid.status,400); unavailable.push(await invalid.json())
    }
    assert.deepEqual(unavailable[0],unavailable[1],'Cursor ajeno e inexistente no revelan pertenencia.')
    const expected=sql(`SELECT id FROM contribution WHERE user_id='${owner.id}' ORDER BY created_at DESC,id DESC`).split('\n')
    const firstResponse=await call('contributions?limit=2',owner.cookie)
    assert.equal(firstResponse.status,200); assert.equal(firstResponse.headers.get('cache-control'),'no-store')
    let page=await firstResponse.json() as ContributionPage
    assert.equal(page.items.length,2); assert.ok(page.nextCursor)
    const found=page.items.map(item=>item.id)
    // Una inserción posterior no desplaza páginas como sucedería al usar OFFSET.
    const inserted=await ledger.start(owner.id,{...input,requestKey:randomUUID()})
    while (page.nextCursor) {
      const response=await call(`contributions?limit=2&cursor=${page.nextCursor}`,owner.cookie)
      assert.equal(response.status,200); page=await response.json() as ContributionPage
      found.push(...page.items.map(item=>item.id))
      assert.ok(found.length<=expected.length,'La paginación debe avanzar sin repetirse.')
    }
    assert.deepEqual(found,expected,'Timestamps iguales con microsegundos no omiten ni duplican filas.')
    assert.equal(new Set(found).size,found.length); assert.equal(found.includes(foreign.id),false)
    const refreshed=await (await call('contributions?limit=50',owner.cookie)).json() as ContributionPage
    assert.equal(refreshed.items[0]!.id,inserted.id); assert.equal(refreshed.nextCursor,null)
    const allowed=['amount','campaignId','createdAt','currencyCode','expiresAt','id','paymentId','paymentStatus','reference','reservationExpired','status'].sort()
    for (const item of refreshed.items) {
      assert.deepEqual(Object.keys(item).sort(),allowed)
      assert.match(item.createdAt,/^\d{4}-\d{2}-\d{2}T/)
      assert.match(item.amount,/^\d+\.\d{2}$/)
    }
    assert.equal((await ledger.listOwn(owner.id,2,expected.at(-1))).nextCursor,null)
    for (const limit of [0,51,1.5,NaN,Infinity]) await assert.rejects(ledger.listOwn(owner.id,limit),LedgerInvalid)
    sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${accounts.FINANCE!.id}'
      AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER');`)
    assert.equal((await call('contributions',accounts.FINANCE!.cookie)).status,403,'El historial vuelve a autorizar cada lectura.')
    sql(`UPDATE campaign SET status='CANCELLED' WHERE id='${campaignId}';`)
    await assert.rejects(ledger.start(owner.id,{...input,requestKey:randomUUID()}),LedgerConflict)
    sql(`UPDATE payment_provider SET is_sandbox=false WHERE id='${providerId}';`)
    await assert.rejects(ledger.start(owner.id,{...limited,requestKey:randomUUID()}),LedgerConflict)
    const recovery=execFileSync(process.execPath,['scripts/drill-recovery.mjs'],{
      encoding:'utf8',timeout:90000,env:{...process.env,BROTAR_DRILL_DIR:join(tmpdir(),'brotar-s3-recovery-20261019')}
    })
    assert.match(recovery,/Ensayo completado/)
    assert.match(recovery,/"payments": [1-9]/)
    assert.match(recovery,/"refunds": 1/)
    assert.match(recovery,/"disputes": 1/)
    assert.match(recovery,/"auditLogs": [1-9]/)
    assert.match(recovery,/"statusHistory": [1-9]/)
  } finally {
    await app.close()
    sql(`DELETE FROM dispute WHERE campaign_id IN ('${campaignId}','${rewardCampaign}');
      DELETE FROM refund WHERE contribution_id IN (SELECT id FROM contribution WHERE campaign_id IN ('${campaignId}','${rewardCampaign}'));
      DELETE FROM payment_event WHERE payment_id IN (SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id IN ('${campaignId}','${rewardCampaign}'));
      DELETE FROM payment WHERE contribution_id IN (SELECT id FROM contribution WHERE campaign_id IN ('${campaignId}','${rewardCampaign}'));
      DELETE FROM contribution WHERE campaign_id IN ('${campaignId}','${rewardCampaign}');
      DELETE FROM reward WHERE campaign_id='${rewardCampaign}'; DELETE FROM campaign WHERE id IN ('${campaignId}','${rewardCampaign}');
      DELETE FROM payment_provider WHERE id='${providerId}';
      ${users.map(id=>`DELETE FROM app_user WHERE id='${id}';`).join('\n')}`)
  }
})
