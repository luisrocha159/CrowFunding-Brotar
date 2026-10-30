import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {ContactMail,ContactMailSender} from '../src/contacts/contact-mail'
import {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {approveDemoIdentity,removeDemoIdentityFixtures} from './demo-identity-fixture'

test('S3-26 transversal: correo propio → decisión real → cola/reinicio/reintento → lectura/opt-out y KYB', {timeout:180000}, async()=>{
 const config=readDatabaseConfig(process.env)
 assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const target=readTestDatabaseTarget(config);assert.match(target.project,/qa/)
 assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',target.container],{encoding:'utf8'}).trim(),target.project)
 const sql=(query:string)=>execFileSync('docker',['exec','-i',target.container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:query,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}))
 const ip=`transversal-mail-${randomUUID()}`;app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:ip});next()})
 await app.listen(0,'127.0.0.1')
 const base=await app.getUrl(),suffix=randomUUID(),users:string[]=[],campaigns:string[]=[],orgs:string[]=[],password=randomBytes(24).toString('hex')
 const messages:{to:string;subject:string;text:string;id?:string}[]=[],mail=app.get(ContactMail),sender=app.get(ContactMailSender)
 let available=true,fail=false
 sender.available=()=>available;sender.origin=()=>'http://127.0.0.1:5173'
 sender.send=async(to,_subject,text,id)=>{if(fail)throw new Error('QA transport failure');messages.push({to,subject:_subject,text,id})}
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'POST')=>fetch(`${base}/api/${path}`,{method,headers:{Cookie:cookie,Origin:'http://127.0.0.1:5173','X-Brotar-Request':'1','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const data=async<T>(r:Response,status=200):Promise<T>=>{assert.equal(r.status,status,await r.clone().text());return await r.json() as T}
 const account=async(role:string)=>{const email=`s326-${users.length}-${suffix}@example.invalid`,{id}=await data<{id:string}>(await call('auth/register','',{legalVersion:'mvp-demo-legal-1.0-20261028',firstName:'DEMO',lastName:'Correo',email,password,demoConsent:true}),201);users.push(id)
  if(role!=='REGISTERED_USER')sql(`INSERT INTO public.user_role(user_id,role_id) SELECT '${id}',id FROM public.role WHERE code='${role}';`)
  const r=await call('auth/login','',{email,password});assert.equal(r.status,200);return{id,email,cookie:r.headers.get('set-cookie')!.split(';')[0]!}}
 try{
  for(let i=0;i<100&&await mail.collect()===100;i++){ /* Drain prior QA history before measuring these fixtures. */ }
  const owner=await account('CREATOR'),other=await account('REGISTERED_USER'),reviewer=await account('REVIEWER')
  sql(`INSERT INTO public.user_role(user_id,role_id) SELECT '${reviewer.id}',id FROM public.role WHERE code='COMPLIANCE';`)
  await data(await call('contacts/email/request',owner.cookie,{}),201)
  const raw=/token=([a-f0-9]{64})/.exec(messages[0]!.text)![1]!
  assert.equal((await call('contacts/email/confirm',other.cookie,{token:raw})).status,400)
  await data(await call('contacts/email/confirm',owner.cookie,{token:raw}),201)
  await data(await call('contacts/email/preferences',owner.cookie,{enabled:true},'PUT'))
  assert.equal(messages.length,1)
  const seed=()=>{const id=randomUUID();campaigns.push(id);sql(`INSERT INTO public.campaign(id,slug,creator_user_id,title,summary,campaign_type,goal_amount,currency_code,status)
   VALUES('${id}','s326-${id}','${owner.id}','DEMO Avisos de campaña','DEMO Datos sintéticos para verificar comunicaciones','DONATION',100,'BOB','IN_REVIEW');INSERT INTO public.campaign_review(campaign_id,round) VALUES('${id}',1);`);return id}
  const id=seed(),decision={decision:'CHANGES_REQUESTED',expectedRound:1,comment:'PRIVADO_MOTIVO: revisar documentos sensibles antes de publicar.',observations:[{section:'story',fieldPath:'problem',message:'PRIVADO_OBSERVACION: completar el relato con datos del titular.'}]}
  const path=`admin/campaigns/${id}/decision`
  assert.equal((await call(path,owner.cookie,decision)).status,403)
  assert.equal((await call(path,reviewer.cookie,{...decision,comment:' '})).status,400)
  await mail.collect();assert.equal((await mail.notices(owner.id)).length,0,'Las operaciones rechazadas no generan avisos.')
  const concurrent=await Promise.all([call(path,reviewer.cookie,decision),call(path,reviewer.cookie,decision)])
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);await Promise.all([mail.collect(),mail.collect()])
  const notices=await data<{id:string;body:string;delivery:string}[]>(await call('contacts/notifications',owner.cookie))
  assert.equal(notices.length,1);const notice=notices[0]!
  assert.equal(notice.delivery,'QUEUED');assert.match(notice.body,/con observaciones/);assert.doesNotMatch(notice.body,/PRIVADO_|CHANGES_REQUESTED/)
  assert.deepEqual(await data(await call('contacts/notifications',other.cookie)),[])
  available=false;await mail.tick();assert.equal((await mail.notices(owner.id))[0]!.delivery,'QUEUED');assert.equal(messages.length,1)
  // Replace the worker instance: the queue survives in PostgreSQL, not in instance memory.
  const restarted=new ContactMail(app.get(DatabaseService),sender);available=true;fail=true;await restarted.tick()
  assert.equal((await mail.notices(owner.id))[0]!.delivery,'RETRY')
  sql(`UPDATE brotar_extension.mail_delivery SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE notification_id='${notice.id}';`)
  fail=false;await Promise.all([restarted.tick(),mail.tick()])
  const sent=messages.filter(m=>m.id===notice.id);assert.equal(sent.length,1);assert.equal(sent[0]!.to,owner.email);assert.doesNotMatch(sent[0]!.text,/PRIVADO_|token=|documentos sensibles/)
  assert.equal((await mail.notices(owner.id))[0]!.attempts,2)
  await restarted.tick();assert.equal(messages.filter(m=>m.id===notice.id).length,1)
  assert.deepEqual(await data(await call(`contacts/notifications/${notice.id}/read`,other.cookie,{}),201),{updated:false})
  for(let i=0;i<2;i++)assert.deepEqual(await data(await call(`contacts/notifications/${notice.id}/read`,owner.cookie,{}),201),{updated:true})
  assert.ok((await mail.notices(owner.id))[0]!.readAt)
  await data(await call('contacts/email/preferences',owner.cookie,{enabled:false},'PUT'))
  const rejected=seed();await data(await call(`admin/campaigns/${rejected}/decision`,reviewer.cookie,{decision:'REJECTED',comment:'PRIVADO_RECHAZO: faltan respaldos suficientes para esta iniciativa.',expectedRound:1,observations:[]}))
  await restarted.tick();assert.equal((await mail.notices(owner.id))[0]!.delivery,'IN_APP');assert.equal(messages.filter(m=>m.id).length,1)
  await data(await call('contacts/email/preferences',owner.cookie,{enabled:true},'PUT'));await restarted.tick();assert.equal(messages.filter(m=>m.id).length,1,'Activar no envía retroactivamente avisos sin suscripción.')
  // KYB uses the authorized creator account, never organization.contact_email as a verified address.
  // Separate test phase: advance only this fixture's write window, not production limits.
  const keys=[`ip:${ip}`,...users.map(id=>`account:${id}`)].map(k=>`'${createHash('sha256').update('mvp-case-write:'+k).digest('hex')}'`)
  sql(`UPDATE brotar_extension.rate_bucket SET expires_at=clock_timestamp()-interval '1 second' WHERE key_hash IN(${keys.join(',')});`)
  await approveDemoIdentity(call,owner.cookie,reviewer.cookie)
  const types=await data<{id:string}[]>(await call('organizations/types',owner.cookie))
  const org=await data<{id:string}>(await call('organizations',owner.cookie,{legalName:`DEMO Correo institucional ${suffix}`,tradeName:'DEMO',organizationTypeId:types[0]!.id,contactEmail:'institucion-no-verificada@example.invalid',contactPhone:''}),201);orgs.push(org.id)
  const verification=await approveDemoIdentity(call,owner.cookie,reviewer.cookie,'KYB_LEGAL',org.id)
  await restarted.tick();const kyb=messages.filter(m=>m.id&&m.subject.includes('verificación'))
  assert.ok(kyb.length>=2);assert.ok(kyb.every(m=>m.to===owner.email));assert.ok(messages.every(m=>m.to!== 'institucion-no-verificada@example.invalid'))
  assert.ok((await mail.notices(owner.id)).some(n=>n.entityName==='VERIFICATION'))
  const state=await data<{verifiedAt:string;emailNotifications:boolean;phoneChannelAvailable:boolean}>(await call('contacts',owner.cookie));assert.ok(state.verifiedAt);assert.equal(state.emailNotifications,true);assert.equal(state.phoneChannelAvailable,false)
  assert.equal(sql(`SELECT status FROM public.verification WHERE id='${verification.id}'`),'APPROVED')
  assert.equal(sql(`SELECT count(*) FROM public.notification n JOIN public.status_history h ON h.entity_id=n.entity_id AND h.entity_type='VERIFICATION' AND h.to_status='APPROVED' WHERE n.user_id='${owner.id}' AND n.entity_id='${verification.id}' AND n.body LIKE '%aprobada.%' AND n.created_at=h.changed_at`),'1','La fecha del aviso conserva la del cambio, no la del lote de procesamiento.')
  assert.match((await mail.notices(owner.id))[0]!.body,/aprobada/)
 }finally{
  await app.close();removeDemoIdentityFixtures(sql,users)
  for(const org of orgs)sql(`DELETE FROM public.verification_document WHERE verification_id IN(SELECT id FROM public.verification WHERE organization_id='${org}');DELETE FROM brotar_extension.verification_revision WHERE verification_id IN(SELECT id FROM public.verification WHERE organization_id='${org}');DELETE FROM public.verification WHERE organization_id='${org}';DELETE FROM public.organization WHERE id='${org}';`)
  for(const id of campaigns)sql(`DELETE FROM public.status_history WHERE entity_type='CAMPAIGN' AND entity_id='${id}';DELETE FROM public.campaign WHERE id='${id}';`)
  for(const id of users)sql(`DELETE FROM public.audit_log WHERE actor_user_id='${id}';DELETE FROM public.app_user WHERE id='${id}';`)
 }
})
