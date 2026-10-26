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
interface Case{id:string;status:string;version:number;financialHold:boolean;messages:{body:string;isInternal:boolean}[];events:unknown[];recommendedAmount:string|null;linkedRefundId:string|null}
interface Refund{id:string;status:string;version:number}
test('S3-11/S3-02 PostgreSQL/HTTP: disputa privada, respuesta, escalamiento, recomendación y devolución con separación de funciones',{timeout:180000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const{container}=readTestDatabaseTarget(config),sql=(s:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const old=process.env.DEMO_PAYMENTS_ENABLED;process.env.DEMO_PAYMENTS_ENABLED='true'
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl(),users:string[]=[],campaignId=randomUUID(),suffix=randomUUID(),password=randomBytes(24).toString('hex')
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'POST')=>fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const account=async(role:string)=>{const email=`dispute-${users.length}-${suffix}@example.invalid`,r=await call('auth/register','',{firstName:'DEMO',lastName:'Ensayo',email,password,demoConsent:true});assert.equal(r.status,201);const{id}=await r.json() as{id:string};users.push(id);if(role!=='REGISTERED_USER')sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`);const login=await call('auth/login','',{email,password});assert.equal(login.status,200);return{id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}}
 const budget=()=>{const keys=[...users.map(id=>`account:${id}`),'ip:127.0.0.1'].map(s=>`'${createHash('sha256').update('mvp-case-write:'+s).digest('hex')}'`);sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN(${keys.join(',')});`)}
 const json=async<T>(r:Response,status=201):Promise<T>=>{const body=await r.json();assert.equal(r.status,status,JSON.stringify(body));return body as T}
 try{
  const owner=await account('REGISTERED_USER'),creator=await account('CREATOR'),support=await account('SUPPORT'),finance=await account('FINANCE'),admin=await account('ADMIN'),other=await account('REGISTERED_USER'),auditor=await account('SUPPORT')
  budget()
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='AUDITOR';INSERT INTO campaign(id,slug,title,campaign_type,creator_user_id,status,published_at,goal_amount,currency_code,starts_at,ends_at) VALUES('${campaignId}','dispute-${suffix}','DEMO Disputas','DONATION','${creator.id}','PUBLISHED',now(),100,'BOB',now()-interval '1 day',now()+interval '1 day');`)
  const payment=await json<{contribution:{id:string;paymentId:string}}>(await call('demo-payments/checkout',owner.cookie,{campaignId,amount:'10.25',currencyCode:'BOB',requestKey:randomUUID(),demoConsent:true})),paymentId=payment.contribution.paymentId
  await json(await call(`demo-payments/${paymentId}/simulate`,owner.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()}),200)
  const file=await json<{id:string}>(await call('files',owner.cookie,{purpose:'SUPPORT_EVIDENCE',visibility:'PRIVATE',originalName:'DEMO-reclamo.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nDEMO synthetic evidence').toString('base64')}))
  const report=await json<{id:string}>(await call('me/support-cases',owner.cookie,{requestId:randomUUID(),campaignId,contributionId:payment.contribution.id,category:'REFUND_REQUEST',subject:'Reclamación sintética de pago DEMO',description:'Requiero revisión de mi aporte ficticio y de su devolución de prueba.',evidenceFileIds:[file.id],confirmed:true}))
  const input={supportCaseId:report.id,paymentId,description:'Reclamo ficticio de prueba por una incidencia del aporte DEMO.',requestKey:randomUUID(),demoConsent:true}
  assert.equal((await call('me/disputes','',input)).status,401);assert.equal((await call('me/disputes',other.cookie,input)).status,404)
  for(const patch of[{description:'corto'},{assignedTo:support.id},{demoConsent:false},{description:'<script>Contenido que no aceptamos</script>'}])assert.equal((await call('me/disputes',owner.cookie,{...input,...patch})).status,400)
  const twins=await Promise.all([call('me/disputes',owner.cookie,input),call('me/disputes',owner.cookie,input)]);let d=await json<Case>(twins[0]!);assert.equal((await json<Case>(twins[1]!)).id,d.id)
  assert.equal((await call(`me/support-cases/${report.id}/messages`,owner.cookie,{requestId:randomUUID(),body:'Intento responder por soporte general a una disputa vinculada.'})).status,404,'La respuesta general no evita el flujo financiero de disputa.')
  assert.equal((await json<{replyAllowed:boolean}>(await call(`me/support-cases/${report.id}`,owner.cookie),200)).replyAllowed,false)
  assert.equal(sql(`SELECT status FROM payment WHERE id='${paymentId}'`),'DISPUTED');assert.equal(sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${campaignId}'`),'10.25','Disputa reserva pero no inventa devolución')
  const ledger=app.get(ContributionLedger),providerId=sql(`SELECT provider_id FROM payment WHERE id='${paymentId}'`),confirmedAt=sql(`SELECT confirmed_at FROM payment WHERE id='${paymentId}'`)
  await assert.rejects(ledger.applyVerifiedEvent({providerId,paymentId,eventId:randomUUID(),state:'CONFIRMED',amount:'10.25',currencyCode:'BOB',externalReference:'wrong-after-dispute'}),LedgerConflict,'No aceptar referencia distinta mientras el pago está disputado')
  assert.equal((await ledger.applyVerifiedEvent({providerId,paymentId,eventId:randomUUID(),state:'FAILED',amount:'10.25',currencyCode:'BOB'})).status,'DISPUTED','Aviso fallido viejo no desconfirma ni retira la reserva')
  assert.equal(sql(`SELECT confirmed_at FROM payment WHERE id='${paymentId}'`),confirmedAt)
  assert.equal((await call('me/disputes',owner.cookie,{...input,requestKey:randomUUID()})).status,409)
  assert.equal((await call(`me/disputes/${d.id}`,other.cookie)).status,404);assert.equal((await call(`admin/disputes/${d.id}`,admin.cookie)).status,200)
  assert.equal((await call(`me/disputes/${d.id}/evidence/${file.id}`,other.cookie)).status,404)
  const evidence=await call(`admin/disputes/${d.id}/evidence/${file.id}`,support.cookie);assert.equal(evidence.status,200);assert.match(evidence.headers.get('cache-control')??'',/no-store/);assert.equal(evidence.headers.get('x-content-type-options'),'nosniff')
  assert.equal((await call(`admin/disputes/${d.id}/evidence/${randomUUID()}`,support.cookie)).status,404)
  budget()
  const act=async(action:string,cookie=support.cookie,patch={})=>call(`admin/disputes/${d.id}/actions`,cookie,{action,expectedVersion:d.version,reason:'Decisión de Soporte basada en evidencia sintética del ensayo.',requestKey:randomUUID(),demoConsent:true,...patch})
  assert.equal((await act('CLAIM',admin.cookie)).status,403);assert.equal((await act('CLAIM',auditor.cookie)).status,403);assert.equal((await act('CLAIM',finance.cookie)).status,403)
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='SUPPORT';INSERT INTO user_role(user_id,role_id) SELECT '${creator.id}',id FROM role WHERE code='SUPPORT';`)
  assert.equal((await act('CLAIM',owner.cookie)).status,403);assert.equal((await act('CLAIM',creator.cookie)).status,403)
  d=await json<Case>(await act('CLAIM',support.cookie,{priority:1}));assert.equal(d.status,'UNDER_REVIEW')
  const note={body:'Nota interna ficticia: no debe aparecer al aportante.',isInternal:true,expectedVersion:d.version,requestKey:randomUUID(),demoConsent:true}
  d=await json<Case>(await call(`admin/disputes/${d.id}/messages`,support.cookie,note));assert.equal(d.messages.length,1)
  assert.equal((await json<Case>(await call(`me/disputes/${d.id}`,owner.cookie),200)).messages.length,0)
  assert.equal((await call(`me/disputes/${d.id}/messages`,owner.cookie,{...note,expectedVersion:d.version})).status,400)
  d=await json<Case>(await act('REQUEST_INFO'));assert.equal(d.status,'AWAITING_RESPONSE')
  const answer={body:'Adjunto explicación sintética solicitada para el ensayo.',expectedVersion:d.version,requestKey:randomUUID(),demoConsent:true}
  d=await json<Case>(await call(`me/disputes/${d.id}/messages`,owner.cookie,answer));assert.equal(d.status,'UNDER_REVIEW');assert.ok(d.messages.every(m=>!m.isInternal))
  assert.equal((await call(`me/disputes/${d.id}/messages`,owner.cookie,answer)).status,201,'Mensaje idempotente')
  d=await json<Case>(await act('ESCALATE'));assert.equal(d.status,'ESCALATED');assert.equal((await act('RESOLVE_NO_REFUND')).status,409)
  d=await json<Case>(await act('CLAIM'));budget()
  assert.equal((await act('RECOMMEND_REFUND',support.cookie,{recommendedAmount:'10.26'})).status,409)
  d=await json<Case>(await act('RECOMMEND_REFUND',support.cookie,{recommendedAmount:'3.10'}));assert.equal(d.status,'RESOLVED');assert.equal(d.financialHold,true)
  assert.equal(sql(`SELECT count(*) FROM refund WHERE payment_id='${paymentId}'`),'0','Soporte no crea pagos ni devoluciones')
  assert.equal((await act('CLOSE')).status,409);assert.equal(sql(`SELECT status FROM payment WHERE id='${paymentId}'`),'DISPUTED','Resuelto no libera reserva recomendada pendiente')
  const request={paymentId,disputeId:d.id,amount:'3.10',reasonCode:'DISPUTE_RESOLUTION',reason:'Solicitud de la devolución recomendada en esta disputa DEMO.',requestKey:randomUUID(),demoConsent:true}
  assert.equal((await call('me/refunds',owner.cookie,{...request,amount:'2.00'})).status,409)
  let refund=await json<Refund>(await call('me/refunds',owner.cookie,request))
  const fin=async(action:string)=>call(`admin/finance/refunds/${refund.id}/actions`,finance.cookie,{action,expectedVersion:refund.version,reason:'Evaluación financiera de la resolución de prueba sintética.',requestKey:randomUUID(),demoConsent:true})
  refund=await json<Refund>(await fin('REJECT'));d=await json<Case>(await call(`admin/disputes/${d.id}`,support.cookie),200);assert.equal(d.financialHold,true);assert.equal(d.linkedRefundId,null)
  d=await json<Case>(await act('REOPEN'));assert.equal(d.status,'UNDER_REVIEW');d=await json<Case>(await act('RECOMMEND_REFUND',support.cookie,{recommendedAmount:'3.10'}))
  refund=await json<Refund>(await call('me/refunds',owner.cookie,{...request,requestKey:randomUUID()}));assert.equal((await act('CLOSE')).status,409)
  refund=await json<Refund>(await fin('AUTHORIZE'));refund=await json<Refund>(await fin('COMPLETE_DEMO'));assert.equal(refund.status,'REFUNDED')
  d=await json<Case>(await call(`admin/disputes/${d.id}`,support.cookie),200);assert.equal(d.financialHold,false);d=await json<Case>(await act('CLOSE'));assert.equal(d.status,'CLOSED')
  assert.equal(sql(`SELECT status FROM payment WHERE id='${paymentId}'`),'CONFIRMED');assert.equal(sql(`SELECT status FROM contribution WHERE id='${payment.contribution.id}'`),'CONFIRMED');assert.equal(sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${campaignId}'`),'7.15')
  assert.equal((await call(`me/disputes/${d.id}/messages`,owner.cookie,{...answer,expectedVersion:d.version,requestKey:randomUUID()})).status,409)
  budget()
  // La parte restante puede reclamarse con otra incidencia; resolver sin devolución restaura estado, no altera dinero.
  const report2=await json<{id:string}>(await call('me/support-cases',owner.cookie,{requestId:randomUUID(),campaignId,contributionId:payment.contribution.id,category:'OTHER',subject:'Segunda revisión del saldo restante',description:'Esta incidencia de ensayo revisa el saldo que aún no se devolvió.',evidenceFileIds:[],confirmed:true}))
  d=await json<Case>(await call('me/disputes',owner.cookie,{...input,supportCaseId:report2.id,requestKey:randomUUID()}));d=await json<Case>(await act('CLAIM'));d=await json<Case>(await act('RESOLVE_NO_REFUND'));assert.equal(sql(`SELECT status FROM payment WHERE id='${paymentId}'`),'CONFIRMED');d=await json<Case>(await act('CLOSE'))
  assert.equal(sql(`SELECT has_table_privilege('brotar_app','brotar_extension.demo_dispute_event','UPDATE') OR has_table_privilege('brotar_app','public.support_case_message','UPDATE')`),'f')
  sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${support.id}' AND role_id=(SELECT id FROM role WHERE code='SUPPORT');`);assert.equal((await act('REOPEN')).status,403)
  assert.equal((await call('admin/disputes?priority=6',admin.cookie)).status,400);process.env.DEMO_PAYMENTS_ENABLED='false';assert.equal((await call('me/disputes',owner.cookie)).status,404)
 }finally{
  await app.close();if(old===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=old
  sql(`UPDATE brotar_extension.demo_dispute SET linked_refund_id=NULL WHERE dispute_id IN(SELECT id FROM dispute WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_refund_event WHERE refund_id IN(SELECT r.id FROM refund r JOIN contribution c ON c.id=r.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_refund WHERE refund_id IN(SELECT r.id FROM refund r JOIN contribution c ON c.id=r.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM refund WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_dispute_message WHERE dispute_id IN(SELECT id FROM dispute WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_dispute_event WHERE dispute_id IN(SELECT id FROM dispute WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_dispute WHERE dispute_id IN(SELECT id FROM dispute WHERE campaign_id='${campaignId}');DELETE FROM dispute WHERE campaign_id='${campaignId}';DELETE FROM brotar_extension.support_case_evidence WHERE case_id IN(SELECT id FROM support_case WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.support_case_context WHERE case_id IN(SELECT id FROM support_case WHERE campaign_id='${campaignId}');DELETE FROM support_case WHERE campaign_id='${campaignId}';DELETE FROM brotar_extension.demo_event WHERE payment_id IN(SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM payment_event WHERE payment_id IN(SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM payment WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${campaignId}');DELETE FROM contribution WHERE campaign_id='${campaignId}';DELETE FROM campaign WHERE id='${campaignId}';`)
  for(const id of users)sql(`UPDATE file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE uploaded_by='${id}';DELETE FROM audit_log WHERE actor_user_id='${id}';DELETE FROM app_user WHERE id='${id}';`)
 }
})
