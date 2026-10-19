import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { ContributionLedger, type VerifiedPaymentEvent } from '../src/contributions/infrastructure/contribution-ledger'
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
    const registered=await call('auth/register','',{ firstName:'Ensayo',lastName:'Responsabilidades',email,password,demoConsent:true })
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
