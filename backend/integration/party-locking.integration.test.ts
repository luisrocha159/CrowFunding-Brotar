import 'reflect-metadata'
import {strict as assert} from 'node:assert'
import {randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {test} from 'node:test'
import {HttpException} from '@nestjs/common'
import {NestFactory} from '@nestjs/core'
import type {EntityManager} from 'typeorm'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {readTestDatabaseTarget} from './database-target'
import {OrganizationManagement} from '../src/verifications/infrastructure/organization-management.controller'
import {PartyAdministration} from '../src/verifications/infrastructure/party-administration.controller'
import {TypeormVerificationRepository} from '../src/verifications/infrastructure/typeorm-verification.repository'
import {VerificationForbidden} from '../src/verifications/domain/verification'
import type {VerificationType,VerificationDetail} from '../src/verifications/application/verifications'
const gate=()=>{let release!:()=>void;return{promise:new Promise<void>(resolve=>{release=resolve}),open:()=>release()}}
const status=async(work:Promise<unknown>)=>{try{await work;return 200}catch(error){if(error instanceof HttpException)return error.getStatus();if(error instanceof VerificationForbidden)return 403;return 500}}

test('S3-14 bloqueos reales: verificación B, restricción A→B y membresía A no forman ciclo; conflictos se recuperan sin revivir acceso',{timeout:45000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container,project}=readTestDatabaseTarget(config);assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',container],{encoding:'utf8'}).trim(),project)
 const sql=(input:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl(),suffix=randomUUID(),password=randomBytes(24).toString('hex'),reason='Ensayo determinista de concurrencia de administración DEMO.'
 // Do not reuse a socket that can expire during synchronous Docker/psql fixture setup.
 const call=(path:string,cookie='',method='GET',body?:unknown)=>fetch(`${base}/api/${path}`,{method,headers:{Connection:'close','Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const users:{id:string;cookie:string}[]=[],cases:string[]=[];let organizationId=''
 const bAccountHeld=gate(),resumeVerification=gate(),aAccountHeld=gate(),restrictionRequestedB=gate(),membershipHasOrganization=gate(),membershipRequestedAccounts=gate()
 try{
  for(let i=0;i<3;i++){const email=`parties-lock-${i}-${suffix}@example.invalid`,registered=await call('auth/register','','POST',{email,password,firstName:'DEMO',lastName:'Concurrencia',demoConsent:true});assert.equal(registered.status,201);const{id}=await registered.json() as{id:string};const login=await call('auth/login','','POST',{email,password});assert.equal(login.status,200);users.push({id,cookie:login.headers.get('set-cookie')!.split(';')[0]!})}
  users.sort((a,b)=>a.id.localeCompare(b.id));const [a,b,c]=users as [typeof users[number],typeof users[number],typeof users[number]]
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${a.id}',id FROM role WHERE code='ADMIN';`)
  const types=await(await call('organizations/types',a.cookie)).json() as{id:string}[]
  const created=await call('organizations',a.cookie,'POST',{legalName:`DEMO Locks ${suffix}`,tradeName:'DEMO',organizationTypeId:types[0]!.id,contactEmail:'demo@example.invalid',contactPhone:''});assert.equal(created.status,201);organizationId=(await created.json() as{id:string}).id
  const database=app.get(DatabaseService),source=database.connection(),organizations=app.get(OrganizationManagement),parties=app.get(PartyAdministration)
  await organizations.changeMember(a.id,organizationId,{action:'ADD',userId:b.id,role:'ADMIN',expectedVersion:'0',reason,confirmed:true})
  await organizations.changeMember(a.id,organizationId,{action:'ADD',userId:c.id,role:'MEMBER',expectedVersion:'1',reason,confirmed:true})
  const verificationTypes=await(await call('me/verifications/types',b.cookie)).json() as VerificationType[],type=verificationTypes.find(row=>row.code==='KYB_REPRESENTATIVE')!;assert.ok(type.policy)
  const started=await call('me/verifications',b.cookie,'POST',{verificationTypeId:type.id,organizationId});assert.equal(started.status,201);const verification=await started.json() as VerificationDetail;cases.push(verification.id)
  const submission={policyVersion:type.policy!.version,fields:{},documents:[],accepted:false}
  type Hook=(manager:EntityManager,text:string,parameters:unknown[]|undefined,execute:()=>Promise<unknown>)=>Promise<unknown>
  const instrument=(hook:Hook)=>({connection:()=>({transaction:<T>(work:(m:EntityManager)=>Promise<T>)=>source.transaction(async m=>{
   await m.query("SET LOCAL statement_timeout='8s'")
   return work(new Proxy(m,{get(target,key,receiver){if(key==='query')return(text:string,parameters?:unknown[])=>hook(m,text,parameters,()=>m.query(text,parameters));return Reflect.get(target,key,receiver) as unknown}}))
  })})}) as unknown as DatabaseService
  let paused=false,restrictionPid=0
  const saving=new TypeormVerificationRepository(instrument(async(_m,text,_parameters,execute)=>{const result=await execute();if(!paused&&text.includes('FOR SHARE OF u')){paused=true;bAccountHeld.open();await resumeVerification.promise}return result}))
  // Pauses only expose real lock acquisition; all writes, role/version checks and PG waits run in the production methods.
  const restricting=new PartyAdministration(instrument(async(m,text,parameters,execute)=>{
   if(text.includes('FROM public.app_user')&&text.includes('FOR UPDATE')&&text.includes('ANY')){
    // The former single sorted FOR UPDATE query is split only in this harness so its A-then-B lock acquisition can be observed deterministically.
    const first=await m.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE',[a.id]);aAccountHeld.open();restrictionPid=(await m.query('SELECT pg_backend_pid() AS pid'))[0].pid;restrictionRequestedB.open();return [...first,...await m.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE',[b.id])]
   }
   if(text.includes('FROM public.app_user')&&text.includes('FOR SHARE')&&parameters?.[0]===a.id){const result=await execute();aAccountHeld.open();return result}
   if(text.includes('FROM public.app_user')&&text.includes('FOR UPDATE')&&parameters?.[0]===b.id){restrictionPid=(await m.query('SELECT pg_backend_pid() AS pid'))[0].pid;restrictionRequestedB.open()}
   return execute()
  }))
  const managing=new OrganizationManagement(instrument(async(_m,text,_parameters,execute)=>{if(text.includes('FROM public.app_user')&&text.includes('FOR SHARE'))membershipRequestedAccounts.open();const result=await execute();if(text.includes('FROM public.organization WHERE')&&text.includes('FOR UPDATE'))membershipHasOrganization.open();return result}))
  const saveResult=status(saving.save(b.id,verification.id,verification.version,submission,false));await bAccountHeld.promise
  const target=await parties.user(a.id,b.id),restrictionResult=status(restricting.updateUser(a.id,b.id,{action:'RESTRICT',expectedVersion:target.version,reason,confirmed:true}))
  await aAccountHeld.promise;await restrictionRequestedB.promise
  // Verify PG actually queued the restriction behind B's shared account lock before starting the third request.
  const deadline=Date.now()+3000;let blocked=false
  while(Date.now()<deadline){const [row]=await source.query('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[restrictionPid]);if(row.blocked){blocked=true;break}await new Promise(resolve=>setTimeout(resolve,10))}
  assert.ok(blocked,'La restricción está esperando el bloqueo compartido de B')
  const membershipResult=status(managing.changeMember(a.id,organizationId,{action:'CHANGE',userId:c.id,role:'ADMIN',expectedVersion:'2',reason,confirmed:true}))
  await membershipHasOrganization.promise;await membershipRequestedAccounts.promise;resumeVerification.open()
  const outcomes=await Promise.all([saveResult,restrictionResult,membershipResult]);assert.equal(outcomes.includes(500),false,`Sin deadlock/500 en tres solicitudes: ${outcomes.join(',')}`);assert.deepEqual(outcomes,[200,200,200])
  assert.equal((await call('auth/me',b.cookie)).status,401)
  assert.equal(await status(app.get(TypeormVerificationRepository).save(b.id,verification.id,verification.version,submission,false)),403,'Una restricción confirmada impide escrituras posteriores')
  // Restore only to test the reverse lock edge with the target busy; a membership conflict must release its parent immediately.
  const restricted=await parties.user(a.id,b.id);await parties.updateUser(a.id,b.id,{action:'RESTORE',expectedVersion:restricted.version,reason,confirmed:true})
  const lock=source.createQueryRunner();await lock.connect();await lock.startTransaction();await lock.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE',[b.id])
  try{
   const before=await organizations.members(a.id,organizationId)
   assert.equal(await status(organizations.changeMember(a.id,organizationId,{action:'CHANGE',userId:b.id,role:'MEMBER',expectedVersion:before.version,reason,confirmed:true})),409,'Cuenta ocupada devuelve conflicto recuperable, sin esperar mientras retiene organización')
   assert.equal((await organizations.members(a.id,organizationId)).version,before.version)
  }finally{await lock.rollbackTransaction();await lock.release()}
  const restored=await parties.user(a.id,b.id);await parties.updateUser(a.id,b.id,{action:'RESTRICT',expectedVersion:restored.version,reason,confirmed:true})
  const latest=await organizations.members(a.id,organizationId)
  assert.equal(await status(organizations.changeMember(a.id,organizationId,{action:'CHANGE',userId:b.id,role:'MEMBER',expectedVersion:latest.version,reason,confirmed:true})),403,'Un reintento vuelve a comprobar cuenta y permisos vigentes')
 }finally{
  resumeVerification.open();await app.close()
  for(const id of cases)sql(`DELETE FROM brotar_extension.verification_revision WHERE verification_id='${id}';DELETE FROM status_history WHERE entity_type='VERIFICATION' AND entity_id='${id}';DELETE FROM verification WHERE id='${id}';`)
  if(organizationId)sql(`DELETE FROM brotar_extension.party_history WHERE kind='ORGANIZATION' AND subject_id='${organizationId}';DELETE FROM brotar_extension.party_state WHERE kind='ORGANIZATION' AND subject_id='${organizationId}';DELETE FROM organization WHERE id='${organizationId}';`)
  for(const user of users)sql(`DELETE FROM brotar_extension.party_history WHERE subject_id='${user.id}' OR actor_id='${user.id}';DELETE FROM brotar_extension.party_state WHERE kind='USER' AND subject_id='${user.id}';DELETE FROM audit_log WHERE actor_user_id='${user.id}';DELETE FROM app_user WHERE id='${user.id}';`)
 }
})
