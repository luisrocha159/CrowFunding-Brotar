import 'reflect-metadata'
import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {createHash,randomUUID,randomBytes} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {ContributionLedger} from '../src/contributions/infrastructure/contribution-ledger'
import {LedgerConflict} from '../src/contributions/domain/payment'
interface Refund {id:string;version:number;status:string;events:unknown[];externalReference:string|null}
test('S3-09 PostgreSQL/HTTP: devolución parcial/total DEMO, autorizaciones, referencias, límites, reservas, idempotencia y estados',{timeout:120000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const{container}=readTestDatabaseTarget(config),sql=(s:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const old=process.env.DEMO_PAYMENTS_ENABLED;process.env.DEMO_PAYMENTS_ENABLED='true'
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl(),users:string[]=[],campaignId=randomUUID(),suffix=randomUUID(),password=randomBytes(24).toString('hex')
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'POST')=>fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const account=async(role:string)=>{const email=`refund-${users.length}-${suffix}@example.invalid`;const r=await call('auth/register','',{firstName:'DEMO',lastName:'Ensayo',email,password,demoConsent:true});assert.equal(r.status,201);const{id}=await r.json() as{id:string};users.push(id);if(role!=='REGISTERED_USER')sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`);const login=await call('auth/login','',{email,password});assert.equal(login.status,200);return{id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}}
 const budget=()=>{const keys=[...users.map(id=>`account:${id}`),'ip:127.0.0.1'].map(s=>`'${createHash('sha256').update('mvp-case-write:'+s).digest('hex')}'`);sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN(${keys.join(',')});`)}
 try{
  const owner=await account('REGISTERED_USER'),creator=await account('CREATOR'),finance=await account('FINANCE'),admin=await account('ADMIN'),auditor=await account('FINANCE'),other=await account('REGISTERED_USER')
  budget()
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='AUDITOR';INSERT INTO campaign(id,slug,title,campaign_type,creator_user_id,status,published_at,goal_amount,currency_code,starts_at,ends_at) VALUES('${campaignId}','refund-${suffix}','DEMO Devoluciones','DONATION','${creator.id}','PUBLISHED',now(),100,'BOB',now()-interval '1 day',now()+interval '1 day');`)
  const checkout=async(amount:string)=>{const r=await call('demo-payments/checkout',owner.cookie,{campaignId,amount,currencyCode:'BOB',requestKey:randomUUID(),demoConsent:true});assert.equal(r.status,201);const value=await r.json() as{contribution:{id:string;paymentId:string}};assert.equal((await call(`demo-payments/${value.contribution.paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})).status,200);return value.contribution}
  const paid=await checkout('10.25'),paymentId=paid.paymentId
  const input={paymentId,amount:'3.10',reasonCode:'SPONSOR_REQUEST',reason:'Solicitud de devolución parcial de prueba, sin dinero real.',requestKey:randomUUID(),demoConsent:true}
  assert.equal((await call('me/refunds','',input)).status,401)
  for(const patch of [{amount:'0'},{amount:3},{amount:'0.001'},{demoConsent:false},{approvedBy:finance.id},{reason:'corto'}])assert.equal((await call('me/refunds',owner.cookie,{...input,...patch})).status,400)
  assert.equal((await call('me/refunds',other.cookie,input)).status,404)
  const twins=await Promise.all([call('me/refunds',owner.cookie,input),call('me/refunds',owner.cookie,input)]);assert.deepEqual(twins.map(r=>r.status),[201,201]);let first=await twins[0]!.json() as Refund;assert.equal((await twins[1]!.json() as Refund).id,first.id)
  assert.equal(sql(`SELECT count(*) FROM refund WHERE payment_id='${paymentId}'`),'1')
  assert.equal((await call('me/refunds',owner.cookie,{...input,requestKey:randomUUID()})).status,409,'No segunda solicitud activa para el mismo pago')
  assert.equal((await call('me/refunds',owner.cookie,{...input,amount:'4.00'})).status,409,'Misma clave no cambia importe')
  assert.equal((await call(`me/refunds/${first.id}`,other.cookie)).status,404)
  assert.equal((await call(`admin/finance/refunds/${first.id}`,admin.cookie)).status,200)
  budget()
  const act=(r:Refund,action:string,cookie=finance.cookie,requestKey=randomUUID(),patch={})=>call(`admin/finance/refunds/${r.id}/actions`,cookie,{expectedVersion:r.version,action,reason:'Operación financiera DEMO comprobada con evidencia sintética.',requestKey,demoConsent:true,...patch})
  assert.equal((await act(first,'AUTHORIZE',admin.cookie)).status,403)
  assert.equal((await act(first,'AUTHORIZE',auditor.cookie)).status,403)
  assert.equal((await act(first,'COMPLETE_DEMO')).status,409,'No completar antes de autorizar')
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='FINANCE';INSERT INTO user_role(user_id,role_id) SELECT '${creator.id}',id FROM role WHERE code='FINANCE';`)
  assert.equal((await act(first,'AUTHORIZE',owner.cookie)).status,403)
  assert.equal((await act(first,'AUTHORIZE',creator.cookie)).status,403)
  const organizationId=randomUUID()
  try{
   sql(`INSERT INTO organization(id,slug,legal_name,organization_type_id,created_by) SELECT '${organizationId}','refund-org-${suffix}','DEMO Organización de ensayo',id,'${creator.id}' FROM organization_type LIMIT 1;INSERT INTO organization_member(organization_id,user_id,organization_role) VALUES('${organizationId}','${creator.id}','OWNER');INSERT INTO organization_member(organization_id,user_id,joined_at,left_at) VALUES('${organizationId}','${finance.id}',now()-interval '1 day',now()+interval '1 day');UPDATE campaign SET organization_id='${organizationId}' WHERE id='${campaignId}';`)
   assert.equal((await act(first,'AUTHORIZE')).status,403,'Una baja futura no permite autooperar como miembro todavía vigente')
  }finally{sql(`UPDATE campaign SET organization_id=NULL WHERE id='${campaignId}';DELETE FROM organization WHERE id='${organizationId}';`)}
  const key=randomUUID(),authorized=await act(first,'AUTHORIZE',finance.cookie,key);assert.equal(authorized.status,201);const processing=await authorized.json() as Refund;assert.equal(processing.status,'PROCESSING')
  assert.equal((await act(first,'AUTHORIZE',finance.cookie,key)).status,201,'Reintento con misma clave devuelve operación existente')
  assert.equal((await act(first,'AUTHORIZE')).status,409,'Versión anterior no escribe')
  const completed=await act(processing,'COMPLETE_DEMO');assert.equal(completed.status,201);first=await completed.json() as Refund;assert.equal(first.status,'REFUNDED');assert.equal(first.events.length,3);assert.equal(first.externalReference,`DEMO-REFUND:${first.id}`)
  assert.equal(sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${campaignId}'`),'7.15')
  assert.equal(sql(`SELECT status FROM payment WHERE id='${paymentId}'`),'CONFIRMED')
  assert.equal((await act(first,'COMPLETE_DEMO')).status,409)
  budget()
  const remaining=await call('me/refunds',owner.cookie,{...input,amount:'7.15',requestKey:randomUUID()});assert.equal(remaining.status,201);const second=await remaining.json() as Refund
  const p2=await act(second,'AUTHORIZE');assert.equal(p2.status,201);const done2=await act(await p2.json() as Refund,'COMPLETE_DEMO');assert.equal(done2.status,201)
  assert.equal(sql(`SELECT status FROM payment WHERE id='${paymentId}'`),'REFUNDED');assert.equal(sql(`SELECT status FROM contribution WHERE id='${paid.id}'`),'REFUNDED');assert.equal(sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${campaignId}'`),'0.00')
  assert.equal((await call(`me/contributions/${paid.id}/receipt`,owner.cookie)).status,409)
  assert.equal((await call(`demo-payments/${paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})).status,200);assert.equal(sql(`SELECT status FROM payment WHERE id='${paymentId}'`),'REFUNDED','Evento antiguo no reabre pago devuelto')
  await assert.rejects(app.get(ContributionLedger).applyVerifiedEvent({providerId:sql(`SELECT provider_id FROM payment WHERE id='${paymentId}'`),paymentId,eventId:randomUUID(),state:'CONFIRMED',amount:'10.25',currencyCode:'BOB',externalReference:'wrong-after-refund'}),LedgerConflict,'Referencia incompatible sigue rechazada tras devolución total')
  assert.equal((await call('me/refunds',owner.cookie,{...input,amount:'0.01',requestKey:randomUUID()})).status,409)
  const nextPayment=await checkout('2.00');const newInput={...input,paymentId:nextPayment.paymentId,amount:'1.00',requestKey:randomUUID()}
  const thirdResponse=await call('me/refunds',owner.cookie,newInput);assert.equal(thirdResponse.status,201);const third=await thirdResponse.json() as Refund
  const authorized3=await act(third,'AUTHORIZE');assert.equal(authorized3.status,201);assert.equal((await act(await authorized3.json() as Refund,'FAIL_DEMO')).status,201)
  const fourthResponse=await call('me/refunds',owner.cookie,{...newInput,amount:'2.00',requestKey:randomUUID()});assert.equal(fourthResponse.status,201);const fourth=await fourthResponse.json() as Refund;assert.equal((await act(fourth,'REJECT')).status,201)
  assert.equal(sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${campaignId}'`),'2.00','Rechazo/fallo no devuelve ni descuenta fondos')
  budget()
  const accountId=randomUUID(),disbursementId=randomUUID()
  sql(`INSERT INTO payout_account(id,user_id,account_holder_name,currency_code,status) VALUES('${accountId}','${creator.id}','DEMO Destino ficticio','BOB','VERIFIED');INSERT INTO disbursement(id,campaign_id,payout_account_id,beneficiary_user_id,gross_amount,currency_code) VALUES('${disbursementId}','${campaignId}','${accountId}','${creator.id}',2,'BOB');`)
  assert.equal((await call('me/refunds',owner.cookie,{...newInput,requestKey:randomUUID()})).status,409,'No compromete fondos ya destinados a desembolso')
  sql(`DELETE FROM disbursement WHERE id='${disbursementId}';DELETE FROM payout_account WHERE id='${accountId}';`)
  assert.equal((await call('me/refunds',owner.cookie,{...newInput,reasonCode:'GOAL_NOT_REACHED',requestKey:randomUUID()})).status,400)
  const races=await Promise.all([call('me/refunds',owner.cookie,{...newInput,requestKey:randomUUID()}),call('me/refunds',owner.cookie,{...newInput,requestKey:randomUUID()})]);assert.deepEqual(races.map(r=>r.status).sort(),[201,409])
  assert.equal(sql(`SELECT has_column_privilege('brotar_app','public.refund','amount','UPDATE')`),'f','API no altera importe original')
  assert.equal(sql(`SELECT has_table_privilege('brotar_app','brotar_extension.demo_refund_event','UPDATE') OR has_table_privilege('brotar_app','brotar_extension.demo_refund_event','DELETE')`),'f')
  const live=await(await call('admin/finance/refunds?status=REQUESTED',finance.cookie)).json() as{items:Refund[]};const active=live.items.find(r=>r.id!==first.id)!;assert.ok(active)
  sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${finance.id}' AND role_id=(SELECT id FROM role WHERE code='FINANCE');`)
  assert.equal((await act(active,'AUTHORIZE')).status,403)
  process.env.DEMO_PAYMENTS_ENABLED='false';assert.equal((await call('me/refunds',owner.cookie)).status,404)
 }finally{
  await app.close();if(old===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=old
  const fixtureAccounts=sql(`SELECT string_agg(quote_literal(payout_account_id::text),',') FROM disbursement WHERE campaign_id='${campaignId}'`)
  sql(`DELETE FROM disbursement WHERE campaign_id='${campaignId}';${fixtureAccounts?`DELETE FROM payout_account WHERE id IN(${fixtureAccounts});`:''}DELETE FROM brotar_extension.demo_refund_event WHERE refund_id IN(SELECT r.id FROM refund r JOIN contribution c ON c.id=r.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_refund WHERE refund_id IN(SELECT r.id FROM refund r JOIN contribution c ON c.id=r.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM refund WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_event WHERE payment_id IN(SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM payment_event WHERE payment_id IN(SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM payment WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${campaignId}');DELETE FROM contribution WHERE campaign_id='${campaignId}';DELETE FROM campaign WHERE id='${campaignId}';`)
  for(const id of users)sql(`DELETE FROM audit_log WHERE actor_user_id='${id}';DELETE FROM app_user WHERE id='${id}';`)
 }
})
