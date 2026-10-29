import 'reflect-metadata'
import {strict as assert} from 'node:assert'
import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {test} from 'node:test'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {readTestDatabaseTarget} from './database-target'
import {approveRepresentation,removeRepresentationFixtures} from './representation-fixture'
import {approveDemoIdentity,removeDemoIdentityFixtures} from './demo-identity-fixture'
import type {VerificationType,VerificationDetail} from '../src/verifications/application/verifications'
interface MemberView {version:string;members:{id:string;userId:string;role:string;current:boolean;leftAt:string|null}[];history:{action:string}[]}
interface UserView {id:string;version:string;status:string;canManage:boolean;canRestore:boolean;firstName:string;history:{action:string}[]}

test('S3-14 PostgreSQL/HTTP: membresías históricas, transferencia, renovación KYB, restricciones y sesiones',{timeout:120000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container,project}=readTestDatabaseTarget(config)
 assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',container],{encoding:'utf8'}).trim(),project)
 const sql=(input:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));const ip=`parties-${randomUUID()}`;app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:ip});next()});await app.listen(0,'127.0.0.1');const base=await app.getUrl(),suffix=randomUUID(),password=randomBytes(24).toString('hex'),reason='Cambio explícito de prueba de administración DEMO.'
 const users:string[]=[],organizations:string[]=[],cases:string[]=[],files:string[]=[]
 // Do not reuse a socket that can expire during synchronous Docker/psql fixture setup.
 const call=(path:string,cookie='',method='GET',body?:unknown)=>{if(method==='PUT')sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash=ANY(ARRAY[${[...users.map(u=>'account:'+u),'ip:'+ip].map(k=>"'"+createHash('sha256').update('mvp-case-write:'+k).digest('hex')+"'").join(',')}]);`);return fetch(`${base}/api/${path}`,{method,headers:{Connection:'close','Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})}
 const account=async(role='REGISTERED_USER')=>{const email=`parties-${users.length}-${suffix}@example.invalid`;const registered=await call('auth/register','','POST',{ legalVersion:'mvp-demo-legal-1.0-20261028',email,password,firstName:'DEMO',lastName:'Miembro',demoConsent:true});assert.equal(registered.status,201);const{id}=await registered.json() as{id:string};users.push(id);if(role!=='REGISTERED_USER')sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`);const login=await call('auth/login','','POST',{email,password});assert.equal(login.status,200);return{id,email,cookie:login.headers.get('set-cookie')!.split(';')[0]!}}
 try{
  const owner=await account(),member=await account(),other=await account(),admin=await account('ADMIN'),auditor=await account('ADMIN')
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='AUDITOR';`)
  const orgTypes=await(await call('organizations/types',owner.cookie)).json() as{id:string}[]
  const created=await call('organizations',owner.cookie,'POST',{legalName:`DEMO Membresías ${suffix}`,tradeName:'DEMO',organizationTypeId:orgTypes[0]!.id,contactEmail:'demo@example.invalid',contactPhone:''});assert.equal(created.status,201)
  const org=(await created.json() as{id:string}).id;organizations.push(org)
  const view=async(cookie=owner.cookie)=>{const response=await call(`me/organizations/${org}/members`,cookie);assert.equal(response.status,200);return response.json() as Promise<MemberView>}
  const change=(action:string,userId:string,role='MEMBER',cookie=owner.cookie,expectedVersion?:string)=>view(cookie).then(async detail=>{const response=await call(`me/organizations/${org}/members`,cookie,'PUT',{action,userId,role,expectedVersion:expectedVersion??detail.version,reason,confirmed:true});if(response.status===200){const ack=await response.clone().json() as{invitationId?:string};if(ack.invitationId){const target=[owner,member,other].find(u=>u.id===userId)!;const accepted=await call(`me/organization-invitations/${ack.invitationId}`,target.cookie,'PUT',{action:'ACCEPT',expectedVersion:'1',reason,confirmed:true});assert.equal(accepted.status,200,await accepted.text())}}return response})
  assert.equal((await call(`me/organizations/${org}/members`)).status,401)
  assert.equal((await call(`me/organizations/${org}/members`,other.cookie)).status,404)
  assert.equal((await call(`administration/parties/users/${owner.id}`,member.cookie)).status,403)
  assert.equal((await change('REMOVE',owner.id)).status,409,'Conserva último propietario')
  assert.equal((await change('ADD',member.id)).status,200)
  const first=(await view()).members.find(row=>row.userId===member.id&&row.current)!.id
  assert.equal((await change('ADD',member.id)).status,409)
  assert.equal((await change('CHANGE',member.id,'ADMIN',owner.cookie,'0')).status,409)
  assert.equal((await change('CHANGE',member.id,'ADMIN')).status,200)
  assert.equal((await change('CHANGE',member.id,'OWNER',member.cookie)).status,403,'No autoescalación de administrador')
  assert.equal((await change('REMOVE',owner.id,'MEMBER',member.cookie)).status,403,'No retira propietario ajeno')
  assert.equal((await change('ADD',other.id,'ADMIN',member.cookie)).status,403)
  assert.equal((await change('ADD',other.id,'MEMBER',member.cookie)).status,200)
  assert.equal((await change('REMOVE',other.id,'MEMBER',member.cookie)).status,200)
  assert.equal((await change('CHANGE',other.id,'MEMBER')).status,409,'No resucita historia')
  const stale=(await view()).version
  const race=await Promise.all([call(`me/organizations/${org}/members`,owner.cookie,'PUT',{action:'ADD',userId:other.id,role:'MEMBER',expectedVersion:stale,reason,confirmed:true}),call(`me/organizations/${org}/members`,owner.cookie,'PUT',{action:'ADD',userId:other.id,role:'MEMBER',expectedVersion:stale,reason,confirmed:true})])
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409])
  const winning=await race.find(r=>r.status===200)!.json() as{invitationId:string};assert.equal((await call(`me/organization-invitations/${winning.invitationId}`,other.cookie,'PUT',{action:'ACCEPT',expectedVersion:'1',reason,confirmed:true})).status,200)
  const historical=(await view()).members.find(row=>row.id===first)!;assert.equal(historical.current,false);assert.ok(historical.leftAt)
  const types=await(await call('me/verifications/types',owner.cookie)).json() as VerificationType[],type=types.find(t=>t.code==='KYB_REPRESENTATIVE')!;assert.ok(type.policy)
  const started=await call('me/verifications',owner.cookie,'POST',{verificationTypeId:type.id,organizationId:org});assert.equal(started.status,201);const kyb=await started.json() as VerificationDetail;cases.push(kyb.id)
  const uploaded=await call('files',owner.cookie,'POST',{purpose:'VERIFICATION_DOCUMENT',visibility:'PRIVATE',originalName:'DEMO.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nDEMO').toString('base64')});assert.equal(uploaded.status,201);const file=(await uploaded.json() as{id:string}).id;files.push(file)
  // Synthetic approved fixture isolates representation invalidation; it does not approve real identity.
  sql(`INSERT INTO verification_document(verification_id,document_type_id,file_id) VALUES('${kyb.id}','${type.policy!.documents[0]!.documentTypeId}','${file}');UPDATE verification SET status='APPROVED',submitted_data=jsonb_build_object('accepted',true,'acceptedBy','${owner.id}','documents',jsonb_build_array(jsonb_build_object('fileId','${file}','documentTypeId','${type.policy!.documents[0]!.documentTypeId}'))) WHERE id='${kyb.id}';`)
  assert.equal((await call(`me/verifications/${kyb.id}/documents/${file}`,owner.cookie)).status,200)
  await approveDemoIdentity((path,cookie,body,method)=>call(path,cookie,method??(body===undefined?'GET':'POST'),body),member.cookie,admin.cookie)
  await approveRepresentation((path,cookie,body,method)=>call(path,cookie,method??(body===undefined?'GET':'POST'),body),org,owner.cookie,member,admin.cookie)
  assert.equal(sql(`SELECT status FROM verification WHERE id='${kyb.id}'`),'EXPIRED')
  assert.equal(sql(`SELECT count(*) FROM brotar_extension.verification_revision WHERE verification_id='${kyb.id}' AND operation='REPRESENTATION_CHANGE'`),'1')
  assert.equal((await call(`me/organizations/${org}/members`,owner.cookie)).status,404)
  assert.equal((await call(`me/verifications/${kyb.id}`,owner.cookie)).status,404)
  assert.equal((await call(`me/verifications/${kyb.id}/documents/${file}`,owner.cookie)).status,404,'El autor anterior pierde acceso a documentos')
  assert.equal((await call(`files/${file}`,owner.cookie)).status,403)
  const renewed=await call('me/verifications',member.cookie,'POST',{verificationTypeId:type.id,organizationId:org});assert.equal(renewed.status,201);const fresh=await renewed.json() as VerificationDetail;cases.push(fresh.id);assert.notEqual(fresh.id,kyb.id);assert.equal(fresh.status,'NOT_STARTED');assert.deepEqual(fresh.documents,[])
  assert.equal(sql(`SELECT count(*) FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id='${member.id}' AND r.code<>'REGISTERED_USER'`),'0','Representación no concede roles globales')
  const source=app.get(DatabaseService).connection(),lock=source.createQueryRunner();await lock.connect();await lock.startTransaction();await lock.query('SELECT id FROM organization WHERE id=$1 FOR UPDATE',[org])
  const current=await view(member.cookie)
  const waiting=call(`me/organizations/${org}/members`,member.cookie,'PUT',{action:'CHANGE',userId:other.id,role:'ADMIN',expectedVersion:current.version,reason,confirmed:true})
  await new Promise(resolve=>setTimeout(resolve,100));sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${member.id}' AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER');`);await lock.commitTransaction();await lock.release();assert.equal((await waiting).status,403,'Revalida rol tras esperar bloqueo de organización')
  sql(`UPDATE user_role SET revoked_at=NULL WHERE user_id='${member.id}' AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER');`)
  const user=async(id=other.id,cookie=admin.cookie)=>{const response=await call(`administration/parties/users/${id}`,cookie);assert.equal(response.status,200);return response.json() as Promise<UserView>}
  const modify=async(action:string,id=other.id,cookie=admin.cookie,patch:Record<string,unknown>={})=>{const value=await user(id,cookie);return call(`administration/parties/users/${id}`,cookie,'PUT',{action,expectedVersion:value.version,reason,confirmed:true,...patch})}
  assert.equal((await user(other.id,auditor.cookie)).canManage,false)
  assert.equal((await modify('RESTRICT',other.id,auditor.cookie)).status,403)
  assert.equal((await modify('RESTRICT',admin.id)).status,403,'No autorrestricción')
  assert.equal((await modify('RESTRICT',auditor.id)).status,403,'No toma control de cuentas privilegiadas')
  for(const patch of [{city:'La Paz\u0000oculta'},{displayName:'<b>Alias</b>'},{city:'!!!!'},{firstName:'12345'},{lastName:'<b>Apellido</b>'},{reason:'!!!!!!!!!!!!'},{reason:'Motivo\u0001con control'},{confirmed:false},{password:'unsafe'},{email_verified_at:'2026-01-01'},{roles:['ADMIN']}])assert.equal((await modify('UPDATE',other.id,admin.cookie,{firstName:'DEMO',lastName:'Actualizado',...patch})).status,400)
  assert.equal((await modify('UPDATE',other.id,admin.cookie,{firstName:'DEMO Actualizado',lastName:'Miembro',displayName:'Alias',city:'La Paz',websiteUrl:'https://example.invalid'})).status,200)
  assert.equal((await user()).firstName,'DEMO Actualizado')
  assert.equal((await call(`administration/parties/users/${other.id}`,admin.cookie,'PUT',{action:'RESTRICT',expectedVersion:'0',reason,confirmed:true})).status,409)
  assert.equal((await modify('RESTRICT')).status,200)
  assert.equal((await call('auth/me',other.cookie)).status,401)
  assert.equal((await call('organizations',other.cookie)).status,401)
  assert.equal(sql(`SELECT count(*) FROM user_token WHERE user_id='${other.id}' AND token_type='SESSION' AND revoked_at IS NULL`),'0')
  assert.equal((await call('auth/login','','POST',{email:other.email,password})).status,403)
  assert.equal((await modify('RESTORE')).status,200)
  assert.equal((await user()).status,'PENDING_VERIFICATION','No activa identidad al restaurar')
  assert.equal((await call('auth/me',other.cookie)).status,401,'La sesión revocada no revive')
  assert.equal((await call('auth/login','','POST',{email:other.email,password})).status,200)
  assert.deepEqual((await user()).history.map(row=>row.action),['RESTORE','RESTRICT','UPDATE'])
  assert.equal(sql(`SELECT email_verified_at IS NULL AND phone_verified_at IS NULL FROM app_user WHERE id='${other.id}'`),'t')
  assert.equal(sql(`SELECT count(*) FROM organization_member WHERE organization_id='${org}' AND user_id='${other.id}'`),'2','Restricción no borra vínculos')
  const rights=await source.query(`SELECT has_table_privilege(current_user,'brotar_extension.party_history','UPDATE') AS update_history,has_table_privilege(current_user,'brotar_extension.party_history','DELETE') AS delete_history,has_table_privilege(current_user,'public.organization_member','DELETE') AS delete_member`)
  assert.deepEqual(rights[0],{update_history:false,delete_history:false,delete_member:false})
 }finally{
  await app.close()
  // Only UUID fixtures in this test, in the isolated Compose selected above.
  for(const id of cases)sql(`DELETE FROM brotar_extension.verification_revision WHERE verification_id='${id}';DELETE FROM status_history WHERE entity_type='VERIFICATION' AND entity_id='${id}';DELETE FROM verification WHERE id='${id}';`)
  for(const id of organizations)removeRepresentationFixtures(sql,id)
  removeDemoIdentityFixtures(sql,users)
  for(const id of organizations)sql(`DELETE FROM brotar_extension.party_history WHERE kind='ORGANIZATION' AND subject_id='${id}';DELETE FROM brotar_extension.party_state WHERE kind='ORGANIZATION' AND subject_id='${id}';DELETE FROM organization WHERE id='${id}';`)
  for(const id of files)sql(`UPDATE file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE id='${id}';`)
  for(const id of users)sql(`DELETE FROM brotar_extension.party_history WHERE subject_id='${id}' OR actor_id='${id}';DELETE FROM brotar_extension.party_state WHERE kind='USER' AND subject_id='${id}';DELETE FROM audit_log WHERE actor_user_id='${id}';DELETE FROM app_user WHERE id='${id}';`)
 }
})
