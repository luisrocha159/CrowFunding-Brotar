import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {ContactMail,ContactMailSender} from '../src/contacts/contact-mail'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {createDataSource} from '../src/shared/infrastructure/database/data-source'
import {readTestDatabaseTarget} from './database-target'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'

test('correo integrado: titular, caducidad, reenvío, privilegios, preferencias, cola durable y fallos sin datos sensibles',{timeout:90000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const target=readTestDatabaseTarget(config)
 assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',target.container],{encoding:'utf8'}).trim(),target.project)
 const admin=(sql:string)=>execFileSync('docker',['exec','-i',target.container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:sql,stdio:['pipe','pipe','pipe'],timeout:10000})
 const source=createDataSource(config);await source.initialize()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl()
 const sender=app.get(ContactMailSender),mail=app.get(ContactMail),suffix=randomUUID(),password=randomBytes(24).toString('hex'),users:string[]=[],cookies:string[]=[]
 let available=true,fail=false;const messages:{to:string;subject:string;text:string}[]=[]
 sender.available=()=>available;sender.origin=()=>'http://127.0.0.1:5173';sender.send=async(to,subject,text)=>{if(fail)throw new Error('SMTP simulated failure (not logged)');messages.push({to,subject,text})}
 const request=(path:string,cookie='',method='GET',body?:unknown,headers:Record<string,string>={})=>fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Cookie:cookie,Origin:'http://127.0.0.1:5173',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const challenge=async(user:string,email:string,opts:{expired?:boolean;revoked?:boolean}={})=>{const raw=randomBytes(32).toString('hex');const [t]=await source.query(`INSERT INTO public.user_token(user_id,token_type,token_hash,created_at,expires_at,revoked_at) VALUES($1,'EMAIL_VERIFICATION',$2,clock_timestamp()-interval '2 minutes',clock_timestamp()+$3::interval,CASE WHEN $4 THEN clock_timestamp() END) RETURNING id`,[user,createHash('sha256').update(raw).digest('hex'),opts.expired?'-1 minute':'30 minutes',opts.revoked===true]);await source.query('INSERT INTO brotar_extension.email_challenge(token_id,user_id,email) VALUES($1,$2,$3)',[t.id,user,email]);return raw}
 const email=(i:number)=>`contact-${i}-${suffix}@example.invalid`
 let verification=''
 try{
  // QA conserva historial de otros ensayos; procesarlo antes de medir SOLO el fixture actual.
  for(let batch=0;batch<100;batch++){if(await mail.collect()<100)break}
  for(let i=0;i<2;i++){const r=await request('auth/register','','POST',{ legalVersion:'mvp-demo-legal-1.0-20261028',firstName:'Prueba',lastName:'Correo',email:email(i),password,demoConsent:true});assert.equal(r.status,201);users.push((await r.json() as {id:string}).id);const l=await request('auth/login','','POST',{email:email(i),password});assert.equal(l.status,200);cookies.push(l.headers.get('set-cookie')!.split(';')[0]!)}
  assert.equal((await request('contacts')).status,401)
  assert.equal((await request('contacts/email/request',cookies[0],'POST',undefined,{'X-Brotar-Request':''})).status,403)
  assert.equal((await request('contacts/email/preferences',cookies[0],'PUT',{enabled:'true'})).status,400)
  assert.equal((await request('contacts/email/preferences',cookies[0],'PUT',{enabled:true})).status,400)
  available=false;assert.equal((await request('contacts/email/request',cookies[0],'POST')).status,503);available=true
  const sent=await request('contacts/email/request',cookies[0],'POST');assert.equal(sent.status,201);assert.deepEqual(await sent.json(),{status:'smtp_accepted'})
  assert.equal((await request('contacts/email/request',cookies[0],'POST')).status,429)
  assert.equal(messages.length,1);assert.equal(messages[0]!.to,email(0))
  const raw=/token=([a-f0-9]{64})/.exec(messages[0]!.text)![1]!
  const stored=await source.query('SELECT token_hash FROM public.user_token WHERE user_id=$1 AND token_type=\'EMAIL_VERIFICATION\'',[users[0]])
  assert.equal(stored[0].token_hash,createHash('sha256').update(raw).digest('hex'));assert.notEqual(stored[0].token_hash,raw)
  for(const [cookie,token] of [[cookies[1],raw],[cookies[0],'x'],[cookies[0],await challenge(users[0]!,email(0),{expired:true})],[cookies[0],await challenge(users[0]!,email(0),{revoked:true})],[cookies[0],await challenge(users[0]!,email(1))]])assert.equal((await request('contacts/email/confirm',cookie,'POST',{token})).status,400)
  assert.equal((await request('contacts/email/confirm',cookies[0],'POST',{token:raw,userId:users[1]})).status,400)
  assert.equal((await request('contacts/email/confirm',cookies[0],'POST',{token:raw})).status,201)
  assert.equal((await request('contacts/email/confirm',cookies[0],'POST',{token:raw})).status,400)
  const verified=await (await request('contacts',cookies[0])).json() as {verifiedAt:string};assert.ok(verified.verifiedAt)
  assert.equal((await source.query('SELECT status,phone_verified_at FROM public.app_user WHERE id=$1',[users[0]]))[0].status,'PENDING_VERIFICATION')
  assert.deepEqual((await source.query('SELECT r.code FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=$1',[users[0]])).map((r:{code:string})=>r.code),['REGISTERED_USER'])
  assert.equal((await request('contacts/email/preferences',cookies[0],'PUT',{enabled:true})).status,200)
  // Historial real producido por la actualización de una verificación propia.
  const [v]=await source.query(`INSERT INTO public.verification(verification_type_id,user_id) SELECT id,$1 FROM public.verification_type WHERE code='KYC_IDENTITY' RETURNING id`,[users[0]]);verification=v.id
  await mail.collect();assert.equal((await mail.notices(users[0]!)).length,0,'La creación inicial no genera correo.')
  await source.query(`UPDATE public.verification SET status='IN_REVIEW' WHERE id=$1`,[verification])
  await Promise.all([mail.collect(),mail.collect()]);const ns=await mail.notices(users[0]!);assert.equal(ns.length,1);assert.equal(ns[0]!.delivery,'QUEUED')
  assert.equal((await mail.notices(users[1]!)).length,0)
  assert.deepEqual(await (await request(`contacts/notifications/${ns[0]!.id}/read`,cookies[1],'POST')).json(),{updated:false})
  fail=true;await mail.tick();let [delivery]=await source.query('SELECT * FROM brotar_extension.mail_delivery WHERE notification_id=$1',[ns[0]!.id]);assert.equal(delivery.result,'RETRY');assert.equal(delivery.attempts,1)
  admin(`UPDATE brotar_extension.mail_delivery SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE notification_id='${ns[0]!.id}';`)
  fail=false;await mail.tick();[delivery]=await source.query('SELECT * FROM brotar_extension.mail_delivery WHERE notification_id=$1',[ns[0]!.id]);assert.equal(delivery.result,'SMTP_ACCEPTED');assert.equal(delivery.attempts,2)
  assert.equal(messages.length,2);await mail.tick();assert.equal(messages.length,2,'No repetir un correo ya aceptado.')
  assert.equal((await request(`contacts/notifications/${ns[0]!.id}/read`,cookies[0],'POST')).status,201);assert.ok((await mail.notices(users[0]!))[0]!.readAt)
  assert.equal((await source.query('SELECT status FROM public.notification WHERE id=$1',[ns[0]!.id]))[0].status,'READ')
  assert.ok(!messages[1]!.text.includes(password));assert.ok(!messages[1]!.text.includes('token='))
  await source.query(`UPDATE public.verification SET status='REQUIRES_INFO' WHERE id=$1`,[verification]);await mail.collect()
  await mail.preference(users[0]!,false);await mail.tick();assert.equal((await mail.notices(users[0]!))[0]!.delivery,'CANCELLED')
  await mail.preference(users[0]!,true)
  await source.query(`UPDATE public.verification SET status='REJECTED' WHERE id=$1`,[verification]);await mail.collect()
  fail=true;await mail.tick();for(let i=0;i<2;i++){admin(`UPDATE brotar_extension.mail_delivery SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE result='RETRY' AND notification_id IN (SELECT id FROM public.notification WHERE user_id='${users[0]}');`);await mail.tick()}
  assert.equal((await mail.notices(users[0]!))[0]!.delivery,'FAILED');assert.equal((await mail.notices(users[0]!))[0]!.attempts,3)
  // Cambiar la dirección en un proceso autorizado invalida el distintivo y los enlaces anteriores.
  admin(`UPDATE public.app_user SET email='changed-${suffix}@example.invalid' WHERE id='${users[0]}';`)
  assert.equal((await mail.status(users[0]!)).verifiedAt,null);await assert.rejects(()=>mail.preference(users[0]!,true))
  // Un fallo de SMTP anula el enlace; el siguiente envío también revoca los anteriores.
  fail=true;await assert.rejects(()=>mail.request(users[1]!))
  assert.equal((await source.query(`SELECT count(*)::int AS n FROM public.user_token WHERE user_id=$1 AND token_type='EMAIL_VERIFICATION' AND revoked_at IS NULL`,[users[1]]))[0].n,0)
  admin(`UPDATE brotar_extension.email_challenge SET requested_at=clock_timestamp()-interval '61 seconds' WHERE user_id='${users[1]}';`)
  fail=false;await mail.request(users[1]!);const replaced=/token=([a-f0-9]{64})/.exec(messages.at(-1)!.text)![1]!
  admin(`UPDATE brotar_extension.email_challenge SET requested_at=clock_timestamp()-interval '61 seconds' WHERE user_id='${users[1]}';`)
  await mail.request(users[1]!);await assert.rejects(()=>mail.confirm(users[1]!,replaced))
  // Bigserial no expresa el orden de commit: no perder un evento confirmado tarde.
  const before=(await mail.notices(users[0]!)).length,runner=source.createQueryRunner();await runner.connect();await runner.startTransaction()
  try{
   await runner.query(`INSERT INTO public.status_history(entity_type,entity_id,from_status,to_status) VALUES('VERIFICATION',$1,'PENDING','IN_REVIEW')`,[verification])
   await source.query(`INSERT INTO public.status_history(entity_type,entity_id,from_status,to_status) VALUES('VERIFICATION',$1,'IN_REVIEW','REQUIRES_INFO')`,[verification])
   await mail.collect();assert.equal((await mail.notices(users[0]!)).length,before+1)
   await runner.commitTransaction();await mail.collect();assert.equal((await mail.notices(users[0]!)).length,before+2)
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release()}
  // Auditor conserva lectura incluso con REGISTERED_USER y otros permisos.
  admin(`INSERT INTO public.user_role(user_id,role_id) SELECT '${users[1]}',id FROM public.role WHERE code='AUDITOR';`)
  assert.equal((await request('contacts',cookies[1])).status,200);assert.equal((await request('contacts/email/request',cookies[1],'POST')).status,403)
  const forbidden=await request('contacts/notifications',cookies[0],'GET',undefined,{Origin:'https://untrusted.invalid'});assert.equal(forbidden.headers.get('access-control-allow-origin'),null)
 }finally{
  await app.close()
  if(verification)admin(`DELETE FROM public.status_history WHERE entity_type='VERIFICATION' AND entity_id='${verification}';DELETE FROM public.verification WHERE id='${verification}';`)
  for(const id of users)admin(`DELETE FROM public.audit_log WHERE actor_user_id='${id}';DELETE FROM public.app_user WHERE id='${id}';`)
  await source.destroy()
 }
})
