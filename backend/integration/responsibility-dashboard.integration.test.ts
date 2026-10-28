import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'

test('S3-25: acceso y agregados del panel por responsabilidad sin filtrar datos de otras áreas',{timeout:90000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container}=readTestDatabaseTarget(config),admin=(sql:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:15000}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl(),users:string[]=[],campaigns:string[]=[],suffix=randomUUID(),password=randomBytes(24).toString('hex')
 const call=(path:string,cookie='',body?:unknown)=>fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1'},...(body?{body:JSON.stringify(body)}:{})})
 const expected:Record<string,string[]>={
  REVIEWER:['campaigns','accountabilityAlerts','closureAlerts'],COMPLIANCE:['identityAlerts'],
  FINANCE:['campaigns','accountabilityAlerts','closureAlerts','financeAlerts'],SUPPORT:['supportAlerts','accountabilityAlerts','closureAlerts','disputeAlerts'],
  ADMIN:['campaigns','catalogs','parties','supportAlerts','identityAlerts','accountabilityAlerts','closureAlerts','financeAlerts','disputeAlerts'],
  AUDITOR:['campaigns','catalogs','parties','supportAlerts','accountabilityAlerts','closureAlerts','financeAlerts','disputeAlerts']
 }
 const fixture=Object.fromEntries(['campaign','contribution','refundContribution','disputeContribution','payment','refundPayment','disputePayment','refund','payout','disbursement','reconciliation','case','dispute'].map(k=>[k,randomUUID()])) as Record<string,string>
 const seedKey=()=>randomBytes(32).toString('hex')
 try{
  assert.equal((await call('administration/dashboard')).status,401)
  for(const role of ['REGISTERED_USER','CREATOR','SPONSOR',...Object.keys(expected)]){
   const email=`dash-${role}-${suffix}@example.invalid`,r=await call('auth/register','',{firstName:'DEMO',lastName:'Panel',email,password,demoConsent:true});assert.equal(r.status,201);const {id}=await r.json() as{id:string};users.push(id)
   if(role!=='REGISTERED_USER')admin(`INSERT INTO public.user_role(user_id,role_id) SELECT '${id}',id FROM public.role WHERE code='${role}';`)
   const login=await call('auth/login','',{email,password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0]!
   const result=await call('administration/dashboard',cookie);assert.equal(result.status,expected[role]?200:403,`${role} accede según responsabilidad`)
   if(!expected[role])continue
   assert.equal(result.headers.get('cache-control'),'no-store');const data=await result.json() as Record<string,unknown>
   assert.deepEqual(Object.keys(data).sort(),['readOnly','asOf',...expected[role]!].sort(),`${role} recibe solo sus agregados`)
   assert.ok(typeof data.asOf==='string'&&Number.isFinite(Date.parse(data.asOf)))
   assert.equal(data.readOnly,role==='AUDITOR')
   assert.ok(!JSON.stringify(data).includes(email),'No se exponen correos ni documentos en los agregados.')
   if(role==='ADMIN'){
    const active=randomUUID(),closed=randomUUID(),old=randomUUID(),latest=randomUUID();campaigns.push(active,closed)
    admin(`INSERT INTO public.campaign(id,slug,creator_user_id,title,campaign_type,goal_amount,currency_code,status)
      VALUES('${active}','dash-${active}','${id}','DEMO Ejecución','DONATION',100,'BOB','IN_EXECUTION'),('${closed}','dash-${closed}','${id}','DEMO Cerrada','DONATION',100,'BOB','CLOSED');
      INSERT INTO public.accountability_report(id,campaign_id,currency_code,is_final,status,created_at)
      VALUES('${old}','${active}','BOB',true,'CHANGES_REQUESTED',clock_timestamp()-interval '2 days'),('${latest}','${active}','BOB',true,'APPROVED',clock_timestamp()-interval '1 day');
      INSERT INTO public.support_case(user_id,campaign_id,subject,description) VALUES('${id}','${closed}','DEMO Histórico previo','DEMO Caso histórico en campaña ya cerrada');`)
    const snapshot=await (await call('administration/dashboard',cookie)).json() as {closureAlerts:{blocked:number};accountabilityAlerts:{requiresInformation:number;awaitingReview:number}}
    assert.equal(snapshot.closureAlerts.blocked,(data.closureAlerts as {blocked:number}).blocked,'No marcar cerradas ni una versión antigua corregida como bloqueo actual.')
    assert.equal(snapshot.accountabilityAlerts.requiresInformation,(data.accountabilityAlerts as {requiresInformation:number}).requiresInformation,'Solo la rendición final vigente afecta el contador.')
    // Only the current revision of a periodic report contributes to operational alerts.
    const periodicOld=randomUUID(),periodicCurrent=randomUUID(),periodicDoc=randomUUID()
    admin(`INSERT INTO public.accountability_report(id,campaign_id,currency_code,is_final,status) VALUES('${periodicOld}','${active}','BOB',false,'CHANGES_REQUESTED'),('${periodicCurrent}','${active}','BOB',false,'APPROVED');
      INSERT INTO brotar_extension.accountability_document(id,campaign_id,current_report_id,created_by) VALUES('${periodicDoc}','${active}','${periodicCurrent}','${id}');
      INSERT INTO brotar_extension.accountability_revision(report_id,document_id,version) VALUES('${periodicOld}','${periodicDoc}',1),('${periodicCurrent}','${periodicDoc}',2);`)
    const periodicSnapshot=await (await call('administration/dashboard',cookie)).json() as typeof snapshot
    assert.equal(periodicSnapshot.accountabilityAlerts.requiresInformation,snapshot.accountabilityAlerts.requiresInformation,'Una corrección periódica ya atendida no permanece en alertas.')
    admin(`UPDATE public.accountability_report SET status='SUBMITTED' WHERE id='${latest}';`)
    const pending=await (await call('administration/dashboard',cookie)).json() as typeof snapshot
    assert.equal(pending.closureAlerts.blocked,snapshot.closureAlerts.blocked+1)
    assert.equal(pending.accountabilityAlerts.awaitingReview,snapshot.accountabilityAlerts.awaitingReview+1)
    const f=fixture,before=data.financeAlerts as Record<string,number>,beforeDisputes=data.disputeAlerts as {open:number;escalated:number}
    campaigns.push(f.campaign!)
    const provider=admin("SELECT id FROM public.payment_provider WHERE code='BROTAR_INTERNAL_DEMO'")
    admin(`INSERT INTO public.campaign(id,slug,creator_user_id,title,campaign_type,goal_amount,currency_code) VALUES('${f.campaign}','dash-money-${f.campaign}','${id}','DEMO Contadores financieros','DONATION',100,'BOB');
     INSERT INTO public.contribution(id,user_id,campaign_id,amount,currency_code) VALUES('${f.contribution}','${id}','${f.campaign}',10,'BOB'),('${f.refundContribution}','${id}','${f.campaign}',10,'BOB'),('${f.disputeContribution}','${id}','${f.campaign}',10,'BOB');
     INSERT INTO public.payment(id,contribution_id,provider_id,idempotency_key,amount,currency_code,status,created_at,expires_at) VALUES('${f.payment}','${f.contribution}','${provider}','dash-${f.payment}',10,'BOB','PENDING',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour');
     INSERT INTO public.payment(id,contribution_id,provider_id,idempotency_key,amount,currency_code,status,confirmed_at) VALUES('${f.refundPayment}','${f.refundContribution}','${provider}','dash-${f.refundPayment}',10,'BOB','CONFIRMED',clock_timestamp()),('${f.disputePayment}','${f.disputeContribution}','${provider}','dash-${f.disputePayment}',10,'BOB','CONFIRMED',clock_timestamp());
     INSERT INTO brotar_extension.demo_event(request_key,request_hash,payment_id,observed_status,amount,currency_code,external_reference,processing) VALUES('${seedKey()}','${seedKey()}','${f.payment}','CONFIRMED',10,'BOB','dash-${f.payment}','NEEDS_REVIEW'),('${seedKey()}','${seedKey()}','${f.payment}','CONFIRMED',10,'BOB','dash-${f.payment}','NEEDS_REVIEW');
     INSERT INTO public.reconciliation(id,provider_id,period_start,period_end) VALUES('${f.reconciliation}','${provider}',CURRENT_DATE,CURRENT_DATE);
     INSERT INTO brotar_extension.demo_reconciliation(reconciliation_id,currency_code,request_key,request_hash) VALUES('${f.reconciliation}','BOB','${seedKey()}','${seedKey()}');
     INSERT INTO public.reconciliation_item(reconciliation_id,status) VALUES('${f.reconciliation}','MISSING_PROVIDER'),('${f.reconciliation}','MATCHED');
     INSERT INTO public.refund(id,payment_id,contribution_id,amount,currency_code,provider_payload) VALUES('${f.refund}','${f.refundPayment}','${f.refundContribution}',1,'BOB','{"mode":"DEMO"}');
     INSERT INTO brotar_extension.demo_refund(refund_id,request_key,request_hash) VALUES('${f.refund}','${seedKey()}','${seedKey()}');
     INSERT INTO public.payout_account(id,user_id,account_holder_name,currency_code,status) VALUES('${f.payout}','${id}','DEMO Titular','BOB','VERIFIED');
     INSERT INTO public.disbursement(id,campaign_id,payout_account_id,beneficiary_user_id,gross_amount,currency_code) VALUES('${f.disbursement}','${f.campaign}','${f.payout}','${id}',1,'BOB');
     INSERT INTO brotar_extension.demo_disbursement(disbursement_id,requested_by,destination_version,destination_reference,destination_holder,request_key,request_hash) VALUES('${f.disbursement}','${id}',1,'DEMO-CUENTA','DEMO Titular','${seedKey()}','${seedKey()}');
     INSERT INTO public.support_case(id,user_id,campaign_id,subject,description) VALUES('${f.case}','${id}','${f.campaign}','DEMO Disputa','DEMO Datos privados no incluidos en el panel');
     INSERT INTO public.dispute(id,contribution_id,payment_id,campaign_id,support_case_id,raised_by,reason_code,description) VALUES('${f.dispute}','${f.disputeContribution}','${f.disputePayment}','${f.campaign}','${f.case}','${id}','OTHER','DEMO Disputa privada');
     INSERT INTO brotar_extension.demo_dispute(dispute_id,support_case_id,payment_id,request_key,request_hash,hold_amount) VALUES('${f.dispute}','${f.case}','${f.disputePayment}','${seedKey()}','${seedKey()}',1);`)
    const query=async()=>await (await call('administration/dashboard',cookie)).json() as {financeAlerts:Record<string,number>;disputeAlerts:{open:number;escalated:number}}
    const seeded=await query()
    assert.deepEqual(seeded.financeAlerts,{...before,paymentsTotal:before.paymentsTotal!+3,paymentsPending:before.paymentsPending!+1,paymentsOverdue:before.paymentsOverdue!+1,paymentsNeedingReview:before.paymentsNeedingReview!+1,reconciliationOpen:before.reconciliationOpen!+1,reconciliationUnresolved:before.reconciliationUnresolved!+1,refundsRequested:before.refundsRequested!+1,disbursementsPending:before.disbursementsPending!+1},'Contar pagos distintos, diferencias reales y obligaciones por estado; MATCHED no es una diferencia.')
    assert.equal(seeded.disputeAlerts.open,beforeDisputes.open+1)
    admin(`UPDATE public.disbursement SET status='APPROVED' WHERE id='${f.disbursement}';UPDATE public.refund SET status='PROCESSING' WHERE id='${f.refund}';UPDATE public.dispute SET status='ESCALATED' WHERE id='${f.dispute}';`)
    const approved=await query();assert.equal(approved.financeAlerts.disbursementsApproved,before.disbursementsApproved!+1);assert.equal(approved.financeAlerts.disbursementsPending,before.disbursementsPending);assert.equal(approved.financeAlerts.refundsProcessing,before.refundsProcessing!+1);assert.equal(approved.disputeAlerts.escalated,beforeDisputes.escalated+1)
    admin(`UPDATE public.disbursement SET status='PROCESSING' WHERE id='${f.disbursement}';`)
    assert.equal((await query()).financeAlerts.disbursementsProcessing,before.disbursementsProcessing!+1)
    admin(`UPDATE public.disbursement SET status='COMPLETED' WHERE id='${f.disbursement}';UPDATE public.refund SET status='REFUNDED' WHERE id='${f.refund}';UPDATE public.dispute SET status='CLOSED' WHERE id='${f.dispute}';UPDATE public.reconciliation_item SET status='RESOLVED' WHERE reconciliation_id='${f.reconciliation}';UPDATE public.reconciliation SET status='CLOSED' WHERE id='${f.reconciliation}';UPDATE brotar_extension.demo_event SET processing='RECONCILED' WHERE payment_id='${f.payment}';UPDATE public.payment SET status='FAILED' WHERE id='${f.payment}';`)
    const finished=await query();assert.deepEqual(finished.financeAlerts,{...before,paymentsTotal:before.paymentsTotal!+3});assert.equal(finished.disputeAlerts.open,beforeDisputes.open)
   }
   admin(`UPDATE public.user_role SET revoked_at=clock_timestamp() WHERE user_id='${id}' AND role_id IN(SELECT id FROM public.role WHERE code='${role}');`)
   assert.equal((await call('administration/dashboard',cookie)).status,403,'La sesión no conserva el acceso después de revocar el rol.')
  }
 }finally{await app.close();const f=fixture;admin(`DELETE FROM brotar_extension.demo_dispute WHERE dispute_id='${f.dispute}';DELETE FROM public.dispute WHERE id='${f.dispute}';DELETE FROM brotar_extension.demo_refund WHERE refund_id='${f.refund}';DELETE FROM public.refund WHERE id='${f.refund}';DELETE FROM brotar_extension.demo_disbursement WHERE disbursement_id='${f.disbursement}';DELETE FROM public.disbursement WHERE id='${f.disbursement}';DELETE FROM public.payout_account WHERE id='${f.payout}';DELETE FROM public.reconciliation WHERE id='${f.reconciliation}';DELETE FROM brotar_extension.demo_event WHERE payment_id='${f.payment}';DELETE FROM public.payment WHERE id IN('${f.payment}','${f.refundPayment}','${f.disputePayment}');DELETE FROM public.contribution WHERE campaign_id='${f.campaign}';DELETE FROM public.status_history WHERE entity_id IN('${f.payment}','${f.refundPayment}','${f.disputePayment}','${f.refund}','${f.dispute}','${f.disbursement}');`);for(const id of campaigns)admin(`DELETE FROM public.support_case WHERE campaign_id='${id}';DELETE FROM brotar_extension.accountability_revision WHERE document_id IN(SELECT id FROM brotar_extension.accountability_document WHERE campaign_id='${id}');DELETE FROM brotar_extension.accountability_document WHERE campaign_id='${id}';DELETE FROM public.accountability_report WHERE campaign_id='${id}';DELETE FROM public.status_history WHERE entity_type='CAMPAIGN' AND entity_id='${id}';DELETE FROM public.campaign WHERE id='${id}';`);for(const id of users)admin(`DELETE FROM public.audit_log WHERE actor_user_id='${id}';DELETE FROM public.app_user WHERE id='${id}';`)}
})
