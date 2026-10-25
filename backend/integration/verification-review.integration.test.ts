import 'reflect-metadata'
import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {randomUUID,randomBytes,createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {TypeormVerificationRepository} from '../src/verifications/infrastructure/typeorm-verification.repository'
import type {VerificationDetail,VerificationType} from '../src/verifications/application/verifications'

test('S2-08 PostgreSQL/HTTP: colas, revisión KYC/KYB, documentos privados, corrección, autoaprobación, versiones y permisos vigentes',{timeout:120000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container}=readTestDatabaseTarget(config)
 const sql=(s:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl()
 const users:string[]=[],files:string[]=[],organizations:string[]=[],cases:string[]=[],campaignId=randomUUID(),suffix=randomUUID(),password=randomBytes(24).toString('hex')
 const call=(path:string,cookie='',method='GET',body?:unknown,origin='http://127.0.0.1:5173')=>fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Origin:origin,Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const account=async(role:string)=>{const email=`kyc-review-${users.length}-${suffix}@example.invalid`;const r=await call('auth/register','','POST',{firstName:'DEMO',lastName:'Ensayo',email,password,demoConsent:true});assert.equal(r.status,201);const{id}=await r.json() as{id:string};users.push(id);if(role!=='REGISTERED_USER')sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`);const login=await call('auth/login','','POST',{email,password});assert.equal(login.status,200);return{id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}}
 try{
  const owner=await account('REGISTERED_USER'),reviewer=await account('COMPLIANCE'),other=await account('REGISTERED_USER'),auditor=await account('ADMIN')
  const budget=()=>sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN(${[...users.map(id=>`account:${id}`),'ip:127.0.0.1'].map(k=>`'${createHash('sha256').update('mvp-case-write:'+k).digest('hex')}'`).join(',')});`)
  budget()
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='AUDITOR';`)
  const types=await(await call('me/verifications/types',owner.cookie)).json() as VerificationType[]
  const capture=async(code:string,organizationId?:string)=>{
   const type=types.find(t=>t.code===code)!,policy=type.policy;assert.ok(policy);assert.match(policy.version,/^mvp-demo-/)
   const start=await call('me/verifications',owner.cookie,'POST',{verificationTypeId:type.id,...(organizationId?{organizationId}:{})});assert.equal(start.status,201);const value=await start.json() as VerificationDetail;cases.push(value.id)
   const docs=[]
   for(const doc of policy.documents){const r=await call('files',owner.cookie,'POST',{purpose:'VERIFICATION_DOCUMENT',visibility:'PRIVATE',originalName:'DEMO.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nDEMO synthetic').toString('base64')});assert.equal(r.status,201);const{id}=await r.json() as{id:string};files.push(id);docs.push({documentTypeId:doc.documentTypeId,fileId:id})}
   const fields=Object.fromEntries(policy.fields.map(f=>[f.key,'DEMO Ejemplo ficticio']))
   const sent=await call(`me/verifications/${value.id}`,owner.cookie,'PUT',{expectedVersion:value.version,policyVersion:policy.version,fields,documents:docs,accepted:true,submit:true});assert.equal(sent.status,200);return await sent.json() as VerificationDetail
  }
  const detail=await capture('KYC_IDENTITY');const fileId=detail.documents[0]!.fileId
  assert.equal((await call('admin/verifications')).status,401)
  assert.equal((await call('admin/verifications',other.cookie)).status,403)
  assert.equal((await call(`admin/verifications/${detail.id}/documents/${fileId}`,other.cookie)).status,403)
  assert.equal((await call(`files/public/${fileId}`)).status,404)
  const queue=await call('admin/verifications?kind=USER&status=PENDING',reviewer.cookie);assert.equal(queue.status,200);assert.ok((await queue.json() as{items:{id:string}[]}).items.some(i=>i.id===detail.id))
  assert.equal((await call('admin/verifications?kind=USER&status=PENDING&page=1.5',reviewer.cookie)).status,400)
  assert.equal((await call(`admin/verifications/${detail.id}/documents/${fileId}`,reviewer.cookie)).status,200)
  const read=async(id:string)=>{const r=await call(`admin/verifications/${id}`,reviewer.cookie);assert.equal(r.status,200);return r.json() as Promise<VerificationDetail>}
  const decide=(value:VerificationDetail,decision:string,cookie=reviewer.cookie,patch={})=>call(`admin/verifications/${value.id}/review`,cookie,'POST',{expectedVersion:value.version,decision,reason:'Revisión explícita de documento sintético de prueba.',documents:decision==='APPROVED'?value.documents.map(d=>({fileId:d.fileId,isValid:true,notes:'Documento DEMO legible'})):[],...patch})
  assert.equal((await decide(detail,'APPROVED')).status,400)
  assert.equal((await call(`admin/verifications/${detail.id}/review`,reviewer.cookie,'POST',{expectedVersion:detail.version,decision:'IN_REVIEW',reason:'Revisión explícita de datos ficticios.',documents:[]},'https://foreign.invalid')).status,403)
  assert.equal((await decide(detail,'IN_REVIEW',auditor.cookie)).status,403,'AUDITOR+ADMIN no escribe')
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='COMPLIANCE';`)
  assert.equal((await decide(detail,'IN_REVIEW',owner.cookie)).status,403)
  assert.equal((await decide(detail,'IN_REVIEW')).status,201)
  assert.equal((await decide(detail,'IN_REVIEW')).status,409)
  let current=await read(detail.id)
  assert.equal((await decide(current,'APPROVED',reviewer.cookie,{documents:[]})).status,400)
  assert.equal((await decide(current,'REQUIRES_INFO')).status,201)
  const ownerCase=await(await call(`me/verifications/${detail.id}`,owner.cookie)).json() as VerificationDetail
  assert.equal(ownerCase.status,'REQUIRES_INFO');assert.ok(ownerCase.resultNotes)
  const resubmit=await call(`me/verifications/${detail.id}`,owner.cookie,'PUT',{expectedVersion:ownerCase.version,policyVersion:ownerCase.policy!.version,fields:ownerCase.fields,documents:ownerCase.documents.map(d=>({documentTypeId:d.documentTypeId,fileId:d.fileId})),accepted:true,submit:true});assert.equal(resubmit.status,200)
  current=await read(detail.id);assert.equal(current.status,'PENDING')
  assert.equal((await decide(current,'IN_REVIEW')).status,201);current=await read(detail.id)
  assert.equal((await decide(current,'APPROVED')).status,201);current=await read(detail.id);assert.equal(current.status,'APPROVED');assert.ok(current.revisions.filter(r=>r.operation==='REVIEW').length>=4)
  assert.equal(sql(`SELECT reviewed_by FROM verification WHERE id='${detail.id}'`),reviewer.id)
  assert.equal(sql(`SELECT status FROM app_user WHERE id='${owner.id}'`),'PENDING_VERIFICATION','Revisión no activa cuenta ni acepta legal')
  sql(`INSERT INTO campaign(id,slug,title,campaign_type,creator_user_id,status,published_at,goal_amount,currency_code) VALUES('${campaignId}','kyc-review-${suffix}','DEMO Campaña','DONATION','${owner.id}','PUBLISHED',now(),100,'BOB');`)
  const badges=await(await call(`verification-badges/campaigns/${campaignId}`)).json() as{items:{code:string}[]};assert.deepEqual(badges.items.map(i=>i.code),['KYC_IDENTITY']);assert.equal(JSON.stringify(badges).includes(fileId),false)
  const orgTypes=await(await call('organizations/types',owner.cookie)).json() as{id:string}[]
  const organization=await call('organizations',owner.cookie,'POST',{legalName:`DEMO Organización ${suffix}`,tradeName:'DEMO',organizationTypeId:orgTypes[0]!.id,contactEmail:'demo@example.invalid',contactPhone:''});assert.equal(organization.status,201);const orgId=(await organization.json() as{id:string}).id;organizations.push(orgId)
  const kyb=await capture('KYB_LEGAL',orgId)
  sql(`UPDATE organization_member SET left_at=clock_timestamp()+interval '1 day' WHERE organization_id='${orgId}' AND user_id='${owner.id}';`)
  try{assert.equal((await decide(kyb,'IN_REVIEW',owner.cookie)).status,403,'La baja futura del representante no permite autoaprobar su organización')}finally{sql(`UPDATE organization_member SET left_at=NULL WHERE organization_id='${orgId}' AND user_id='${owner.id}';`)}
  const orgQueue=await(await call('admin/verifications?kind=ORGANIZATION&status=PENDING',reviewer.cookie)).json() as{items:{id:string}[]};assert.ok(orgQueue.items.some(i=>i.id===kyb.id))
  assert.equal((await decide(kyb,'IN_REVIEW')).status,201);const kybReview=await read(kyb.id);assert.equal((await decide(kybReview,'APPROVED')).status,201)
  assert.equal((await call(`me/verifications/${kyb.id}`,other.cookie)).status,404)
  const rep=await capture('KYB_REPRESENTATIVE',orgId)
  const source=app.get(DatabaseService).connection(),lock=source.createQueryRunner();await lock.connect();await lock.startTransaction();await lock.query('SELECT id FROM verification WHERE id=$1 FOR UPDATE',[rep.id])
  sql(`UPDATE user_role SET expires_at=clock_timestamp()+interval '400 milliseconds' WHERE user_id='${reviewer.id}' AND role_id=(SELECT id FROM role WHERE code='COMPLIANCE') AND revoked_at IS NULL;`)
  const waiting=decide(rep,'IN_REVIEW');await new Promise(r=>setTimeout(r,650));await lock.commitTransaction();await lock.release();assert.equal((await waiting).status,403,'Revalida caducidad después de esperar')
  sql(`UPDATE user_role SET expires_at=NULL WHERE user_id='${reviewer.id}' AND role_id=(SELECT id FROM role WHERE code='COMPLIANCE') AND revoked_at IS NULL;`)
  assert.equal((await decide(rep,'IN_REVIEW')).status,201)
  sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${reviewer.id}' AND role_id=(SELECT id FROM role WHERE code='COMPLIANCE');`)
  assert.equal((await call(`admin/verifications/${detail.id}/documents/${fileId}`,reviewer.cookie)).status,403)
  await assert.rejects(()=>app.get(TypeormVerificationRepository).decide(reviewer.id,rep.id,rep.version,{decision:'APPROVED',reason:'Revisión sin permiso que debe rechazarse.',documents:[]}),/responsabilidad|permiso/)
  budget();let limited:Response|undefined
  for(let i=0;i<21;i++)limited=await decide(rep,'IN_REVIEW',owner.cookie)
  assert.equal(limited!.status,429,'El límite de revisión se aplica aun a intentos de autoaprobación');assert.equal(limited!.headers.get('retry-after'),'60')
 }finally{
  await app.close()
  sql(`DELETE FROM campaign WHERE id='${campaignId}';`)
  for(const id of cases)sql(`DELETE FROM brotar_extension.verification_revision WHERE verification_id='${id}';DELETE FROM verification_document WHERE verification_id='${id}';DELETE FROM status_history WHERE entity_type='VERIFICATION' AND entity_id='${id}';DELETE FROM verification WHERE id='${id}';`)
  for(const id of organizations)sql(`DELETE FROM organization WHERE id='${id}';`)
  for(const id of files)sql(`UPDATE file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE id='${id}';`)
  for(const id of users)sql(`DELETE FROM audit_log WHERE actor_user_id='${id}';DELETE FROM app_user WHERE id='${id}';`)
 }
})
