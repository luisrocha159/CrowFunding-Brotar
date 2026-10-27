import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'
import { DatabaseService } from '../src/shared/infrastructure/database/database.service'
interface Update {id:string;revision:string;version:number;title:string;withdrawnAt:string|null;images:{fileId:string;caption:string}[];progress:unknown}
interface Reward {id:string;revision:string;status:string;fileId:string|null;fulfilledOn:string|null}
interface Tracking {items:Reward[];total:number;fulfilled:number;editable:boolean}
test('S3-12 correcciones, retiro lógico, historial y seguimiento de recompensas compartido con cierre', {timeout:90000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container}=readTestDatabaseTarget(config)
 const sql=(query:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:query,encoding:'utf8',timeout:10000}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl()
 const call=(path:string,cookie='',body?:unknown,method=body===undefined?'GET':'POST',origin='http://127.0.0.1:5173')=>fetch(`${base}/api/${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1',Origin:origin},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const json=async<T>(r:Response,expected=200):Promise<T>=>{const b:unknown=await r.json();assert.equal(r.status,expected,JSON.stringify(b));return b as T}
 const users:{id:string;cookie:string}[]=[],campaigns:string[]=[],files:string[]=[]
 try{
  for(let i=0;i<2;i++){
   const email=`publication-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex')
   const u=await json<{id:string}>(await call('auth/register','',{firstName:'Ensayo',lastName:'Novedades',email,password,demoConsent:true}),201)
   const login=await call('auth/login','',{email,password});assert.equal(login.status,200);users.push({id:u.id,cookie:login.headers.get('set-cookie')!.split(';')[0]!})
   sql(`INSERT INTO user_role(user_id,role_id) SELECT '${u.id}',id FROM role WHERE code='CREATOR' ON CONFLICT DO NOTHING;`)
   const c=await json<{id:string}>(await call('campaigns/drafts',users[i]!.cookie,{title:'Ensayo de seguimiento publicado',summary:'Datos sintéticos para novedades y recompensas',campaignType:'DONATION'}),201);campaigns.push(c.id)
   sql(`UPDATE campaign SET status='PUBLISHED',published_at=clock_timestamp(),goal_amount=1000,currency_code='BOB' WHERE id='${c.id}';`)
  }
  const owner=users[0]!,other=users[1]!,id=campaigns[0]!,updateId=randomUUID(),path=`campaigns/${id}/updates/${updateId}`
  const image=randomUUID();files.push(image);sql(`INSERT INTO file_asset(id,storage_key,file_name,mime_type,size_bytes,scope,uploaded_by) VALUES('${image}','CAMPAIGN_PUBLIC_IMAGE/${image}.bin','ensayo.png','image/png',8,'PUBLIC','${owner.id}');`)
  const input={revision:null,title:'Publicación original de ensayo',body:'Resultado original con evidencia y avance capturado de la campaña.',milestoneId:null,images:[{fileId:image,caption:'Evidencia pública original'}],publish:true}
  let published=await json<Update>(await call(path,owner.cookie,input,'PUT'));assert.equal(published.version,1)
  const progressSnapshot=published.progress
  await json(await call(`me/bookmarks/${id}/FOLLOW`,other.cookie,{active:true},'PUT'))
  const followedBefore=await json<{items:{id:string;title:string}[];total:number}>(await call('me/bookmarks/updates',other.cookie))
  assert.equal(followedBefore.total,1);assert.equal(followedBefore.items[0]!.id,updateId)
  // Legacy publications without an update_version remain visible alongside current managed records.
  const legacyUpdate=randomUUID()
  sql(`INSERT INTO campaign_update(id,campaign_id,author_user_id,title,body,visibility,published_at) VALUES('${legacyUpdate}','${id}','${owner.id}','Publicación histórica conservada','Contenido histórico público sin versión de extensión','PUBLIC',clock_timestamp());`)
  assert.equal((await json<{total:number}>(await call('me/bookmarks/updates',other.cookie))).total,2)
  const correction={action:'CORRECT',revision:published.revision,reason:'Corrección privada del título y resultado capturado.',confirmed:true,title:'Publicación corregida de ensayo',body:'Resultado corregido que conserva el avance y la evidencia histórica.',milestoneId:null,images:[]}
  assert.equal((await call(`${path}/publication`,'',correction,'PUT')).status,401)
  assert.equal((await call(`${path}/publication`,other.cookie,correction,'PUT')).status,403)
  assert.equal((await call(`${path}/publication`,owner.cookie,correction,'PUT','https://invalid.example')).status,403)
  for(const invalid of [{...correction,confirmed:false},{...correction,reason:'x'},{...correction,images:[null]},{...correction,unknown:'field'},{...correction,revision:'stale'}])assert.ok([400,409].includes((await call(`${path}/publication`,owner.cookie,invalid,'PUT')).status))
  const race=await Promise.all([call(`${path}/publication`,owner.cookie,correction,'PUT'),call(`${path}/publication`,owner.cookie,{...correction,title:'Segunda versión concurrente de ensayo'},'PUT')]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409])
  published=await json<Update>(await call(path,owner.cookie));assert.equal(published.version,2);assert.deepEqual(published.progress,progressSnapshot)
  let history=await json<{items:{version:number;reason:string;snapshot:Update}[];total:number}>(await call(`${path}/history`,owner.cookie));assert.equal(history.total,2);assert.equal(history.items[1]!.snapshot.images[0]!.fileId,image);assert.deepEqual(history.items[1]!.snapshot.progress,progressSnapshot)
  assert.equal(sql(`SELECT count(*) FROM file_attachment WHERE campaign_update_id='${updateId}' AND attachment_role='UPDATE_EVIDENCE_ARCHIVED'`),'1')
  const visible=await json<{items:Record<string,unknown>[]}>(await call(`campaigns/public/${id}/updates`));assert.equal(visible.items.find(i=>i.id===updateId)!.title,published.title);for(const key of ['revision','reason','history','withdrawnAt','version','authorUserId'])assert.equal(visible.items[0]![key],undefined)
  assert.equal((await call(path,owner.cookie,{...input,revision:published.revision,publish:false},'PUT')).status,409,'El guardado ordinario no modifica publicaciones')
  const withdrawal={action:'WITHDRAW',revision:published.revision,confirmed:true,reason:'Retiro privado por resultado publicado incorrecto.'}
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='AUDITOR' ON CONFLICT DO NOTHING;`)
  assert.equal((await call(`${path}/publication`,owner.cookie,withdrawal,'PUT')).status,403)
  assert.equal((await json<{editable:boolean}>(await call(`campaigns/${id}/progress`,owner.cookie))).editable,false)
  sql(`DELETE FROM user_role WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='AUDITOR');`)
  const withdrawn=await json<Update>(await call(`${path}/publication`,owner.cookie,withdrawal,'PUT'));assert.ok(withdrawn.withdrawnAt);assert.equal(withdrawn.version,3)
  const publicAfter=await json<{items:{id:string}[];total:number}>(await call(`campaigns/public/${id}/updates`))
  assert.equal(publicAfter.total,1);assert.deepEqual(publicAfter.items.map(i=>i.id),[legacyUpdate])
  const followedAfter=await json<{items:{id:string}[];total:number}>(await call('me/bookmarks/updates',other.cookie))
  assert.equal(followedAfter.total,1,'El total seguido excluye el retiro y conserva publicaciones históricas')
  assert.deepEqual(followedAfter.items.map(i=>i.id),[legacyUpdate],'El feed seguido oculta el retiro y conserva registros sin update_version')
  assert.equal((await json<{total:number}>(await call(`campaigns/${id}/updates`,owner.cookie))).total,2)
  assert.equal((await call(`${path}/publication`,owner.cookie,{...correction,revision:withdrawn.revision},'PUT')).status,409)
  assert.equal((await call(`${path}/history`,other.cookie)).status,404)
  assert.equal((await call(`${path}/history`)).status,401)
  history=await json(await call(`${path}/history`,owner.cookie));assert.equal(history.total,3)
  const reward=randomUUID(),contribution=randomUUID(),payment=randomUUID(),privateFile=randomUUID();files.push(privateFile)
  sql(`UPDATE campaign SET campaign_type='REWARD',status='IN_EXECUTION' WHERE id='${id}';INSERT INTO brotar_extension.campaign_cycle(campaign_id,execution_started_at) VALUES('${id}',clock_timestamp()-interval '1 day');INSERT INTO reward(id,campaign_id,title,description,min_amount,currency_code) VALUES('${reward}','${id}','Ensayo de reconocimiento','Participación en taller sintético',1,'BOB');INSERT INTO contribution(id,campaign_id,user_id,reward_id,amount,currency_code,status,confirmed_at) VALUES('${contribution}','${id}','${other.id}','${reward}',10,'BOB','CONFIRMED',clock_timestamp());INSERT INTO payment(id,contribution_id,provider_id,idempotency_key,amount,currency_code,status,confirmed_at) SELECT '${payment}','${contribution}',id,'tracking-${payment}',10,'BOB','CONFIRMED',clock_timestamp() FROM payment_provider WHERE code='BROTAR_INTERNAL_DEMO';INSERT INTO file_asset(id,storage_key,file_name,mime_type,size_bytes,scope,uploaded_by) VALUES('${privateFile}','CLOSURE_EVIDENCE/${privateFile}.bin','ensayo.pdf','application/pdf',8,'PRIVATE','${owner.id}');`)
  const rewardsPath=`campaigns/${id}/reward-tracking`,rewardPath=`${rewardsPath}/${contribution}`
  let tracking=await json<Tracking>(await call(rewardsPath,owner.cookie));assert.equal(tracking.total,1);assert.equal(tracking.fulfilled,0)
  const start={revision:tracking.items[0]!.revision,status:'IN_PROGRESS',reason:'Iniciamos la preparación del reconocimiento de ensayo.',confirmed:true,fulfilledOn:null,fileId:null}
  assert.equal((await call(rewardPath,other.cookie,start,'PUT')).status,403)
  assert.equal((await call(`campaigns/${campaigns[1]}/reward-tracking/${contribution}`,other.cookie,start,'PUT')).status,409)
  assert.equal((await call(rewardPath,owner.cookie,{...start,status:'SHIPPED'},'PUT')).status,400)
  tracking=await json(await call(rewardPath,owner.cookie,start,'PUT'));assert.equal(tracking.items[0]!.status,'IN_PROGRESS')
  assert.equal((await call(rewardPath,owner.cookie,start,'PUT')).status,409)
  let fulfilled={...start,revision:tracking.items[0]!.revision,status:'FULFILLED',fulfilledOn:new Date(Date.now()-4*3600000).toISOString().slice(0,10),fileId:privateFile}
  assert.equal((await call(rewardPath,owner.cookie,{...fulfilled,fileId:image},'PUT')).status,400)
  assert.equal((await call(rewardPath,owner.cookie,{...fulfilled,fulfilledOn:'2999-01-01'},'PUT')).status,400)
  // A role expiring while the evidence lock is held must roll back the whole write and its history.
  const holder=app.get(DatabaseService).connection().createQueryRunner();await holder.connect();await holder.startTransaction();let pending:Promise<Response>|undefined
  sql(`UPDATE user_role SET expires_at=clock_timestamp()+interval '2 seconds' WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='CREATOR');`)
  try{await holder.query('SELECT id FROM public.file_asset WHERE id=$1 FOR UPDATE',[privateFile]);pending=call(rewardPath,owner.cookie,fulfilled,'PUT');await holder.query('SELECT pg_sleep(2.2)')}finally{await holder.rollbackTransaction();await holder.release()}
  assert.equal((await pending!).status,403);assert.equal(sql(`SELECT status FROM reward_fulfillment WHERE contribution_id='${contribution}'`),'IN_PROGRESS')
  sql(`UPDATE user_role SET expires_at=NULL WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='CREATOR');INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='AUDITOR' ON CONFLICT DO NOTHING;`)
  assert.equal((await call(rewardPath,owner.cookie,fulfilled,'PUT')).status,403)
  sql(`DELETE FROM user_role WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='AUDITOR');`)
  tracking=await json(await call(rewardsPath,owner.cookie));fulfilled={...fulfilled,revision:tracking.items[0]!.revision}
  const fulfillmentRace=await Promise.all([call(rewardPath,owner.cookie,fulfilled,'PUT'),call(rewardPath,owner.cookie,fulfilled,'PUT')]);assert.deepEqual(fulfillmentRace.map(r=>r.status).sort(),[200,409])
  tracking=await json(await call(rewardsPath,owner.cookie));assert.equal(tracking.fulfilled,1);assert.equal(tracking.items[0]!.fileId,privateFile)
  assert.equal((await call(rewardPath,owner.cookie,{...start,revision:tracking.items[0]!.revision,status:'CANCELLED'},'PUT')).status,409)
  const events=await json<{items:unknown[];total:number}>(await call(`${rewardPath}/history`,owner.cookie));assert.equal(events.total,2)
  const closure=await json<{rewards:{id:string;status:string;fileId:string}[];pending:{rewards:number}}>(await call(`me/campaign-closure/${id}`,owner.cookie));assert.equal(closure.pending.rewards,0);assert.equal(closure.rewards[0]!.status,'FULFILLED');assert.equal(closure.rewards[0]!.fileId,privateFile)
  assert.equal((await call(`me/campaign-closure/${id}/documents/${privateFile}`,owner.cookie)).status,404,'El archivo de fixture no existe en disco; no se fabrica su contenido')
  assert.equal((await call(`${rewardPath}/history`,other.cookie)).status,404)
  assert.equal(sql(`SELECT has_table_privilege('brotar_app','brotar_extension.update_history','UPDATE') OR has_table_privilege('brotar_app','brotar_extension.reward_history','DELETE')`),'f')
  assert.ok(Number(sql(`SELECT count(*) FROM audit_log WHERE entity_name IN ('campaign_update','reward_fulfillment') AND actor_user_id='${owner.id}'`))>=5)
 }finally{
  await app.close()
  for(const id of campaigns)sql(`DELETE FROM brotar_extension.reward_history WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${id}');DELETE FROM brotar_extension.campaign_reward_evidence WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${id}');DELETE FROM payment WHERE contribution_id IN(SELECT id FROM contribution WHERE campaign_id='${id}');DELETE FROM contribution WHERE campaign_id='${id}';DELETE FROM brotar_extension.campaign_cycle WHERE campaign_id='${id}';DELETE FROM campaign WHERE id='${id}';`)
  for(const file of files)sql(`DELETE FROM file_asset WHERE id='${file}';`)
  for(const user of users)sql(`DELETE FROM app_user WHERE id='${user.id}';`)
 }
})
