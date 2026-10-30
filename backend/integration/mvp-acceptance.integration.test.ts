import 'reflect-metadata'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes,randomUUID,createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {NestFactory} from '@nestjs/core'
import type {INestApplication} from '@nestjs/common'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {approveDemoIdentity,removeDemoIdentityFixtures} from './demo-identity-fixture'
import {ContactMail,ContactMailSender} from '../src/contacts/contact-mail'
import type {ProgressState} from '../src/campaign-progress/infrastructure/progress.repository'

interface Account {id:string;email:string;cookie:string}
interface Cycle {id:string;version:number;status:string;outcome:string;closeBlockers:string[]}
interface Closure {id:string;version:number;today:string;report:{id:string;status:string}|null;categories:{id:string}[];pending:{progress:number;rewards:number}}
interface Destination {destination:{id:string;version:number;status:string}}
interface Payout {id:string;version:number;status:string;externalReference:string|null}

test('S3-21 integral: registro → campaña corregida/publicada → aporte/recompensa → desembolso → seguimiento/rendición → cierre', {timeout:300000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const target=readTestDatabaseTarget(config);assert.match(target.project,/qa/)
 assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',target.container],{encoding:'utf8'}).trim(),target.project)
 const sql=(s:string)=>execFileSync('docker',['exec','-i',target.container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:s,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim()
 const saved={demo:process.env.DEMO_PAYMENTS_ENABLED,publication:process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED,files:process.env.FILE_STORAGE_DIR}
 process.env.DEMO_PAYMENTS_ENABLED='true';process.env.CAMPAIGN_ADMIN_PUBLICATION_ENABLED='true'
 const fileRoot=await mkdtemp(join(tmpdir(),'brotar-s321-files-'));process.env.FILE_STORAGE_DIR=fileRoot
 const suffix=randomUUID(),password=`Ñ Ensayo integral ${randomBytes(16).toString('hex')}`,users:Record<string,Account>={},steps:{stage:string;result:string}[]=[],messages:{to:string;text:string}[]=[]
 let app:INestApplication|undefined,base='',campaignId='',destinationId='',completed=false
 let mail:ContactMail
 const start=async()=>{app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));const ip='s321-'+suffix
  app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:ip});next()});await app.listen(0,'127.0.0.1');base=await app.getUrl()
  const sender=app.get(ContactMailSender);mail=app.get(ContactMail);sender.available=()=>true;sender.origin=()=>'http://127.0.0.1:5173';sender.send=async(to,_subject,text)=>{assert.ok(to.endsWith('@example.invalid'));messages.push({to,text})}}
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'POST')=>fetch(base+'/api/'+path,{signal:AbortSignal.timeout(20000),method,headers:{Connection:'close',Cookie:cookie,Origin:'http://127.0.0.1:5173','Content-Type':'application/json','X-Brotar-Request':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})}).then(async r=>new Response([204,205,304].includes(r.status)?null:await r.arrayBuffer(),{status:r.status,headers:r.headers}))
 const data=async<T>(r:Response,status=200):Promise<T>=>{assert.equal(r.status,status,await r.clone().text());return await r.json() as T}
 const phase=(stage:string,result:string)=>{steps.push({stage,result});console.log('S3_21_STAGE '+stage);const keys=[`ip:s321-${suffix}`,...Object.values(users).map(u=>`account:${u.id}`)].map(k=>`'${createHash('sha256').update('mvp-case-write:'+k).digest('hex')}'`)
  // Long human stages run in seconds here: advance only the fixture's rate window.
  sql(`UPDATE brotar_extension.rate_bucket SET expires_at=clock_timestamp()-interval '1 second' WHERE key_hash IN(${keys.join(',')});`)}
 const account=async(name:string)=>{const email=`s321-${name}-${suffix}@example.invalid`,r=await data<{id:string}>(await call('auth/register','',{legalVersion:'mvp-demo-legal-1.0-20261028',firstName:'DEMO',lastName:name,email,password,demoConsent:true}),201)
  const login=await call('auth/login','',{email,password});assert.equal(login.status,200);const u={id:r.id,email,cookie:login.headers.get('set-cookie')!.split(';')[0]!};users[name]=u;return u}
 const file=async(u:Account,purpose='CLOSURE_EVIDENCE')=>data<{id:string}>(await call('files',u.cookie,{purpose,visibility:'PRIVATE',originalName:'DEMO-evidencia.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nDEMO evidencia integral').toString('base64')}),201)
 try{
  await start();for(let i=0;i<100&&await mail!.collect()===100;i++){ /* Prior QA history is not this scenario. */ }
  const owner=await account('creador'),sponsor=await account('aportante'),admin=await account('admin'),reviewer=await account('revisor'),compliance=await account('cumplimiento'),finance=await account('finanzas'),support=await account('soporte'),auditor=await account('auditor')
  // Only bootstrap ADMIN is a SQL fixture. All subsequent role grants use the product API.
  sql(`INSERT INTO public.user_role(user_id,role_id) SELECT '${admin.id}',id FROM public.role WHERE code='ADMIN';`)
  for(const [u,role] of [[reviewer,'REVIEWER'],[compliance,'COMPLIANCE'],[finance,'FINANCE'],[support,'SUPPORT'],[auditor,'AUDITOR']] as const)await data(await call(`admin/users/${u.id}/responsibilities`,admin.cookie,{role,operation:'GRANT',confirmed:true,reason:'Responsabilidad temporal en entorno QA del ensayo integral.'}))
  assert.equal((await call(`admin/users/${owner.id}/creator`,owner.cookie,{confirmed:true,reason:'Intento sintético de escalar permisos rechazado.'})).status,403)
  await data(await call(`admin/users/${owner.id}/creator`,admin.cookie,{confirmed:true,reason:'Habilitación provisional de creador para ensayo académico.'}))
  phase('Registro y responsabilidades','Ocho cuentas por HTTP; roles internos separados y CREATOR concedido por ADMIN, sin autoescalamiento.')
  await data(await call('contacts/email/request',owner.cookie,{}),201)
  const raw=/token=([a-f0-9]{64})/.exec(messages.find(m=>m.to===owner.email)!.text)![1]!
  assert.equal((await call('contacts/email/confirm',sponsor.cookie,{token:raw})).status,400)
  await data(await call('contacts/email/confirm',owner.cookie,{token:raw}),201);await data(await call('contacts/email/preferences',owner.cookie,{enabled:true},'PUT'))
  await approveDemoIdentity(call,owner.cookie,compliance.cookie)
  phase('Correo e identidad DEMO','Token propio de un uso y captura/revisión KYC independiente; transporte sustituido, sin buzón real acreditado.')
  const draft=await data<{id:string}>(await call('campaigns/drafts',owner.cookie,{title:`DEMO Huerto integral Ñandú ${suffix.slice(0,8)}`,summary:'Recorrido integral de una iniciativa comunitaria de prueba.',campaignType:'REWARD'}),201);campaignId=draft.id
  const own=`campaigns/drafts/${campaignId}`,adminPath=`admin/campaigns/${campaignId}`
  assert.equal((await call(`${own}/story`,sponsor.cookie)).status,404)
  assert.equal((await call(`${own}/submission`,owner.cookie,{})).status,422)
  const category=sql('SELECT id FROM public.category WHERE is_active ORDER BY id LIMIT 1'),expense=sql('SELECT id FROM public.expense_category WHERE is_active ORDER BY id LIMIT 1'),today=sql("SELECT (clock_timestamp() AT TIME ZONE 'America/La_Paz')::date::text")
  const end=sql(`SELECT ('${today}'::date+1)::text`)
  const general={title:`DEMO Huerto integral Ñandú ${suffix.slice(0,8)}`,summary:'Recorrido integral de una iniciativa comunitaria de prueba.',categoryId:category,location:{countryCode:'BO',locality:'La Paz',addressLine:'',reference:''}}
  await data(await call(`${own}/general`,owner.cookie,general,'PUT'))
  const story={problem:'Faltan herramientas para preparar el huerto comunitario.',solution:'Adquirir herramientas y preparar el terreno con las familias.',beneficiaries:'Una familia participa en el ensayo académico de la iniciativa.',expectedResults:'Completar el huerto y dejar evidencia de su preparación.',indicators:[{name:'Familias participantes',description:'Meta sintética para el ensayo.',unit:'familias',targetValue:1}]}
  await data(await call(`${own}/story`,owner.cookie,story,'PUT'))
  const plan={activities:[{name:'Preparar terreno',responsibleName:'DEMO Responsable',plannedStartOn:today,plannedEndOn:today},{name:'Entregar herramientas',responsibleName:'DEMO Responsable',plannedStartOn:today,plannedEndOn:today}],milestones:[{name:'Huerto preparado',responsibleName:'DEMO Responsable',plannedStartOn:today,plannedEndOn:today,activityIndexes:[0,1]}]}
  assert.equal((await call(`${own}/plan`,owner.cookie,{...plan,activities:[{...plan.activities[0],plannedStartOn:'2000-01-01'}]},'PUT')).status,400)
  await data(await call(`${own}/plan`,owner.cookie,plan,'PUT'))
  const budget={items:[{categoryId:expense,description:'Herramientas comunitarias',quantity:2,unitPrice:5,plannedAmount:10,notes:'Compra de ensayo'}],risks:[{title:'Retraso de entrega',description:'El proveedor puede retrasar las herramientas.',likelihood:'20',impact:'Bajo',mitigation:'Prever un proveedor alternativo local.'}]}
  await data(await call(`${own}/budget`,owner.cookie,budget,'PUT'))
  const funding={goalAmount:12,currencyCode:'BOB',durationDays:1,fundingModel:'ALL_OR_NOTHING',startsAt:today+'T00:00:00-04:00',endsAt:end+'T00:00:00-04:00'}
  assert.equal((await call(`${own}/funding`,owner.cookie,{...funding,goalAmount:10},'PUT')).status,400)
  await data(await call(`${own}/funding`,owner.cookie,funding,'PUT'))
  await data(await call(`${own}/rewards`,owner.cookie,{rewards:[{title:'Reconocimiento comunitario',description:'Constancia simbólica del ensayo comunitario.',rewardKind:'REWARD',minAmount:12,quantityTotal:1,estimatedDeliveryOn:end}]},'PUT'))
  const cover=await data<{id:string}>(await call('files',owner.cookie,{visibility:'PUBLIC',purpose:'CAMPAIGN_PUBLIC_IMAGE',originalName:'DEMO-portada.png',mimeType:'image/png',contentBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}),201)
  await data(await call(`${own}/cover`,owner.cookie,{fileId:cover.id,altText:'Portada sintética del huerto comunitario DEMO'},'PATCH'))
  await data(await call(`${own}/submission`,owner.cookie,{}),201)
  const changes={decision:'CHANGES_REQUESTED',comment:'PRIVADO: precisar la descripción de las familias beneficiarias.',expectedRound:1,observations:[{section:'story',fieldPath:'beneficiaries',message:'Explica la participación de la familia en el ensayo.'}]}
  await data(await call(`${adminPath}/decision`,reviewer.cookie,changes))
  await data(await call(`${own}/story`,owner.cookie,{...story,beneficiaries:'Una familia participa en la preparación del huerto del ensayo.'},'PUT'))
  await data(await call(`${own}/submission`,owner.cookie,{}),201)
  await data(await call(`${adminPath}/decision`,reviewer.cookie,{decision:'APPROVED',comment:'Campaña corregida y revisada para el ensayo.',expectedRound:2,observations:[]}))
  const slug=sql(`SELECT slug FROM public.campaign WHERE id='${campaignId}'`)
  assert.equal((await call('campaigns/public/'+slug)).status,404)
  assert.equal((await call(`${adminPath}/publish`,owner.cookie,{confirmed:true,expectedRound:2})).status,403)
  await data(await call(`${adminPath}/publish`,admin.cookie,{confirmed:true,expectedRound:2}))
  await mail!.tick();assert.ok((await mail!.notices(owner.id)).some(n=>n.body.includes('observaciones')));assert.ok(messages.filter(m=>!m.text.includes('token=')).every(m=>!m.text.includes('PRIVADO:')))
  phase('Campaña completa y revisión','Dos actividades/hito, indicador, presupuesto, fechas, portada y recompensa; observación/corrección/ronda2, aprobación privada y publicación separadas.')
  await app!.close();app=undefined;await start()
  const published=await data<{id:string;rewards:{id:string}[]}>(await call('campaigns/public/'+slug));assert.equal(published.id,campaignId);assert.equal(published.rewards.length,1)
  const checkout={campaignId,amount:'12.00',currencyCode:'BOB',rewardId:published.rewards[0]!.id,requestKey:randomUUID(),demoConsent:true}
  const supportAmount=await data<{contribution:{id:string;paymentId:string};ticket:{payable:boolean}}>(await call('demo-payments/checkout',sponsor.cookie,checkout),201);const ticketId=supportAmount.contribution.id
  assert.equal(supportAmount.ticket.payable,false)
  const duplicate=await data<typeof supportAmount>(await call('demo-payments/checkout',sponsor.cookie,checkout),201);assert.equal(duplicate.contribution.id,ticketId)
  const paymentId=supportAmount.contribution.paymentId
  await data(await call(`demo-payments/${paymentId}/simulate`,sponsor.cookie,{outcome:'CONFIRMED',requestKey:randomUUID()}))
  assert.equal((await call('demo-payments/checkout',sponsor.cookie,{...checkout,requestKey:randomUUID()})).status,409,'Un cupo no se vende dos veces.')
  assert.equal((await call(`contributions/${ticketId}`,owner.cookie)).status,404)
  phase('Aporte DEMO','Campaña persistida tras reinicio; aporte/recibo ficticios, idempotencia, pago confirmado y cupo único comprobados.')
  const caseInput={requestId:randomUUID(),campaignId,contributionId:null,category:'INCORRECT_INFORMATION',subject:'DEMO Consulta del recorrido integral',description:'Consulta sintética para comprobar la comunicación entre aportante y soporte.',evidenceFileIds:[],confirmed:true}
  const incident=await data<{id:string}>(await call('me/support-cases',sponsor.cookie,caseInput),201)
  await data(await call(`admin/support-cases/${incident.id}/messages`,support.cookie,{requestId:randomUUID(),body:'La información del ensayo fue revisada; puedes consultar el detalle de la campaña.'}))
  await data(await call(`admin/support-cases/${incident.id}/actions`,support.cookie,{status:'RESOLVED',reason:'Se aclaró la consulta y no quedan obligaciones de soporte.'}))
  phase('Soporte conectado','Incidencia del aportante, respuesta privada de SUPPORT e historial/resolución sin mover dinero.')
  let cycle=await data<Cycle>(await call(`admin/campaign-cycle/${campaignId}`,admin.cookie))
  const cycleAction=(action:string,u=admin)=>call(`admin/campaign-cycle/${campaignId}/actions`,u.cookie,{action,expectedVersion:cycle.version,requestKey:randomUUID(),reason:'Decisión del recorrido integral académico, solo DEMO.',demoConsent:true})
  assert.equal((await cycleAction('END_FUNDING')).status,409)
  // Only the time boundary is accelerated. No funding outcome or business status is seeded.
  sql(`UPDATE public.campaign SET ends_at=clock_timestamp()-interval '1 second' WHERE id='${campaignId}';`)
  cycle=await data<Cycle>(await cycleAction('END_FUNDING'),201);assert.equal(cycle.outcome,'EXECUTION_ELIGIBLE')
  cycle=await data<Cycle>(await cycleAction('START_EXECUTION'),201);assert.equal(cycle.status,'IN_EXECUTION')
  let dest=await data<Destination>(await call(`me/disbursements/campaigns/${campaignId}/destination`,owner.cookie,{reference:'DEMO-HUERTO-INTEGRAL',holder:'DEMO Huerto Ñandú',expectedVersion:0,reason:'Destino ficticio del recorrido integral académico.',requestKey:randomUUID(),demoConsent:true},'PUT'));destinationId=dest.destination.id
  dest=await data<Destination>(await call(`admin/finance/disbursements/campaigns/${campaignId}/destination/review`,finance.cookie,{decision:'VERIFIED',expectedVersion:dest.destination.version,reason:'Revisión ajena del destino sintético de la campaña.',requestKey:randomUUID(),demoConsent:true}),201)
  let payout=await data<Payout>(await call(`me/disbursements/campaigns/${campaignId}`,owner.cookie,{amount:'12.00',payoutAccountId:dest.destination.id,destinationVersion:dest.destination.version,scheduledFor:null,reason:'Financiar herramientas de ensayo con saldo DEMO confirmado.',requestKey:randomUUID(),demoConsent:true}),201)
  const payoutAction=(action:string,u=finance)=>call(`admin/finance/disbursements/${payout.id}/actions`,u.cookie,{action,expectedVersion:payout.version,requestKey:randomUUID(),reason:'Operación sintética con saldo y responsable separados.',demoConsent:true})
  assert.equal((await payoutAction('AUTHORIZE',admin)).status,403);assert.equal((await payoutAction('AUTHORIZE',auditor)).status,403)
  for(const action of ['AUTHORIZE','PROCESS_DEMO','COMPLETE_DEMO'])payout=await data<Payout>(await payoutAction(action),201)
  assert.equal(payout.status,'COMPLETED');assert.equal(payout.externalReference,'DEMO-DISBURSEMENT:'+payout.id)
  phase('Resultado y desembolso','Vencimiento acelerado explícito; meta real computada, ejecución con KYC, destino ficticio revisado y desembolso completo por FINANCE.')
  let progress=await data<ProgressState>(await call(`campaigns/${campaignId}/progress`,owner.cookie))
  const completion={revision:progress.revision,activities:progress.activities.map(a=>({id:a.id,responsibleName:a.responsibleName,status:'COMPLETED',progressPercent:100,actualStartOn:today,actualEndOn:today})),milestones:progress.milestones.map(m=>({id:m.id,responsibleName:m.responsibleName,status:'COMPLETED',progressPercent:100,actualStartOn:today,actualEndOn:today})),indicators:progress.indicators.map(i=>({id:i.id,achievedValue:1}))}
  assert.equal((await call(`campaigns/${campaignId}/progress`,owner.cookie,{...completion,activities:[{...completion.activities[0],progressPercent:101}]},'PUT')).status,400)
  progress=await data<ProgressState>(await call(`campaigns/${campaignId}/progress`,owner.cookie,completion,'PUT'))
  const updateId=randomUUID();await data(await call(`campaigns/${campaignId}/updates/${updateId}`,owner.cookie,{revision:null,title:'DEMO Huerto finalizado con evidencia',body:'Las dos actividades del huerto del ensayo finalizaron y la familia participó.',milestoneId:progress.milestones[0]!.id,images:[],publish:true},'PUT'))
  const publicUpdates=await data<{items:unknown[]}>(await call(`campaigns/public/${campaignId}/updates`));assert.equal(publicUpdates.items.length,1)
  let closure=await data<Closure>(await call(`me/campaign-closure/${campaignId}`,owner.cookie))
  const finalAction=(action:string,body:object,u=owner)=>call(`${u===owner?'me':'admin'}/campaign-closure/${campaignId}/actions`,u.cookie,{action,data:body,expectedVersion:closure.version,requestKey:randomUUID(),reason:'Rendición y cumplimiento documentados del ensayo integral.',demoConsent:true})
  assert.equal(closure.pending.rewards,1)
  const rewardFile=await file(owner);closure=await data<Closure>(await finalAction('FULFILL_REWARD',{contributionId:ticketId,fulfilledOn:today,fileId:rewardFile.id}),201);assert.equal(closure.pending.rewards,0)
  const evidence=await file(owner),finalReport={periodStart:today,periodEnd:today,narrative:'DEMO Se preparó el huerto con dos actividades y participación de una familia.',varianceExplanation:'El gasto final superó en dos bolivianos el presupuesto inicial del ensayo.',expenses:[{budgetItemId:null,expenseCategoryId:expense,description:'Herramientas y entrega del huerto DEMO',amount:'12.00',spentOn:today,fileIds:[evidence.id]}]}
  assert.equal((await finalAction('SUBMIT_FINAL',{...finalReport,expenses:[{...finalReport.expenses[0],amount:'12.01'}]})).status,409)
  closure=await data<Closure>(await finalAction('SUBMIT_FINAL',finalReport),201)
  assert.equal((await finalAction('APPROVE_FINAL',{reportId:closure.report!.id},finance)).status,403)
  closure=await data<Closure>(await finalAction('APPROVE_FINAL',{reportId:closure.report!.id},reviewer),201);assert.equal(closure.report!.status,'APPROVED')
  cycle=await data<Cycle>(await call(`admin/campaign-cycle/${campaignId}`,admin.cookie));assert.deepEqual(cycle.closeBlockers,[])
  cycle=await data<Cycle>(await cycleAction('CLOSE'),201);assert.equal(cycle.status,'CLOSED')
  assert.equal((await cycleAction('START_EXECUTION')).status,409)
  assert.equal((await finalAction('SUBMIT_FINAL',finalReport)).status,409)
  phase('Seguimiento, recompensa y cierre','Dos actividades/hito e indicador completados; novedad pública, recompensa acreditada, rendición final revisada por REVIEWER y cierre terminal por ADMIN.')
  await app!.close();app=undefined;await start()
  assert.equal((await data<Cycle>(await call(`admin/campaign-cycle/${campaignId}`,auditor.cookie))).status,'CLOSED')
  assert.equal((await data<Payout>(await call(`me/disbursements/${payout.id}`,owner.cookie))).status,'COMPLETED')
  assert.equal((await data<Closure>(await call(`me/campaign-closure/${campaignId}`,owner.cookie))).report!.status,'APPROVED')
  await data(await call('admin/audit',auditor.cookie));assert.equal((await call('admin/audit',sponsor.cookie)).status,403)
  await data(await call('campaigns/public/'+slug))
  assert.equal(sql(`SELECT amount_raised FROM public.v_campaign_funding WHERE campaign_id='${campaignId}'`),'12.00')
  assert.equal(sql(`SELECT count(*) FROM public.contribution WHERE campaign_id='${campaignId}'`),'1')
  assert.equal(sql(`SELECT sum(gross_amount)::numeric(18,2)::text FROM public.disbursement WHERE campaign_id='${campaignId}' AND status='COMPLETED'`),'12.00')
  assert.equal(sql(`SELECT sum(spent_amount)::numeric(18,2)::text FROM public.accountability_expense WHERE report_id='${closure.report!.id}'`),'12.00')
  phase('Persistencia y trazabilidad','API reiniciada dos veces; campaña CLOSED, aporte único12.00, desembolso COMPLETED, informe APPROVED y AUDITOR en lectura persistidos.')
  completed=true
  const acceptanceEvidence={scenario:'S3-21 integral',mode:'DEMO',campaignId,slug,contributionId:ticketId,disbursementId:payout.id,finalReportId:closure.report!.id,steps,final:{campaign:'CLOSED',contributionCount:1,raised:'12.00',disbursed:'12.00',expenses:'12.00',currency:'BOB'},humanAcceptance:'PENDING',clockAdjustment:'Solo ends_at de esta campaña; no se insertan estados de negocio aprobados.'}
  console.log('S3_21_EVIDENCE '+JSON.stringify(acceptanceEvidence))
  if(process.env.BROTAR_QA_KEEP_FIXTURES==='true'){await mkdir(resolve('../tmp'),{recursive:true});await writeFile(resolve('../tmp/s321-integral-fixture.json'),JSON.stringify({evidence:acceptanceEvidence,users,password,fileRoot},null,2));console.log('QA fixtures retained privately for human review.')}
 }catch(error){console.error('S3_21_FAILURE_STAGE '+(steps.at(-1)?.stage??'Preparación'));throw error}
 finally{
  await app?.close()
  for(const [key,value] of Object.entries({DEMO_PAYMENTS_ENABLED:saved.demo,CAMPAIGN_ADMIN_PUBLICATION_ENABLED:saved.publication,FILE_STORAGE_DIR:saved.files})){if(value===undefined)delete process.env[key];else process.env[key]=value}
  if(!completed||process.env.BROTAR_QA_KEEP_FIXTURES!=='true'){
   if(campaignId)sql(`DELETE FROM brotar_extension.campaign_reward_evidence WHERE contribution_id IN(SELECT id FROM public.contribution WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.campaign_final_report WHERE campaign_id='${campaignId}';DELETE FROM brotar_extension.demo_disbursement_event WHERE disbursement_id IN(SELECT id FROM public.disbursement WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_disbursement WHERE disbursement_id IN(SELECT id FROM public.disbursement WHERE campaign_id='${campaignId}');DELETE FROM public.disbursement WHERE campaign_id='${campaignId}';DELETE FROM brotar_extension.demo_destination_event WHERE payout_account_id IN(SELECT payout_account_id FROM brotar_extension.demo_destination WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.demo_destination WHERE campaign_id='${campaignId}';${destinationId?`DELETE FROM public.payout_account WHERE id='${destinationId}';`:''}DELETE FROM brotar_extension.campaign_cycle_event WHERE campaign_id='${campaignId}';DELETE FROM brotar_extension.campaign_cycle WHERE campaign_id='${campaignId}';DELETE FROM brotar_extension.support_case_event WHERE case_id IN(SELECT id FROM public.support_case WHERE campaign_id='${campaignId}');DELETE FROM brotar_extension.support_case_context WHERE case_id IN(SELECT id FROM public.support_case WHERE campaign_id='${campaignId}');DELETE FROM public.support_case WHERE campaign_id='${campaignId}';DELETE FROM public.accountability_report WHERE campaign_id='${campaignId}';DELETE FROM brotar_extension.demo_event WHERE payment_id IN(SELECT p.id FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM public.payment_event WHERE payment_id IN(SELECT p.id FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE c.campaign_id='${campaignId}');DELETE FROM public.payment WHERE contribution_id IN(SELECT id FROM public.contribution WHERE campaign_id='${campaignId}');DELETE FROM public.contribution WHERE campaign_id='${campaignId}';DELETE FROM public.campaign WHERE id='${campaignId}';`)
   removeDemoIdentityFixtures(sql,Object.values(users).map(u=>u.id));for(const u of Object.values(users))sql(`UPDATE public.file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE uploaded_by='${u.id}';DELETE FROM public.audit_log WHERE actor_user_id='${u.id}';DELETE FROM public.app_user WHERE id='${u.id}';`)
   assert.ok(resolve(fileRoot).startsWith(resolve(tmpdir(),'brotar-s321-files-')))
   await rm(fileRoot,{recursive:true,force:true})
  }
 }
})
