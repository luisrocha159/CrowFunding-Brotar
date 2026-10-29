import 'reflect-metadata'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes,randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {DataSource} from 'typeorm'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {createDataSource} from '../src/shared/infrastructure/database/data-source'
import {readTestDatabaseTarget} from './database-target'
import {LEGAL_VERSION} from '../src/legal/domain/legal-v1-20261028'
import {LEGAL_HASH} from '../src/legal/legal-record'
import type {VerificationType,VerificationDetail} from '../src/verifications/application/verifications'

test('condiciones provisionales HTTP/PostgreSQL: textos exactos, aceptación explícita, legado, expediente y rollback', {timeout:90000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');readTestDatabaseTarget(config)
 const env=parseEnv(readFileSync('../infra/postgres-v2/.env','utf8'))
 const admin=new DataSource({type:'postgres',host:config.host,port:config.port,database:config.database,username:'postgres',password:env.POSTGRES_PASSWORD,synchronize:false,entities:[]})
 const source=createDataSource(config);await source.initialize();await admin.initialize()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl()
 const key=randomUUID(),password=randomBytes(24).toString('hex'),users:string[]=[],files:string[]=[];let caseId=''
 const call=async(path:string,cookie='',method='GET',body?:unknown,origin='http://127.0.0.1:5173')=>{const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Origin:origin,Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});const text=await r.text();return{status:r.status,headers:r.headers,data:text?JSON.parse(text):null}}
 const input={legalVersion:LEGAL_VERSION,firstName:'Prueba',lastName:'Condiciones',email:`legal-${key}@example.invalid`,password,demoConsent:true}
 try{
  const published=await call('legal/documents');assert.equal(published.status,200);assert.equal(published.data.hash,LEGAL_HASH);assert.equal(published.data.documents.length,3)
  assert.equal((await call('legal/documents?version=%3Cscript%3E')).status,400)
  const missing={...input};delete (missing as Partial<typeof input>).legalVersion
  assert.equal((await call('auth/register','','POST',missing)).status,400)
  assert.equal((await call('auth/register','','POST',{...input,legalVersion:'anterior'})).status,400)
  assert.equal((await call('auth/register','','POST',{...input,demoConsent:false})).status,400)
  assert.equal((await source.query('SELECT count(*)::int AS n FROM app_user WHERE email=$1',[input.email]))[0].n,0)
  const reg=await call('auth/register','','POST',input);assert.equal(reg.status,201);users.push(reg.data.id)
  assert.equal((await source.query(`SELECT count(*)::int AS n FROM brotar_extension.legal_acceptance WHERE user_id=$1 AND purpose='ACCOUNT' AND bundle_hash=$2`,[users[0],LEGAL_HASH]))[0].n,1)
  const legacy=randomUUID();users.push(legacy)
  await admin.query('INSERT INTO app_user(id,email,password_hash) SELECT $1,$2,password_hash FROM app_user WHERE id=$3',[legacy,`legacy-${key}@example.invalid`,users[0]])
  await admin.query("INSERT INTO user_profile(user_id,first_name,last_name) VALUES($1,'Prueba','Anterior')",[legacy])
  await admin.query("INSERT INTO user_role(user_id,role_id) SELECT $1,id FROM role WHERE code='REGISTERED_USER'",[legacy])
  const login=await call('auth/login','','POST',{email:`legacy-${key}@example.invalid`,password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0]!
  assert.equal((await call('me/legal')).status,401)
  assert.equal((await call('me/legal',cookie)).data.accepted,false,'No hay aceptación retroactiva para una cuenta previa.')
  assert.equal((await call('me/legal',cookie,'PUT',{version:LEGAL_VERSION,accepted:true},'http://sitio-ajeno.invalid')).status,403)
  assert.equal((await call('me/legal',cookie,'PUT',{version:LEGAL_VERSION,accepted:false})).status,400)
  assert.equal((await call('me/legal',cookie,'PUT',{version:LEGAL_VERSION,accepted:true,userId:users[0]})).status,400)
  const types=(await call('me/verifications/types',cookie)).data as VerificationType[],type=types.find(t=>t.code==='KYC_IDENTITY')!;assert.ok(type.policy)
  const started=await call('me/verifications',cookie,'POST',{verificationTypeId:type.id});assert.equal(started.status,201);const detail=started.data as VerificationDetail;caseId=detail.id
  const docs=[]
  for(const d of type.policy.documents){const r=await call('files',cookie,'POST',{purpose:'VERIFICATION_DOCUMENT',visibility:'PRIVATE',originalName:'DEMO-acuerdo.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nDEMO respaldo sintetico').toString('base64')});assert.equal(r.status,201);files.push(r.data.id);docs.push({documentTypeId:d.documentTypeId,fileId:r.data.id})}
  const submission={expectedVersion:detail.version,policyVersion:type.policy.version,fields:Object.fromEntries(type.policy.fields.map(f=>[f.key,'DEMO Participante voluntario'])),documents:docs,accepted:true,submit:true}
  assert.equal((await call('me/verifications/'+caseId,cookie,'PUT',submission)).status,409)
  assert.equal((await source.query('SELECT status FROM verification WHERE id=$1',[caseId]))[0].status,'NOT_STARTED')
  assert.equal((await source.query('SELECT count(*)::int AS n FROM brotar_extension.legal_acceptance WHERE user_id=$1',[legacy]))[0].n,0)
  const accepts=await Promise.all([call('me/legal',cookie,'PUT',{version:LEGAL_VERSION,accepted:true}),call('me/legal',cookie,'PUT',{version:LEGAL_VERSION,accepted:true})]);assert.ok(accepts.every(r=>r.status===200&&r.data.accepted))
  assert.equal((await source.query("SELECT count(*)::int AS n FROM brotar_extension.legal_acceptance WHERE user_id=$1 AND purpose='ACCOUNT'",[legacy]))[0].n,1)
  const sent=await call('me/verifications/'+caseId,cookie,'PUT',submission);assert.equal(sent.status,200);assert.equal(sent.data.status,'PENDING')
  const [receipt]=await source.query("SELECT policy_version,reference_id,document_codes,bundle_hash FROM brotar_extension.legal_acceptance WHERE user_id=$1 AND purpose='VERIFICATION'",[legacy]);assert.equal(receipt.policy_version,type.policy.version);assert.equal(receipt.reference_id,caseId);assert.deepEqual(receipt.document_codes,['IDENTITY']);assert.equal(receipt.bundle_hash,LEGAL_HASH)
  assert.deepEqual((await source.query('SELECT r.code FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE user_id=$1',[legacy])).map((r:{code:string})=>r.code),['REGISTERED_USER'])
  await assert.rejects(source.query('UPDATE brotar_extension.legal_acceptance SET accepted_at=now() WHERE user_id=$1',[legacy]),/permission denied/)
  await assert.rejects(source.query('DELETE FROM brotar_extension.legal_bundle'),/permission denied/)
  const [{definition}]=await admin.query('SELECT definition FROM brotar_extension.legal_bundle WHERE version=$1',[LEGAL_VERSION])
  try{
   await admin.query("UPDATE brotar_extension.legal_bundle SET definition=jsonb_set(definition,'{mode}','\"INVALID\"') WHERE version=$1",[LEGAL_VERSION])
   const email=`rollback-legal-${key}@example.invalid`;assert.equal((await call('auth/register','','POST',{...input,email})).status,409)
   assert.equal((await source.query('SELECT count(*)::int AS n FROM app_user WHERE email=$1',[email]))[0].n,0,'Sin textos íntegros no queda una cuenta a medias.')
  }finally{await admin.query('UPDATE brotar_extension.legal_bundle SET definition=$2::jsonb WHERE version=$1',[LEGAL_VERSION,JSON.stringify(definition)])}
 }finally{
  if(caseId){await admin.query('DELETE FROM brotar_extension.verification_revision WHERE verification_id=$1',[caseId]);await admin.query('DELETE FROM verification_document WHERE verification_id=$1',[caseId]);await admin.query('DELETE FROM verification WHERE id=$1',[caseId])}
  for(const id of files)await admin.query('DELETE FROM file_asset WHERE id=$1',[id])
  for(const id of users){await admin.query('DELETE FROM audit_log WHERE actor_user_id=$1',[id]);await admin.query('DELETE FROM user_profile WHERE user_id=$1',[id]);await admin.query('DELETE FROM app_user WHERE id=$1',[id])}
  await app.close();await source.destroy();await admin.destroy()
 }
})
