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
import {identityReady} from '../src/campaign-lifecycle/infrastructure/eligibility'
import {readTestDatabaseTarget} from './database-target'
import {approveDemoIdentity,removeDemoIdentityFixtures} from './demo-identity-fixture'
interface Detail {id:string;status:string;version:number;allowedActions:string[];events:{action:string;version:number}[]}
test('S2-07 formal representation: no early access, target consent and independent administrative approval',{timeout:120000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container,project}=readTestDatabaseTarget(config)
 assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',container],{encoding:'utf8'}).trim(),project)
 const sql=(input:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const previousDemo=process.env.DEMO_PAYMENTS_ENABLED;process.env.DEMO_PAYMENTS_ENABLED='true'
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));const ip=`representation-fixture-${randomUUID()}`;app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:ip});next()});await app.listen(0,'127.0.0.1')
 const base=await app.getUrl(),suffix=randomUUID(),password=randomBytes(24).toString('hex'),reason='Consentimiento explícito de representación DEMO.',users:string[]=[],organizations:string[]=[],campaigns:string[]=[],payouts:string[]=[]
 // Do not reuse a socket that can expire during synchronous Docker/psql fixture setup.
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'POST')=>fetch(`${base}/api/${path}`,{method,headers:{Connection:'close','Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const budget=()=>sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN(${[...users.map(id=>`account:${id}`),`ip:${ip}`].map(v=>`'${createHash('sha256').update('mvp-case-write:'+v).digest('hex')}'`).join(',')});`)
 const account=async(role='REGISTERED_USER')=>{const email=`representation-${users.length}-${suffix}@example.invalid`;const r=await call('auth/register','',{email,password,firstName:'DEMO',lastName:'Representación',demoConsent:true});assert.equal(r.status,201);const{id}=await r.json() as{id:string};users.push(id);if(role!=='REGISTERED_USER')sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}';`);const login=await call('auth/login','',{email,password});assert.equal(login.status,200);return{id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}}
 try{
  const owner=await account(),target=await account(),stranger=await account(),admin=await account('ADMIN'),auditor=await account('ADMIN'),interested=await account('ADMIN')
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='AUDITOR';`)
  const types=await(await call('organizations/types',owner.cookie)).json() as{id:string}[]
  const created=await call('organizations',owner.cookie,{legalName:`DEMO Representation ${suffix}`,tradeName:'DEMO',organizationTypeId:types[0]!.id,contactEmail:'demo@example.invalid',contactPhone:''});assert.equal(created.status,201)
  const org=(await created.json() as{id:string}).id;organizations.push(org)
  const version=async()=>{const r=await call(`me/organizations/${org}/members`,owner.cookie);assert.equal(r.status,200);return(await r.json() as{version:string}).version}
  const propose=async(kind='OWNERSHIP',extra:Record<string,unknown>={})=>call(`me/organizations/${org}/representation-requests`,owner.cookie,{kind,targetUserId:target.id,expectedVersion:await version(),reason,confirmed:true,...extra})
  const action=(d:Detail,who:typeof owner,act:string,administration=false,extra:Record<string,unknown>={})=>call(`${administration?'administration':'me'}/representation-requests/${d.id}/actions`,who.cookie,{action:act,expectedVersion:d.version,reason,confirmed:true,...extra})
  assert.equal((await call('me/representation-requests',owner.cookie)).status,200)
  assert.equal((await propose('OWNERSHIP',{confirmed:false})).status,400)
  assert.equal((await propose('OWNERSHIP',{unexpected:'field'})).status,400)
  assert.equal((await propose('OWNERSHIP',{targetUserId:owner.id})).status,400)
  assert.equal((await propose('OWNERSHIP',{targetUserId:auditor.id})).status,403)
  const inviteAndAccept=async(who:typeof owner,expectedVersion=undefined as string|undefined)=>{budget();const response=await call(`me/organizations/${org}/members`,owner.cookie,{action:'ADD',userId:who.id,role:'MEMBER',expectedVersion:expectedVersion??await version(),reason,confirmed:true},'PUT');assert.equal(response.status,200);const {invitationId}=await response.json() as{invitationId:string};budget();const accepted=await call(`me/organization-invitations/${invitationId}`,who.cookie,{action:'ACCEPT',expectedVersion:'1',reason,confirmed:true},'PUT');assert.equal(accepted.status,200,await accepted.text())}
  await inviteAndAccept(interested)
  const stale=await version();await inviteAndAccept(stranger,stale)
  assert.equal((await propose('OWNERSHIP',{expectedVersion:stale})).status,409)
  budget()
  const initial=await propose();assert.equal(initial.status,201);let d=await initial.json() as Detail;assert.equal(d.status,'REQUESTED');assert.equal(d.version,1)
  assert.equal(sql(`SELECT count(*) FROM organization_member WHERE organization_id='${org}' AND user_id='${target.id}'`),'0')
  assert.equal((await call(`me/organizations/${org}/members`,target.cookie)).status,404)
  assert.equal((await call(`me/representation-requests/${d.id}`,stranger.cookie)).status,404)
  assert.equal((await propose()).status,409)
  assert.equal((await call(`me/organizations/${org}/members`,owner.cookie,{action:'ADD',userId:stranger.id,role:'MEMBER',expectedVersion:await version(),reason,confirmed:true},'PUT')).status,409)
  assert.equal((await action(d,admin,'APPROVE',true)).status,409,'Consent is mandatory')
  assert.equal((await action(d,owner,'ACCEPT')).status,403)
  assert.equal((await action(d,auditor,'REJECT',true)).status,403)
  sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER');`)
  assert.equal((await action(d,target,'ACCEPT')).status,403,'Revoked requester cannot continue approval')
  sql(`UPDATE user_role SET revoked_at=NULL WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER');`)
  const accepted=await action(d,target,'ACCEPT');assert.equal(accepted.status,201);d=await accepted.json() as Detail;assert.equal(d.status,'ACCEPTED')
  assert.equal((await action(d,admin,'APPROVE',true)).status,409,'Requires canonical reviewed KYC')
  assert.equal((await action(d,interested,'APPROVE',true)).status,403,'Current organizational members cannot approve')
  for(const user of [owner,target]){sql(`INSERT INTO user_role(user_id,role_id) SELECT '${user.id}',id FROM role WHERE code='ADMIN';`);assert.equal((await action(d,user,'APPROVE',true)).status,403);sql(`DELETE FROM user_role WHERE user_id='${user.id}' AND role_id=(SELECT id FROM role WHERE code='ADMIN');`)}
  sql(`UPDATE app_user SET status='SUSPENDED' WHERE id='${target.id}';`);assert.equal((await action(d,admin,'APPROVE',true)).status,403);sql(`UPDATE app_user SET status='PENDING_VERIFICATION' WHERE id='${target.id}';`)
  budget();await approveDemoIdentity(call,target.cookie,admin.cookie);budget()
  assert.equal((await action(d,admin,'APPROVE',true,{expectedVersion:1})).status,409)
  // A pending representation blocks real identity and money operations before any irreversible decision.
  const source=app.get(DatabaseService).connection()
  await assert.rejects(source.transaction(m=>identityReady(m,{id:org,creator_user_id:owner.id,organization_id:org,currency_code:'BOB',status:'IN_EXECUTION'})),/representación pendiente/)
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='CREATOR';INSERT INTO user_role(user_id,role_id) SELECT '${admin.id}',id FROM role WHERE code='FINANCE';`)
  const campaign=randomUUID(),payout=randomUUID(),disbursement=randomUUID(),funding=randomUUID();campaigns.push(campaign,funding);payouts.push(payout)
  sql(`INSERT INTO campaign(id,slug,title,campaign_type,creator_user_id,organization_id,status,published_at,goal_amount,currency_code,funding_model) VALUES('${campaign}','representation-${campaign}','DEMO Representación y desembolso','DONATION','${owner.id}','${org}','IN_EXECUTION',now(),10,'BOB','ALL_OR_NOTHING'),('${funding}','representation-${funding}','DEMO Representación y ejecución','DONATION','${owner.id}','${org}','FUNDING_ENDED',now(),10,'BOB','ALL_OR_NOTHING');INSERT INTO brotar_extension.campaign_cycle(campaign_id,outcome) VALUES('${campaign}','EXECUTION_ELIGIBLE'),('${funding}','EXECUTION_ELIGIBLE');INSERT INTO payout_account(id,organization_id,account_holder_name,currency_code,status) VALUES('${payout}','${org}','DEMO Organización ficticia','BOB','VERIFIED');INSERT INTO disbursement(id,campaign_id,payout_account_id,beneficiary_org_id,gross_amount,currency_code,status) VALUES('${disbursement}','${campaign}','${payout}','${org}',10,'BOB','PROCESSING');INSERT INTO brotar_extension.demo_disbursement(disbursement_id,requested_by,destination_version,destination_reference,destination_holder,request_key,request_hash) VALUES('${disbursement}','${owner.id}',1,'DEMO-ORGANIZACION','DEMO Organización ficticia','${createHash('sha256').update(disbursement).digest('hex')}','${createHash('sha256').update(campaign).digest('hex')}');`)
  const blocked=async(path:string,cookie:string,body:object)=>{budget();const r=await call(path,cookie,body);assert.equal(r.status,409,JSON.stringify(await r.clone().json()));assert.match(JSON.stringify(await r.json()),/representación pendiente/)}
  await blocked(`admin/campaign-cycle/${funding}/actions`,admin.cookie,{action:'START_EXECUTION',expectedVersion:1,requestKey:randomUUID(),reason,demoConsent:true})
  await blocked(`me/disbursements/campaigns/${campaign}`,owner.cookie,{amount:'1.00',payoutAccountId:payout,destinationVersion:1,scheduledFor:null,requestKey:randomUUID(),reason,demoConsent:true})
  await blocked(`admin/finance/disbursements/${disbursement}/actions`,admin.cookie,{action:'COMPLETE_DEMO',expectedVersion:1,requestKey:randomUUID(),reason,demoConsent:true})
  assert.equal(sql(`SELECT status FROM disbursement WHERE id='${disbursement}'`),'PROCESSING')

  const approved=await action(d,admin,'APPROVE',true);assert.equal(approved.status,201);d=await approved.json() as Detail;assert.equal(d.status,'APPROVED');assert.equal(d.version,3);assert.deepEqual(d.events.map(e=>e.action),['REQUEST','ACCEPT','APPROVE'])
  assert.equal(sql(`SELECT organization_role FROM organization_member WHERE organization_id='${org}' AND user_id='${owner.id}' AND left_at IS NULL`),'MEMBER')
  assert.equal(sql(`SELECT organization_role FROM organization_member WHERE organization_id='${org}' AND user_id='${target.id}' AND left_at IS NULL`),'OWNER')
  assert.equal((await call(`me/organizations/${org}/members`,owner.cookie)).status,404)
  assert.equal((await call(`me/organizations/${org}/members`,target.cookie)).status,200)
  assert.equal(sql(`SELECT count(*) FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id='${target.id}' AND r.code<>'REGISTERED_USER'`),'0')
  for(const input of [{action:'TRANSFER',role:'MEMBER',userId:owner.id},{action:'ADD',role:'LEGAL_REPRESENTATIVE',userId:stranger.id},{action:'CHANGE',role:'MEMBER',userId:target.id}]){
   const v=await(await call(`me/organizations/${org}/members`,target.cookie)).json() as{version:string};assert.equal((await call(`me/organizations/${org}/members`,target.cookie,{...input,expectedVersion:v.version,reason,confirmed:true},'PUT')).status,409)
  }

  const proposeNext=async()=>{budget();const v=await(await call(`me/organizations/${org}/members`,target.cookie)).json() as{version:string};const r=await call(`me/organizations/${org}/representation-requests`,target.cookie,{kind:'REPRESENTATIVE',targetUserId:owner.id,expectedVersion:v.version,reason,confirmed:true});assert.equal(r.status,201);return r.json() as Promise<Detail>}
  let next=await proposeNext();let terminal=await action(next,owner,'DECLINE');assert.equal(terminal.status,201);assert.equal((await terminal.json() as Detail).status,'DECLINED')
  next=await proposeNext();terminal=await action(next,target,'CANCEL');assert.equal(terminal.status,201);assert.equal((await terminal.json() as Detail).status,'CANCELLED')
  next=await proposeNext();terminal=await action(next,admin,'REJECT',true);assert.equal(terminal.status,201);assert.equal((await terminal.json() as Detail).status,'REJECTED')
  next=await proposeNext();terminal=await action(next,owner,'ACCEPT');assert.equal(terminal.status,201);next=await terminal.json() as Detail;terminal=await action(next,admin,'REJECT',true);assert.equal(terminal.status,201)
  // Same expected version cannot create two live requests even with concurrent HTTP transactions.
  budget();const current=await(await call(`me/organizations/${org}/members`,target.cookie)).json() as{version:string}
  const twin=()=>call(`me/organizations/${org}/representation-requests`,target.cookie,{kind:'REPRESENTATIVE',targetUserId:owner.id,expectedVersion:current.version,reason,confirmed:true})
  const race=await Promise.all([twin(),twin()]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);next=await race.find(r=>r.status===201)!.json() as Detail
  const eventBefore=sql(`SELECT count(*) FROM brotar_extension.representation_event WHERE request_id='${next.id}'`)
  await assert.rejects(source.query(`UPDATE brotar_extension.representation_event SET reason='Alteración prohibida del evento' WHERE request_id=$1`,[next.id]),/permission denied/)
  assert.equal(sql(`SELECT count(*) FROM brotar_extension.representation_event WHERE request_id='${next.id}'`),eventBefore)
  assert.equal((await action(next,target,'CANCEL')).status,201)
  // Immutable terminal fixtures make >20 rows reachable without bypassing the production write limiter.
  sql(`INSERT INTO brotar_extension.representation_request(organization_id,kind,target_user_id,requested_by,organization_version,status,version,reason,decided_at,decided_by,decision_reason) SELECT '${org}','REPRESENTATIVE','${owner.id}','${target.id}',${current.version},'CANCELLED',2,'Solicitud histórica sintética para paginación.',clock_timestamp(),'${target.id}','Cancelación histórica sintética para paginación.' FROM generate_series(1,22);`)
  const ownOne=await(await call('me/representation-requests?page=1',target.cookie)).json() as{items:Detail[];total:number;pageSize:number},ownTwo=await(await call('me/representation-requests?page=2',target.cookie)).json() as typeof ownOne
  assert.ok(ownOne.total>20);assert.equal(ownOne.pageSize,20);assert.equal(ownOne.items.length,20);assert.equal(ownTwo.total,ownOne.total);assert.ok(ownTwo.items.length>0);assert.equal(new Set([...ownOne.items,...ownTwo.items].map(x=>x.id)).size,ownOne.total)
  const otherInbox=await(await call('me/representation-requests',stranger.cookie)).json() as{total:number};assert.equal(otherInbox.total,0,'Ordinary organizational member does not see participant inbox')
  assert.equal((await call('me/representation-requests?page=0',target.cookie)).status,400)
  const auditorInbox=await call('administration/representation-requests',auditor.cookie);assert.equal(auditorInbox.status,200);assert.match(auditorInbox.headers.get('cache-control')!,/private.*no-store/);const auditorBody=await auditorInbox.json() as{items:Detail[]};assert.ok(auditorBody.items.every(r=>r.allowedActions.length===0))
  budget();const limits=[];for(let i=0;i<21;i++)limits.push((await action(d,admin,'APPROVE',true)).status);assert.ok(limits.slice(0,20).every(status=>status===409));assert.equal(limits[20],429)
  const rights=await source.query(`SELECT has_table_privilege(current_user,'brotar_extension.representation_event','UPDATE') AS update_event,has_table_privilege(current_user,'brotar_extension.representation_event','DELETE') AS delete_event,has_table_privilege(current_user,'brotar_extension.representation_request','DELETE') AS delete_request`)
  assert.deepEqual(rights[0],{update_event:false,delete_event:false,delete_request:false})
 }finally{
  await app.close();if(previousDemo===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=previousDemo
  for(const id of campaigns)sql(`DELETE FROM brotar_extension.demo_disbursement_event WHERE disbursement_id IN(SELECT id FROM disbursement WHERE campaign_id='${id}');DELETE FROM brotar_extension.demo_disbursement WHERE disbursement_id IN(SELECT id FROM disbursement WHERE campaign_id='${id}');DELETE FROM disbursement WHERE campaign_id='${id}';DELETE FROM brotar_extension.campaign_cycle_event WHERE campaign_id='${id}';DELETE FROM brotar_extension.campaign_cycle WHERE campaign_id='${id}';DELETE FROM campaign WHERE id='${id}';`)
  for(const id of payouts)sql(`DELETE FROM payout_account WHERE id='${id}';`)
  if(sql(`SELECT to_regclass('brotar_extension.representation_request') IS NOT NULL`)==='t')for(const id of organizations)sql(`DELETE FROM brotar_extension.representation_event WHERE request_id IN(SELECT id FROM brotar_extension.representation_request WHERE organization_id='${id}');DELETE FROM brotar_extension.representation_request WHERE organization_id='${id}';`)
  for(const id of organizations)sql(`DELETE FROM brotar_extension.party_history WHERE kind='ORGANIZATION' AND subject_id='${id}';DELETE FROM brotar_extension.party_state WHERE kind='ORGANIZATION' AND subject_id='${id}';DELETE FROM organization WHERE id='${id}';`)
  removeDemoIdentityFixtures(sql,users)
  for(const id of users)sql(`DELETE FROM audit_log WHERE actor_user_id='${id}';DELETE FROM app_user WHERE id='${id}';`)
 }
})
