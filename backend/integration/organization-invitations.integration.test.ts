import 'reflect-metadata'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHash,randomUUID,randomBytes} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
interface Invitation {id:string;role:string;status:string;version:number;allowedActions:string[];events:{action:string}[]}
test('S3-14 cierre: invitación sin acceso, aceptación propia, carreras, vencimiento, revocación y paginación',{timeout:120000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container,project}=readTestDatabaseTarget(config);assert.match(project,/qa/)
 const sql=(input:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));const ip=`invitations-${randomUUID()}`;app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:ip});next()});await app.listen(0,'127.0.0.1');const base=await app.getUrl(),users:{id:string;cookie:string}[]=[],orgs:string[]=[],password=randomBytes(24).toString('hex'),reason='Decisión explícita de colaboración institucional DEMO.'
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'PUT',origin:string|null='http://127.0.0.1:5173')=>fetch(`${base}/api/${path}`,{signal:AbortSignal.timeout(15000),method,headers:{Connection:'close',Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1',...(origin?{Origin:origin}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}).then(async response=>new Response([204,205,304].includes(response.status)?null:await response.arrayBuffer(),{status:response.status,statusText:response.statusText,headers:response.headers}))
 const json=async<T>(r:Response,status=200):Promise<T>=>{const body:unknown=await r.json();assert.equal(r.status,status,JSON.stringify(body));return body as T}
 const budget=()=>{sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash='${createHash('sha256').update('mvp-case-write:ip:'+ip).digest('hex')}';`);for(const u of users)sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash='${createHash('sha256').update('mvp-case-write:account:'+u.id).digest('hex')}';`)}
 const account=async()=>{const email=`invitations-${randomUUID()}@example.invalid`,u=await json<{id:string}>(await call('auth/register','',{firstName:'DEMO',lastName:'Invitado',email,password,demoConsent:true},'POST'),201),login=await call('auth/login','',{email,password},'POST');assert.equal(login.status,200);const user={id:u.id,cookie:login.headers.get('set-cookie')!.split(';')[0]!};users.push(user);return user}
 try{
  const owner=await account(),target=await account(),other=await account(),auditor=await account()
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='AUDITOR';`)
  const types=await json<{id:string}[]>(await call('organizations/types',owner.cookie)),org=await json<{id:string}>(await call('organizations',owner.cookie,{legalName:`DEMO Invitaciones ${randomUUID()}`,tradeName:'DEMO',organizationTypeId:types[0]!.id,contactEmail:'demo@example.invalid',contactPhone:''},'POST'),201);orgs.push(org.id)
  const members=`me/organizations/${org.id}/members`,list='me/organization-invitations'
  const version=async()=> (await json<{version:string}>(await call(members,owner.cookie))).version
  const invite=async(userId:string,role='MEMBER',action='ADD',cookie=owner.cookie)=>{budget();const v=await version();return call(members,cookie,{action,userId,role,expectedVersion:v,reason,confirmed:true})}
  const resolve=(i:string,cookie:string,action='ACCEPT',v='1',patch:object={},origin:string|null='http://127.0.0.1:5173')=>{budget();return call(`${list}/${i}`,cookie,{action,reason,confirmed:true,expectedVersion:v,...patch},'PUT',origin)}
  assert.equal((await call(list)).status,401)
  const first=await json<{invitationId:string;status:string}>(await invite(target.id));assert.equal(first.status,'INVITED')
  assert.equal(sql(`SELECT count(*) FROM organization_member WHERE organization_id='${org.id}' AND user_id='${target.id}'`),'0','Invitar no crea membresía')
  assert.equal((await call(members,target.cookie)).status,404)
  assert.equal((await invite(target.id)).status,409)
  assert.equal((await resolve(first.invitationId,owner.cookie)).status,403,'Remitente no acepta por el destinatario')
  assert.equal((await resolve(first.invitationId,other.cookie)).status,404)
  for(const patch of [{confirmed:false},{reason:'  '},{reason:'<script>motivo inválido</script>'},{action:'APPROVE'},{role:'ADMIN'}])assert.equal((await resolve(first.invitationId,target.cookie,'ACCEPT','1',patch)).status,400)
  for(const origin of [null,'https://foreign.invalid'])assert.equal((await resolve(first.invitationId,target.cookie,'ACCEPT','1',{},origin)).status,403)
  const inbox=await json<{items:Invitation[];total:number}>(await call(list,target.cookie));assert.equal(inbox.total,1);assert.deepEqual(inbox.items[0]!.allowedActions,['ACCEPT','DECLINE'])
  const twins=await Promise.all([resolve(first.invitationId,target.cookie),resolve(first.invitationId,target.cookie)]);assert.deepEqual(twins.map(r=>r.status).sort(),[200,409]);assert.equal(sql(`SELECT count(*) FROM organization_member WHERE organization_id='${org.id}' AND user_id='${target.id}' AND left_at IS NULL`),'1')
  const promotion=await json<{invitationId:string}>(await invite(target.id,'ADMIN','CHANGE'));assert.equal(sql(`SELECT organization_role FROM organization_member WHERE organization_id='${org.id}' AND user_id='${target.id}' AND left_at IS NULL`),'MEMBER')
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${target.id}',id FROM role WHERE code='AUDITOR';`);assert.equal((await resolve(promotion.invitationId,target.cookie)).status,403);sql(`DELETE FROM user_role WHERE user_id='${target.id}' AND role_id=(SELECT id FROM role WHERE code='AUDITOR');`)
  assert.equal((await resolve(promotion.invitationId,target.cookie)).status,200);assert.equal(sql(`SELECT organization_role FROM organization_member WHERE organization_id='${org.id}' AND user_id='${target.id}' AND left_at IS NULL`),'ADMIN')
  assert.equal((await invite(other.id,'ADMIN','ADD',target.cookie)).status,403)
  const outgoing=await json<{invitationId:string}>(await invite(other.id,'MEMBER','ADD',target.cookie));assert.equal((await invite(target.id,'MEMBER','REMOVE')).status,200)
  assert.equal((await resolve(outgoing.invitationId,other.cookie)).status,409,'La cuenta del remitente mantiene rol global, pero no membresía: no concede acceso')
  // The account exists but the inviter lost membership: conflict, no role grant.
  assert.equal(sql(`SELECT count(*) FROM organization_member WHERE organization_id='${org.id}' AND user_id='${other.id}' AND left_at IS NULL`),'0')
  assert.equal((await resolve(outgoing.invitationId,owner.cookie,'CANCEL')).status,200)
  const expired=await json<{invitationId:string}>(await invite(other.id));sql(`UPDATE brotar_extension.organization_invitation SET created_at=clock_timestamp()-interval '8 days',expires_at=clock_timestamp()-interval '1 day' WHERE id='${expired.invitationId}';`)
  const expiredView=await json<{items:Invitation[]}>(await call(list,other.cookie));assert.equal(expiredView.items.find(i=>i.id===expired.invitationId)!.status,'EXPIRED')
  assert.equal((await resolve(expired.invitationId,other.cookie)).status,409);assert.equal(sql(`SELECT status FROM brotar_extension.organization_invitation WHERE id='${expired.invitationId}'`),'EXPIRED')
  const declined=await json<{invitationId:string}>(await invite(other.id));assert.equal((await resolve(declined.invitationId,other.cookie,'DECLINE')).status,200)
  const cancelled=await json<{invitationId:string}>(await invite(other.id));assert.equal((await resolve(cancelled.invitationId,owner.cookie,'CANCEL')).status,200)
  const auditInvite=await json<{invitationId:string}>(await invite(auditor.id));assert.equal((await resolve(auditInvite.invitationId,auditor.cookie)).status,403);assert.deepEqual((await json<{items:Invitation[]}>(await call(list,auditor.cookie))).items[0]!.allowedActions,[])
  assert.equal((await call(`${list}?organizationId=${org.id}`,other.cookie)).status,404)
  // Pagination covers an inbox beyond the first twenty; synthetic historical rows never grant access.
  sql(`INSERT INTO brotar_extension.organization_invitation(id,organization_id,target_user_id,invited_by,role,status,resolved_at) SELECT gen_random_uuid(),'${org.id}','${other.id}','${owner.id}','MEMBER','DECLINED',clock_timestamp() FROM generate_series(1,21);`)
  const page=await json<{items:Invitation[];total:number;page:number}>(await call(`${list}?page=2`,other.cookie));assert.ok(page.items.length>0);assert.ok(page.total>20);assert.equal(page.page,2)
  assert.equal((await call(`${list}?page=0`,other.cookie)).status,400)
  assert.equal(sql(`SELECT count(*) FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id='${target.id}' AND r.code<>'REGISTERED_USER'`),'0')
  assert.equal(sql(`SELECT has_column_privilege('brotar_app','brotar_extension.organization_invitation','role','UPDATE') OR has_table_privilege('brotar_app','brotar_extension.organization_invitation_event','DELETE')`),'f')
 }finally{app.getHttpServer().closeAllConnections();await app.close();for(const id of orgs)sql(`DELETE FROM brotar_extension.party_history WHERE kind='ORGANIZATION' AND subject_id='${id}';DELETE FROM brotar_extension.party_state WHERE kind='ORGANIZATION' AND subject_id='${id}';DELETE FROM organization WHERE id='${id}';`);for(const u of users)sql(`DELETE FROM audit_log WHERE actor_user_id='${u.id}';DELETE FROM app_user WHERE id='${u.id}';`)}
})
