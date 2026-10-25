import 'reflect-metadata'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {readTestDatabaseTarget} from './database-target'
import {approveDemoIdentity,removeDemoIdentityFixtures} from './demo-identity-fixture'
import type {ProgressState} from '../src/campaign-progress/infrastructure/progress.repository'
interface Cycle{id:string;version:number;status:string;outcome:string;cancelRequested:boolean;cancellationCaseId:string|null;funds:{disbursed:string};closeBlockers:string[]}
interface Destination{destination:{id:string;version:number;status:string;reference:string};events:unknown[]}
interface Payout{id:string;version:number;status:string;externalReference:string|null;destinationReference:string;events:unknown[]}
test('S3-23 → S3-08 PostgreSQL/HTTP: ciclo completo DEMO, destino, desembolsos, cierres y exclusión financiera',{timeout:180000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const{container}=readTestDatabaseTarget(config),sql=(s:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const old=process.env.DEMO_PAYMENTS_ENABLED;process.env.DEMO_PAYMENTS_ENABLED='true'
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));const suffix=randomUUID(),ip=`cycle-fixture-${suffix}`
 app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:ip});next()});await app.listen(0,'127.0.0.1');const base=await app.getUrl(),users:string[]=[],campaigns:string[]=[],organizations:string[]=[],password=randomBytes(24).toString('hex')
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'POST')=>fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const json=async<T>(r:Response,status=201):Promise<T>=>{const body=await r.json();assert.equal(r.status,status,JSON.stringify(body));return body as T}
 const account=async(role:string)=>{const email=`cycle-${users.length}-${suffix}@example.invalid`;const{id}=await json<{id:string}>(await call('auth/register','',{firstName:'DEMO',lastName:'Ensayo',email,password,demoConsent:true}));users.push(id);if(role!=='REGISTERED_USER')sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`);const r=await call('auth/login','',{email,password});assert.equal(r.status,200);return{id,cookie:r.headers.get('set-cookie')!.split(';')[0]!}}
 const budget=()=>sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN(${[...users.map(id=>`account:${id}`),`ip:${ip}`].map(s=>`'${createHash('sha256').update('mvp-case-write:'+s).digest('hex')}'`).join(',')});`)
 let fixtureCurrency:string|null=null
 try{
  const creator=await account('CREATOR'),sponsor=await account('REGISTERED_USER'),finance=await account('FINANCE'),admin=await account('ADMIN'),auditor=await account('FINANCE'),other=await account('CREATOR'),support=await account('SUPPORT');budget()
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code IN ('AUDITOR','ADMIN');`)
  const seed=(model='ALL_OR_NOTHING',goal='10.00')=>{const id=randomUUID();campaigns.push(id);sql(`INSERT INTO campaign(id,slug,title,campaign_type,creator_user_id,status,published_at,goal_amount,currency_code,funding_model,starts_at,ends_at) VALUES('${id}','cycle-${id}','DEMO Huerto Ñandú','DONATION','${creator.id}','PUBLISHED',now(),${goal},'BOB','${model}',now()-interval '1 day',now()+interval '1 day');`);return id}
  const paid=async(id:string,amount:string,confirm=true,rewardId:string|null=null)=>{const r=await json<{contribution:{id:string;paymentId:string}}>(await call('demo-payments/checkout',sponsor.cookie,{campaignId:id,amount,rewardId,currencyCode:'BOB',requestKey:randomUUID(),demoConsent:true}));if(confirm)assert.equal((await call(`demo-payments/${r.contribution.paymentId}/simulate`,sponsor.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()})).status,200);return r.contribution}
  const readCycle=async(id:string)=>json<Cycle>(await call(`admin/campaign-cycle/${id}`,admin.cookie),200)
  const actCycle=(c:Cycle,action:string,cookie=admin.cookie,key=randomUUID(),patch={})=>call(`${cookie===creator.cookie?'me':'admin'}/campaign-cycle/${c.id}/actions`,cookie,{action,expectedVersion:c.version,requestKey:key,reason:'Decisión motivada del ciclo de campaña DEMO, sin dinero real.',demoConsent:true,...patch})
  const id=seed();let cycle=await readCycle(id)
  assert.equal((await call(`me/campaign-cycle/${id}`,other.cookie)).status,403);assert.equal((await call(`admin/campaign-cycle/${id}`)).status,401)
  assert.equal((await actCycle(cycle,'END_FUNDING')).status,409,'No cierre anticipado aunque alcance meta')
  assert.equal((await actCycle(cycle,'END_FUNDING',finance.cookie)).status,403)
  assert.equal((await actCycle(cycle,'END_FUNDING',auditor.cookie)).status,403,'AUDITOR+ADMIN sigue sin mutaciones')
  assert.equal((await fetch(`${base}/api/admin/campaign-cycle/${id}/actions`,{method:'POST',headers:{Cookie:admin.cookie,'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'https://foreign.invalid'},body:JSON.stringify({action:'END_FUNDING',expectedVersion:1,requestKey:randomUUID(),reason:'Intento sintético desde un origen ajeno rechazado.',demoConsent:true})})).status,403,'CSRF en la ruta nueva')
  for(const patch of [{reason:' '.repeat(30)},{reason:'Motivo invisible\u200b de suficiente longitud'},{demoConsent:false},{expectedVersion:0},{action:'ARBITRARY'},{goalAmount:'999'}])assert.equal((await actCycle(cycle,'END_FUNDING',admin.cookie,randomUUID(),patch)).status,400)
  const contribution=await paid(id,'10.25'),pending=await paid(id,'1.00',false)
  sql(`UPDATE campaign SET ends_at=now()-interval '1 second' WHERE id='${id}';UPDATE contribution SET created_at=now()-interval '1 hour',expires_at=now()-interval '1 second' WHERE id='${pending.id}';UPDATE payment SET created_at=now()-interval '1 hour',expires_at=now()-interval '1 second' WHERE id='${pending.paymentId}';`)
  budget();const endKey=randomUUID(),twins=await Promise.all([actCycle(cycle,'END_FUNDING',admin.cookie,endKey),actCycle(cycle,'END_FUNDING',admin.cookie,endKey)])
  cycle=await json<Cycle>(twins[0]!);assert.equal((await json<Cycle>(twins[1]!)).version,cycle.version);assert.equal(cycle.status,'FUNDING_ENDED');assert.equal(cycle.outcome,'EXECUTION_ELIGIBLE');assert.equal(sql(`SELECT status FROM payment WHERE id='${pending.paymentId}'`),'EXPIRED')
  assert.equal(sql(`SELECT count(*) FROM brotar_extension.campaign_cycle_event WHERE campaign_id='${id}'`),'1')
  assert.equal((await paidCheckoutOnly()).status,409)
  function paidCheckoutOnly(){return call('demo-payments/checkout',sponsor.cookie,{campaignId:id,amount:'1.00',currencyCode:'BOB',requestKey:randomUUID(),demoConsent:true})}
  assert.equal((await actCycle(cycle,'START_EXECUTION')).status,409,'KYC requerido antes de ejecutar')
  budget();const verification=await approveDemoIdentity(call,creator.cookie,admin.cookie);budget()
  cycle=await json<Cycle>(await actCycle(cycle,'START_EXECUTION'));assert.equal(cycle.status,'IN_EXECUTION')
  const destinationInput={reference:'DEMO-HUERTO',holder:'DEMO Huerto Ñandú',expectedVersion:0,reason:'Referencia ficticia exclusiva de este ensayo académico.',requestKey:randomUUID(),demoConsent:true}
  for(const patch of [{reference:'123456789'},{holder:'Titular real'},{reason:'   '},{bankAccount:'123'}])assert.equal((await call(`me/disbursements/campaigns/${id}/destination`,creator.cookie,{...destinationInput,...patch},'PUT')).status,400)
  let dest=await json<Destination>(await call(`me/disbursements/campaigns/${id}/destination`,creator.cookie,destinationInput,'PUT'),200);assert.equal(dest.destination.status,'PENDING')
  assert.equal((await call(`me/disbursements/campaigns/${id}/destination`,other.cookie)).status,403)
  const review=async(cookie=finance.cookie,decision='VERIFIED',key=randomUUID())=>call(`admin/finance/disbursements/campaigns/${id}/destination/review`,cookie,{decision,expectedVersion:dest.destination.version,reason:'Verificación explícita de titularidad y moneda ficticias.',requestKey:key,demoConsent:true})
  assert.equal((await review(admin.cookie)).status,403);assert.equal((await review(auditor.cookie)).status,403)
  const reviewKey=randomUUID(),beforeReview=dest;dest=await json<Destination>(await review(finance.cookie,'VERIFIED',reviewKey));assert.equal(dest.destination.status,'VERIFIED')
  assert.equal((await call(`admin/finance/disbursements/campaigns/${id}/destination/review`,finance.cookie,{decision:'VERIFIED',expectedVersion:beforeReview.destination.version,reason:'Verificación explícita de titularidad y moneda ficticias.',requestKey:reviewKey,demoConsent:true})).status,201)
  const request={amount:'5.25',payoutAccountId:dest.destination.id,destinationVersion:dest.destination.version,scheduledFor:null,reason:'Desembolso sintético para iniciar actividades del huerto.',requestKey:randomUUID(),demoConsent:true}
  for(const patch of [{amount:'0'},{amount:'0.001'},{amount:5},{scheduledFor:'2020-01-01'},{scheduledFor:'2027-02-29'},{platformFee:'1.00'},{currencyCode:'USD'}])assert.equal((await call(`me/disbursements/campaigns/${id}`,creator.cookie,{...request,...patch})).status,400)
  assert.equal((await call(`me/disbursements/campaigns/${id}`,creator.cookie,{...request,amount:'10.26',requestKey:randomUUID()})).status,409)
  budget();const payouts=await Promise.all([call(`me/disbursements/campaigns/${id}`,creator.cookie,request),call(`me/disbursements/campaigns/${id}`,creator.cookie,request)]);let payout=await json<Payout>(payouts[0]!);assert.equal((await json<Payout>(payouts[1]!)).id,payout.id)
  assert.equal((await call(`me/disbursements/campaigns/${id}`,creator.cookie,{...request,amount:'6.00',requestKey:randomUUID()})).status,409,'Saldo reservado no se compromete dos veces')
  assert.equal((await call(`me/disbursements/${payout.id}`,other.cookie)).status,403)
  assert.equal((await call(`me/disbursements/campaigns/${id}/destination`,creator.cookie,{...destinationInput,expectedVersion:dest.destination.version,requestKey:randomUUID()},'PUT')).status,409)
  const act=(d:Payout,action:string,cookie=finance.cookie,key=randomUUID())=>call(`admin/finance/disbursements/${d.id}/actions`,cookie,{action,expectedVersion:d.version,requestKey:key,reason:'Operación DEMO autorizada con comprobación de saldo y destino.',demoConsent:true})
  assert.equal((await act(payout,'AUTHORIZE',admin.cookie)).status,403);assert.equal((await act(payout,'AUTHORIZE',auditor.cookie)).status,403);assert.equal((await act(payout,'COMPLETE_DEMO')).status,409)
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${creator.id}',id FROM role WHERE code='FINANCE';`)
  assert.equal((await act(payout,'AUTHORIZE',creator.cookie)).status,403)
  const oldPayout=payout,actionKey=randomUUID();payout=await json<Payout>(await act(payout,'AUTHORIZE',finance.cookie,actionKey));assert.equal(payout.status,'APPROVED');assert.equal((await act(oldPayout,'AUTHORIZE',finance.cookie,actionKey)).status,201);assert.equal((await act(oldPayout,'AUTHORIZE')).status,409)
  payout=await json<Payout>(await act(payout,'PROCESS_DEMO'));assert.equal(payout.status,'PROCESSING')
  payout=await json<Payout>(await act(payout,'COMPLETE_DEMO'));assert.equal(payout.status,'COMPLETED');assert.equal(payout.externalReference,`DEMO-DISBURSEMENT:${payout.id}`);assert.equal(payout.events.length,4)
  assert.equal(sql(`SELECT amount_raised FROM v_campaign_funding WHERE campaign_id='${id}'`),'10.25','Desembolso no reescribe recaudación histórica')
  assert.equal((await act(payout,'FAIL_DEMO')).status,409);budget()
  const future=new Date(Date.now()+86400000*2).toISOString().slice(0,10),scheduled=await json<Payout>(await call(`me/disbursements/campaigns/${id}`,creator.cookie,{...request,amount:'5.00',scheduledFor:future,requestKey:randomUUID()}))
  let second=await json<Payout>(await act(scheduled,'AUTHORIZE'));assert.equal((await act(second,'PROCESS_DEMO')).status,409,'No ejecutar fecha futura')
  second=await json<Payout>(await act(second,'FAIL_DEMO'));assert.equal(second.status,'FAILED')
  dest=await json<Destination>(await call(`me/disbursements/campaigns/${id}/destination`,creator.cookie,{...destinationInput,reference:'DEMO-HUERTO-NUEVO',expectedVersion:dest.destination.version,requestKey:randomUUID()},'PUT'),200);assert.equal(dest.destination.status,'PENDING')
  assert.equal((await call(`me/disbursements/campaigns/${id}`,creator.cookie,{...request,amount:'1.00',requestKey:randomUUID()})).status,409,'Cambio invalida aprobación/versiones')
  dest=await json<Destination>(await review());budget()
  let last=await json<Payout>(await call(`me/disbursements/campaigns/${id}`,creator.cookie,{...request,amount:'5.00',destinationVersion:dest.destination.version,requestKey:randomUUID()}));last=await json<Payout>(await act(last,'AUTHORIZE'));last=await json<Payout>(await act(last,'PROCESS_DEMO'));last=await json<Payout>(await act(last,'COMPLETE_DEMO'))
  assert.equal(last.destinationReference,'DEMO-HUERTO-NUEVO');assert.equal((await json<Payout>(await call(`me/disbursements/${payout.id}`,creator.cookie),200)).destinationReference,'DEMO-HUERTO','Instantánea histórica no cambia al modificar destino')
  cycle=await readCycle(id);assert.equal(cycle.funds.disbursed,'10.25');assert.equal((await actCycle(cycle,'CLOSE')).status,409,'No cerrar sin rendición final')
  budget();cycle=await json<Cycle>(await actCycle(cycle,'REQUEST_CANCEL',creator.cookie));cycle=await json<Cycle>(await actCycle(cycle,'APPROVE_CANCEL'));assert.equal(cycle.status,'IN_EXECUTION');assert.ok(cycle.cancellationCaseId,'Fondos ya liberados generan caso, no devolución ficticia')
  const caseId=cycle.cancellationCaseId;cycle=await json<Cycle>(await actCycle(cycle,'APPROVE_CANCEL'));assert.equal(cycle.cancellationCaseId,caseId,'No duplica la incidencia al reevaluar')
  assert.equal(sql(`SELECT count(*) FROM support_case WHERE campaign_id='${id}'`),'1')
  cycle=await json<Cycle>(await actCycle(cycle,'REJECT_CANCEL'));assert.equal((await actCycle(cycle,'CLOSE')).status,409,'Caso abierto impide cierre aunque se retire cancelación')
  // Real HTTP closure workbench: no approved-report or resolved-case SQL shortcuts.
  interface Closure {id:string;version:number;today:string;report:{id:string;status:string;snapshotCurrent:boolean}|null;categories:{id:string}[];pending:{progress:number;rewards:number}}
  const readClosure=(cookie=creator.cookie,adminView=false)=>call(`${adminView?'admin':'me'}/campaign-closure/${id}`,cookie).then(r=>json<Closure>(r,200))
  let closure=await readClosure()
  const closeAction=(action:string,data:object,cookie=creator.cookie,version=closure.version,key=randomUUID(),patch={})=>call(`${cookie===creator.cookie?'me':'admin'}/campaign-closure/${id}/actions`,cookie,{action,data,expectedVersion:version,requestKey:key,reason:'Ensayo DEMO de cierre con comprobación documental independiente.',demoConsent:true,...patch})
  assert.equal((await call(`me/campaign-closure/${id}`,other.cookie)).status,403)
  assert.equal((await call('admin/campaign-closure',support.cookie)).status,200)
  assert.equal((await closeAction('RESOLVE_CLOSURE_CASE',{caseId},admin.cookie)).status,403,'ADMIN no sustituye a SUPPORT')
  closure=await json<Closure>(await closeAction('RESOLVE_CLOSURE_CASE',{caseId},support.cookie));assert.equal(sql(`SELECT status FROM support_case WHERE id='${caseId}'`),'RESOLVED')
  closure=await readClosure()
  const today=closure.today,activity=randomUUID(),milestone=randomUUID()
  sql(`INSERT INTO campaign_activity(id,campaign_id,name) VALUES('${activity}','${id}','DEMO Preparar terreno');INSERT INTO milestone(id,campaign_id,name) VALUES('${milestone}','${id}','DEMO Huerto completado');`)
  const fileInput={purpose:'CLOSURE_EVIDENCE',visibility:'PRIVATE',originalName:'DEMO-gasto.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nDEMO synthetic expense').toString('base64')}
  const evidenceFile=await json<{id:string}>(await call('files',creator.cookie,fileInput)),foreignFile=await json<{id:string}>(await call('files',other.cookie,fileInput))
  let reportData={periodStart:today,periodEnd:today,narrative:'DEMO Resultados del huerto Ñandú comprobados para el cierre.',varianceExplanation:'No hubo diferencias con el presupuesto de este ensayo.',expenses:[{budgetItemId:null,expenseCategoryId:closure.categories[0]!.id,description:'Herramientas y materiales del huerto DEMO',amount:'10.25',spentOn:today,fileIds:[evidenceFile.id]}]}
  assert.equal((await closeAction('SUBMIT_FINAL',reportData)).status,409,'No presentar final con avances incompletos')
  let progress=await json<ProgressState>(await call(`campaigns/${id}/progress`,creator.cookie),200)
  const completion={revision:progress.revision,activities:[{id:activity,responsibleName:'DEMO Responsable Ñandú',status:'COMPLETED',progressPercent:100,actualStartOn:today,actualEndOn:today}],milestones:[{id:milestone,responsibleName:'DEMO Responsable Ñandú',status:'COMPLETED',progressPercent:100,actualStartOn:today,actualEndOn:today}],indicators:[]}
  assert.equal((await call(`campaigns/${id}/progress`,creator.cookie,{...completion,activities:[{...completion.activities[0],progressPercent:101}]},'PUT')).status,400)
  progress=await json<ProgressState>(await call(`campaigns/${id}/progress`,creator.cookie,completion,'PUT'),200)
  for(const patch of [{narrative:' '.repeat(30)},{periodEnd:'2099-01-01'},{periodStart:'2026-02-29'},{approved:true},{expenses:[{...reportData.expenses[0],amount:'10.251'}]},{expenses:[{...reportData.expenses[0],fileIds:[]}]}])assert.equal((await closeAction('SUBMIT_FINAL',{...reportData,...patch})).status,400)
  budget();assert.equal((await closeAction('SUBMIT_FINAL',{...reportData,expenses:[{...reportData.expenses[0],amount:'10.24'}]})).status,409)
  assert.equal((await closeAction('SUBMIT_FINAL',{...reportData,expenses:[{...reportData.expenses[0],fileIds:[foreignFile.id]}]})).status,400,'No tomar evidencias de otro actor')
  const submitVersion=closure.version,submitKey=randomUUID(),reports=await Promise.all([closeAction('SUBMIT_FINAL',reportData,creator.cookie,submitVersion,submitKey),closeAction('SUBMIT_FINAL',reportData,creator.cookie,submitVersion,submitKey)])
  closure=await json<Closure>(reports[0]!);assert.equal((await json<Closure>(reports[1]!)).report!.id,closure.report!.id);assert.equal(closure.report!.status,'SUBMITTED')
  assert.equal((await closeAction('APPROVE_FINAL',{reportId:closure.report!.id},finance.cookie)).status,403)
  assert.equal((await closeAction('APPROVE_FINAL',{reportId:closure.report!.id},auditor.cookie)).status,403)
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${creator.id}',id FROM role WHERE code='REVIEWER';`)
  assert.equal((await call(`admin/campaign-closure/${id}/actions`,creator.cookie,{action:'APPROVE_FINAL',data:{reportId:closure.report!.id},expectedVersion:closure.version,requestKey:randomUUID(),reason:'Intento sintético de autoaprobación expresamente rechazado.',demoConsent:true})).status,403)
  assert.equal((await call(`files/${evidenceFile.id}`,creator.cookie)).status,403,'Evidencias de cierre solo por su vínculo autorizado')
  assert.equal((await call(`me/campaign-closure/${id}/documents/${evidenceFile.id}`,creator.cookie)).status,200)
  assert.equal((await call(`admin/campaign-closure/${id}/documents/${evidenceFile.id}`,admin.cookie)).status,200)
  assert.equal((await call(`admin/campaign-closure/${id}/documents/${evidenceFile.id}`,support.cookie)).status,403,'SUPPORT no hereda acceso a comprobantes de gasto')
  assert.equal((await call(`me/campaign-closure/${id}/documents/${evidenceFile.id}`,other.cookie)).status,403)
  assert.equal((await call(`files/${evidenceFile.id}`,creator.cookie,undefined,'DELETE')).status,409,'Un gasto enviado conserva su evidencia')
  closure=await json<Closure>(await closeAction('APPROVE_FINAL',{reportId:closure.report!.id},admin.cookie));cycle=await readCycle(id);assert.equal(cycle.closeBlockers.length,0)
  // A later edit invalidates review; it cannot silently close on a stale final.
  progress=await json<ProgressState>(await call(`campaigns/${id}/progress`,creator.cookie,{...completion,revision:progress.revision,activities:[{...completion.activities[0],responsibleName:'DEMO Otro responsable'}]},'PUT'),200)
  assert.equal((await actCycle(cycle,'CLOSE')).status,409,'Cambios posteriores invalidan el informe revisado')
  closure=await readClosure();closure=await json<Closure>(await closeAction('SUBMIT_FINAL',reportData));const oldReport=closure.report!.id
  closure=await json<Closure>(await closeAction('REQUEST_CHANGES',{reportId:oldReport},admin.cookie));assert.equal(closure.report!.status,'CHANGES_REQUESTED')
  reportData={...reportData,narrative:'DEMO Resultados finales corregidos y debidamente explicados.'}
  closure=await json<Closure>(await closeAction('SUBMIT_FINAL',reportData));assert.notEqual(closure.report!.id,oldReport)
  assert.equal((await closeAction('APPROVE_FINAL',{reportId:oldReport},admin.cookie)).status,409,'No aprobar una versión anterior')
  closure=await json<Closure>(await closeAction('APPROVE_FINAL',{reportId:closure.report!.id},admin.cookie));cycle=await readCycle(id)
  cycle=await json<Cycle>(await actCycle(cycle,'CLOSE'));assert.equal(cycle.status,'CLOSED');assert.equal((await actCycle(cycle,'START_EXECUTION')).status,409)
  assert.equal((await closeAction('SUBMIT_FINAL',reportData)).status,409,'Cierre terminal conserva rendiciones')
  assert.equal((await call('me/support-cases',creator.cookie,{requestId:randomUUID(),campaignId:id,category:'OTHER',subject:'DEMO Incidencia posterior al cierre',description:'DEMO Nueva obligación sintética posterior al cierre, expresamente rechazada.',evidenceFileIds:[],confirmed:true})).status,409,'No introducir una nueva obligación tras el cierre terminal')
  const refundAll=async(paymentId:string,amount:string,reasonCode:string)=>{let r=await json<Payout>(await call('me/refunds',sponsor.cookie,{paymentId,amount,reasonCode,reason:'Devolución DEMO exigible por el resultado del ciclo de campaña.',requestKey:randomUUID(),demoConsent:true}));for(const action of ['AUTHORIZE','COMPLETE_DEMO'])r=await json<Payout>(await call(`admin/finance/refunds/${r.id}/actions`,finance.cookie,{action,expectedVersion:r.version,reason:'Resolución financiera DEMO de la obligación de devolución.',requestKey:randomUUID(),demoConsent:true}));return r}
  const failedId=seed('ALL_OR_NOTHING','100.00'),failedPayment=await paid(failedId,'2.00');sql(`UPDATE campaign SET ends_at=now()-interval '1 second' WHERE id='${failedId}';`);let failed=await readCycle(failedId);failed=await json<Cycle>(await actCycle(failed,'END_FUNDING'));assert.equal(failed.outcome,'REFUND_REQUIRED');assert.equal((await actCycle(failed,'START_EXECUTION')).status,409);assert.equal((await actCycle(failed,'CLOSE')).status,409)
  budget();await refundAll(failedPayment.paymentId,'2.00','GOAL_NOT_REACHED');failed=await json<Cycle>(await actCycle(failed,'CLOSE'));assert.equal(failed.status,'CLOSED')
  const emptyId=seed('FLEXIBLE');sql(`UPDATE campaign SET ends_at=now()-interval '1 second' WHERE id='${emptyId}';`);let empty=await json<Cycle>(await actCycle(await readCycle(emptyId),'END_FUNDING'));assert.equal(empty.outcome,'NO_FUNDS');empty=await json<Cycle>(await actCycle(empty,'CLOSE'));assert.equal(empty.status,'CLOSED')
  budget();const cancelId=seed('FLEXIBLE'),cancelPayment=await paid(cancelId,'1.00');let cancel=await readCycle(cancelId);cancel=await json<Cycle>(await actCycle(cancel,'REQUEST_CANCEL',creator.cookie));assert.equal(cancel.status,'PUBLISHED');assert.equal(cancel.cancelRequested,true)
  assert.equal((await call('demo-payments/checkout',sponsor.cookie,{campaignId:cancelId,amount:'1.00',currencyCode:'BOB',requestKey:randomUUID(),demoConsent:true})).status,409,'Solicitud suspende nuevas reservas hasta decisión')
  cancel=await json<Cycle>(await actCycle(cancel,'REJECT_CANCEL'));assert.equal(cancel.cancelRequested,false);cancel=await json<Cycle>(await actCycle(cancel,'REQUEST_CANCEL',creator.cookie));cancel=await json<Cycle>(await actCycle(cancel,'APPROVE_CANCEL'));assert.equal(cancel.status,'CANCELLED');assert.equal(cancel.outcome,'REFUND_REQUIRED');assert.equal((await actCycle(cancel,'CLOSE')).status,409)
  budget();await refundAll(cancelPayment.paymentId,'1.00','PROJECT_CANCELLED');cancel=await json<Cycle>(await actCycle(cancel,'CLOSE'));assert.equal(cancel.status,'CLOSED')
  const expiredId=seed('FLEXIBLE');await paid(expiredId,'1.00');sql(`UPDATE campaign SET ends_at=now()-interval '1 second' WHERE id='${expiredId}';UPDATE verification SET expires_at=clock_timestamp()-interval '1 second' WHERE id='${verification.id}';`);let exp=await json<Cycle>(await actCycle(await readCycle(expiredId),'END_FUNDING'));assert.equal(exp.outcome,'EXECUTION_ELIGIBLE');assert.equal((await actCycle(exp,'START_EXECUTION')).status,409,'Verificación vencida no habilita ejecución');sql(`UPDATE verification SET expires_at=NULL WHERE id='${verification.id}';`)
  exp=await json<Cycle>(await actCycle(exp,'START_EXECUTION'))
  // Revalidate a role which expires while an action waits on the campaign lock.
  const runner=app.get(DatabaseService).connection().createQueryRunner();await runner.connect();await runner.startTransaction();await runner.query('SELECT id FROM campaign WHERE id=$1 FOR UPDATE',[exp.id]);sql(`UPDATE user_role SET expires_at=clock_timestamp()+interval '450 milliseconds' WHERE user_id='${admin.id}' AND role_id=(SELECT id FROM role WHERE code='ADMIN') AND revoked_at IS NULL;`)
  const waiting=actCycle(exp,'CLOSE');await new Promise(r=>setTimeout(r,650));await runner.commitTransaction();await runner.release();assert.equal((await waiting).status,403);sql(`UPDATE user_role SET expires_at=NULL WHERE user_id='${admin.id}' AND role_id=(SELECT id FROM role WHERE code='ADMIN') AND revoked_at IS NULL;`)
  budget()
  const orgTypes=await json<{id:string}[]>(await call('organizations/types',creator.cookie),200)
  const organization=await json<{id:string}>(await call('organizations',creator.cookie,{legalName:`DEMO Institución ${suffix}`,tradeName:'DEMO',organizationTypeId:orgTypes[0]!.id,contactEmail:'demo@example.invalid',contactPhone:''}));organizations.push(organization.id)
  const institutionId=seed('FLEXIBLE'),reward=randomUUID();sql(`UPDATE campaign SET organization_id='${organization.id}',campaign_type='REWARD' WHERE id='${institutionId}';INSERT INTO reward(id,campaign_id,title,description,min_amount,currency_code) VALUES('${reward}','${institutionId}','DEMO Taller del huerto','DEMO Participación en un taller de cultivo',1,'BOB');`);const rewardedContribution=await paid(institutionId,'2.00',true,reward);sql(`UPDATE campaign SET ends_at=now()-interval '1 second' WHERE id='${institutionId}';`)
  let institution=await json<Cycle>(await actCycle(await readCycle(institutionId),'END_FUNDING'));assert.equal((await actCycle(institution,'START_EXECUTION')).status,409,'KYC de persona no sustituye KYB')
  await approveDemoIdentity(call,creator.cookie,admin.cookie,'KYB_LEGAL',organization.id);await approveDemoIdentity(call,creator.cookie,admin.cookie,'KYB_REPRESENTATIVE',organization.id);budget()
  sql(`UPDATE organization_member SET left_at=clock_timestamp() WHERE organization_id='${organization.id}' AND user_id='${creator.id}';`)
  assert.equal((await actCycle(institution,'START_EXECUTION')).status,409,'Representación revocada invalida habilitación')
  assert.equal((await call(`me/campaign-cycle/${institutionId}`,creator.cookie)).status,403,'Autor histórico institucional sin representación no gestiona ciclo')
  sql(`UPDATE organization_member SET left_at=NULL WHERE organization_id='${organization.id}' AND user_id='${creator.id}';`)
  institution=await json<Cycle>(await actCycle(institution,'START_EXECUTION'))
  let institutionDestination=await json<Destination>(await call(`me/disbursements/campaigns/${institutionId}/destination`,creator.cookie,{...destinationInput,requestKey:randomUUID()},'PUT'),200)
  const institutionReview=()=>call(`admin/finance/disbursements/campaigns/${institutionId}/destination/review`,finance.cookie,{decision:'VERIFIED',expectedVersion:institutionDestination.destination.version,reason:'Revisión de destino institucional DEMO por revisor ajeno.',requestKey:randomUUID(),demoConsent:true})
  let alternateCurrency=sql("SELECT trim(code) FROM currency WHERE code<>'BOB' ORDER BY code LIMIT 1")
  if(!alternateCurrency){fixtureCurrency='XTS';sql("INSERT INTO currency(code,name,symbol) VALUES('XTS','DEMO Moneda de ensayo','TEST')");alternateCurrency='XTS'}
  sql(`UPDATE payout_account SET currency_code='${alternateCurrency}' WHERE id='${institutionDestination.destination.id}';`);assert.equal((await institutionReview()).status,409,'No aprobar moneda incompatible');sql(`UPDATE payout_account SET currency_code='BOB' WHERE id='${institutionDestination.destination.id}';`)
  sql(`INSERT INTO organization_member(organization_id,user_id,joined_at,left_at) VALUES('${organization.id}','${finance.id}',now()-interval '1 hour',now()+interval '1 day');`);assert.equal((await institutionReview()).status,403,'Baja futura sigue siendo vínculo propio');sql(`DELETE FROM organization_member WHERE organization_id='${organization.id}' AND user_id='${finance.id}';`)
  institutionDestination=await json<Destination>(await institutionReview())
  let institutionalPayout=await json<Payout>(await call(`me/disbursements/campaigns/${institutionId}`,creator.cookie,{...request,amount:'2.00',payoutAccountId:institutionDestination.destination.id,destinationVersion:institutionDestination.destination.version,requestKey:randomUUID()}))
  for(const action of ['AUTHORIZE','PROCESS_DEMO','COMPLETE_DEMO'])institutionalPayout=await json<Payout>(await act(institutionalPayout,action))
  assert.equal(institutionalPayout.status,'COMPLETED');assert.equal(sql(`SELECT beneficiary_org_id FROM disbursement WHERE id='${institutionalPayout.id}'`),organization.id)
  budget();let institutionalClosure=await json<Closure>(await call(`me/campaign-closure/${institutionId}`,creator.cookie),200);assert.equal(institutionalClosure.pending.rewards,1)
  const institutionalAction=(action:string,data:object,cookie=creator.cookie,key=randomUUID(),version=institutionalClosure.version)=>call(`${cookie===creator.cookie?'me':'admin'}/campaign-closure/${institutionId}/actions`,cookie,{action,data,expectedVersion:version,requestKey:key,reason:'DEMO Cumplimiento y rendición institucional con revisión ajena.',demoConsent:true})
  assert.equal((await institutionalAction('SUBMIT_FINAL',{...reportData,expenses:[{...reportData.expenses[0],amount:'2.00'}]})).status,409,'No rendir final con recompensa pendiente')
  const rewardFile=await json<{id:string}>(await call('files',creator.cookie,{...fileInput,originalName:'DEMO-recompensa.pdf'})),rewardData={contributionId:rewardedContribution.id,fulfilledOn:institutionalClosure.today,fileId:rewardFile.id}
  assert.equal((await institutionalAction('FULFILL_REWARD',{...rewardData,fulfilledOn:'2099-01-01'})).status,400)
  assert.equal((await institutionalAction('FULFILL_REWARD',{...rewardData,contributionId:contribution.id})).status,400,'No registrar recompensa de otra campaña')
  const rewardKey=randomUUID(),rewardVersion=institutionalClosure.version,rewardRace=await Promise.all([institutionalAction('FULFILL_REWARD',rewardData,creator.cookie,rewardKey,rewardVersion),institutionalAction('FULFILL_REWARD',rewardData,creator.cookie,rewardKey,rewardVersion)])
  institutionalClosure=await json<Closure>(rewardRace[0]!);assert.equal((await json<Closure>(rewardRace[1]!)).pending.rewards,0);assert.equal(institutionalClosure.pending.rewards,0)
  assert.equal((await institutionalAction('FULFILL_REWARD',rewardData)).status,409,'No sobrescribir evidencia de cumplimiento terminal')
  const originalFulfillment=sql(`SELECT fulfilled_by::text||':'||fulfilled_at::text||':'||notes FROM reward_fulfillment WHERE contribution_id='${rewardedContribution.id}'`)
  // Simulate a preserved pre-migration fulfillment lacking the new evidence link, not an approved report.
  sql(`DELETE FROM brotar_extension.campaign_reward_evidence WHERE contribution_id='${rewardedContribution.id}'`)
  institutionalClosure=await json<Closure>(await institutionalAction('FULFILL_REWARD',rewardData))
  assert.equal(sql(`SELECT fulfilled_by::text||':'||fulfilled_at::text||':'||notes FROM reward_fulfillment WHERE contribution_id='${rewardedContribution.id}'`),originalFulfillment,'Adjuntar evidencia histórica no cambia fecha, responsable ni notas')
  assert.equal((await call(`files/${rewardFile.id}`,creator.cookie,undefined,'DELETE')).status,409)
  const institutionExpense=await json<{id:string}>(await call('files',creator.cookie,{...fileInput,originalName:'DEMO-gasto-institucional.pdf'}))
  institutionalClosure=await json<Closure>(await institutionalAction('SUBMIT_FINAL',{...reportData,expenses:[{...reportData.expenses[0],amount:'2.00',fileIds:[institutionExpense.id]}]}))
  sql(`INSERT INTO organization_member(organization_id,user_id) VALUES('${organization.id}','${admin.id}');`)
  assert.equal((await institutionalAction('APPROVE_FINAL',{reportId:institutionalClosure.report!.id},admin.cookie)).status,403,'Revisor de su organización no aprueba rendición')
  sql(`DELETE FROM organization_member WHERE organization_id='${organization.id}' AND user_id='${admin.id}';`)
  institutionalClosure=await json<Closure>(await institutionalAction('APPROVE_FINAL',{reportId:institutionalClosure.report!.id},admin.cookie));institution=await readCycle(institutionId);institution=await json<Cycle>(await actCycle(institution,'CLOSE'));assert.equal(institution.status,'CLOSED','Cierre institucional real con recompensa y rendición por HTTP')
  assert.equal(sql(`SELECT has_table_privilege('brotar_app','brotar_extension.campaign_cycle_event','UPDATE') OR has_table_privilege('brotar_app','brotar_extension.demo_disbursement_event','DELETE')`),'f')
  assert.equal(sql(`SELECT has_column_privilege('brotar_app','public.disbursement','gross_amount','UPDATE')`),'f')
  assert.ok(Number(sql(`SELECT count(*) FROM audit_log WHERE entity_name IN ('campaign','payout_account','disbursement') AND actor_user_id IN('${creator.id}','${finance.id}','${admin.id}')`))>10)
  assert.equal((await call('admin/finance/disbursements?page=1.5',finance.cookie)).status,400);assert.equal((await call('admin/campaign-cycle?page=-1',admin.cookie)).status,400)
  assert.equal((await call('health/ready')).status,200)
  process.env.DEMO_PAYMENTS_ENABLED='false';assert.equal((await call('admin/campaign-cycle',admin.cookie)).status,404);assert.equal((await call('admin/finance/disbursements',finance.cookie)).status,404)
  void contribution
 }finally{
  await app.close();if(old===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=old
  for(const id of campaigns){const accountIds=sql(`SELECT string_agg(quote_literal(payout_account_id::text),',') FROM brotar_extension.demo_destination WHERE campaign_id='${id}'`)
   sql(`DELETE FROM brotar_extension.campaign_reward_evidence WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${id}');DELETE FROM brotar_extension.campaign_final_report WHERE campaign_id='${id}';`)
   sql(`DELETE FROM brotar_extension.demo_refund_event WHERE refund_id IN(SELECT r.id FROM refund r JOIN contribution c ON c.id=r.contribution_id WHERE c.campaign_id='${id}');DELETE FROM brotar_extension.demo_refund WHERE refund_id IN(SELECT r.id FROM refund r JOIN contribution c ON c.id=r.contribution_id WHERE c.campaign_id='${id}');DELETE FROM refund WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${id}');DELETE FROM brotar_extension.demo_disbursement_event WHERE disbursement_id IN(SELECT id FROM disbursement WHERE campaign_id='${id}');DELETE FROM brotar_extension.demo_disbursement WHERE disbursement_id IN(SELECT id FROM disbursement WHERE campaign_id='${id}');DELETE FROM disbursement WHERE campaign_id='${id}';DELETE FROM brotar_extension.demo_destination_event WHERE payout_account_id IN(SELECT payout_account_id FROM brotar_extension.demo_destination WHERE campaign_id='${id}');DELETE FROM brotar_extension.demo_destination WHERE campaign_id='${id}';${accountIds?`DELETE FROM payout_account WHERE id IN(${accountIds});`:''}DELETE FROM brotar_extension.campaign_cycle_event WHERE campaign_id='${id}';DELETE FROM brotar_extension.campaign_cycle WHERE campaign_id='${id}';DELETE FROM support_case WHERE campaign_id='${id}';DELETE FROM accountability_report WHERE campaign_id='${id}';DELETE FROM brotar_extension.demo_event WHERE payment_id IN(SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${id}');DELETE FROM payment_event WHERE payment_id IN(SELECT p.id FROM payment p JOIN contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${id}');DELETE FROM payment WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${id}');DELETE FROM contribution WHERE campaign_id='${id}';DELETE FROM campaign WHERE id='${id}';`)
  }
  for(const org of organizations)sql(`DELETE FROM brotar_extension.verification_revision WHERE verification_id IN(SELECT id FROM verification WHERE organization_id='${org}');DELETE FROM verification_document WHERE verification_id IN(SELECT id FROM verification WHERE organization_id='${org}');DELETE FROM verification WHERE organization_id='${org}';DELETE FROM organization WHERE id='${org}';`)
  if(fixtureCurrency)sql(`DELETE FROM currency WHERE code='${fixtureCurrency}';`)
  removeDemoIdentityFixtures(sql,users);for(const id of users)sql(`UPDATE file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE uploaded_by='${id}';DELETE FROM audit_log WHERE actor_user_id='${id}';DELETE FROM app_user WHERE id='${id}';`)
 }
})
