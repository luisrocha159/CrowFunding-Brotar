import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
interface Update {id:string;title:string;body:string;revision:string;version:number;supersedesId:string|null;supersededById:string|null;withdrawnAt:string|null}
test('S3-12 cierre: corrección inmutable enlazada, idempotencia, feed y retiro administrativo protegido',{timeout:90000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production');const{container,project}=readTestDatabaseTarget(config);assert.match(project,/qa/)
 const sql=(s:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl(),users:string[]=[],campaigns:string[]=[],password=randomBytes(24).toString('hex')
 const call=(p:string,cookie='',body?:unknown,method=body===undefined?'GET':'PUT',origin='http://127.0.0.1:5173')=>fetch(base+'/api/'+p,{method,headers:{Connection:'close',Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-Brotar-Request':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const json=async<T>(r:Response,status=200):Promise<T>=>{const v:unknown=await r.json();assert.equal(r.status,status,JSON.stringify(v));return v as T}
 const account=async(role:string)=>{const email=`succession-${randomUUID()}@example.invalid`,u=await json<{id:string}>(await call('auth/register','',{firstName:'DEMO',lastName:'Publicación',email,password,demoConsent:true},'POST'),201);users.push(u.id);sql(`INSERT INTO user_role(user_id,role_id) SELECT '${u.id}',id FROM role WHERE code='${role}' ON CONFLICT DO NOTHING;`);const r=await call('auth/login','',{email,password},'POST');assert.equal(r.status,200);return{id:u.id,cookie:r.headers.get('set-cookie')!.split(';')[0]!}}
 try{
  const creator=await account('CREATOR'),other=await account('CREATOR'),admin=await account('ADMIN'),auditor=await account('AUDITOR'),reviewer=await account('REVIEWER')
  const c=await json<{id:string}>(await call('campaigns/drafts',creator.cookie,{title:'DEMO Ñandú: avance original',summary:'Demostración de correcciones con evidencia inmutable.',campaignType:'DONATION'},'POST'),201);campaigns.push(c.id);sql(`UPDATE campaign SET status='PUBLISHED',published_at=clock_timestamp(),currency_code='BOB',goal_amount=1000 WHERE id='${c.id}';`)
  const id=randomUUID(),path=`campaigns/${c.id}/updates/${id}`,input={revision:null,title:'Primera publicación de Ñandú',body:'Resultado público original que se conserva sin reescribir su contenido.',milestoneId:null,images:[],publish:true}
  const percentage=randomUUID(),persons=randomUUID();sql(`INSERT INTO campaign_impact_indicator(id,campaign_id,name,unit,target_value) VALUES('${percentage}','${c.id}','Resultado porcentual','%',100),('${persons}','${c.id}','Personas atendidas','personas',10);`)
  const progress=await json<{revision:string}>(await call(`campaigns/${c.id}/progress`,creator.cookie))
  for(const indicator of [{id:percentage,achievedValue:101},{id:persons,achievedValue:1.5}])assert.equal((await call(`campaigns/${c.id}/progress`,creator.cookie,{revision:progress.revision,activities:[],milestones:[],indicators:[indicator]})).status,400)
  const original=await json<Update>(await call(path,creator.cookie,input));await json(await call(`me/bookmarks/${c.id}/FOLLOW`,other.cookie,{active:true}))
  const correction={action:'CORRECT',revision:original.revision,reason:'Corrección necesaria conservando el documento anterior.',confirmed:true,title:'Nueva publicación corregida de Ñandú',body:'Resultados corregidos y expresamente relacionados con su publicación anterior.',milestoneId:null,images:[]}
  const corrected=await json<Update>(await call(path+'/publication',creator.cookie,correction));assert.notEqual(corrected.id,id,'La corrección debe crear una publicación con UUID nuevo')
  assert.equal(corrected.supersedesId,id);assert.equal(sql(`SELECT title FROM campaign_update WHERE id='${id}'`),input.title)
  assert.equal((await json<Update>(await call(path,creator.cookie))).supersededById,corrected.id)
  assert.equal((await json<Update>(await call(path+'/publication',creator.cookie,correction))).id,corrected.id,'Reintento igual recupera su sucesora sin duplicarla')
  assert.equal((await call(path+'/publication',creator.cookie,{...correction,title:'Otra corrección incompatible de ensayo'})).status,409)
  const visible=await json<{items:Update[];total:number}>(await call(`campaigns/public/${c.id}/updates`));assert.equal(visible.total,1);assert.deepEqual(visible.items.map(r=>r.id),[corrected.id]);assert.equal(visible.items[0]!.supersedesId,id);assert.equal(JSON.stringify(visible).includes(correction.reason),false)
  const feed=await json<{items:Update[];total:number}>(await call('me/bookmarks/updates',other.cookie));assert.equal(feed.total,1);assert.equal(feed.items[0]!.id,corrected.id)
  const history=await json<{items:{snapshot:Update}[];total:number}>(await call(`campaigns/${c.id}/updates/${corrected.id}/history`,creator.cookie));assert.equal(history.total,2);assert.ok(history.items.some(h=>h.snapshot.title===input.title))
  const queue=`admin/campaign-publications?campaignId=${c.id}`,moderate=`admin/campaign-publications/${c.id}/${corrected.id}/withdraw`,withdrawal={revision:corrected.revision,reason:'Retiro administrativo de información que necesita revisión.',confirmed:true}
  assert.equal((await call(queue,other.cookie)).status,403);assert.equal((await call(queue,auditor.cookie)).status,200);assert.equal((await call(moderate,auditor.cookie,withdrawal)).status,403);assert.equal((await call(moderate,reviewer.cookie,withdrawal)).status,403)
  assert.equal((await call(moderate,admin.cookie,withdrawal,'PUT','https://foreign.invalid')).status,403)
  for(const patch of [{confirmed:false},{reason:' '},{revision:'stale'},{unknown:true}])assert.ok([400,409].includes((await call(moderate,admin.cookie,{...withdrawal,...patch})).status))
  sql(`UPDATE campaign SET status='CLOSED' WHERE id='${c.id}';`)
  const removed=await json<Update>(await call(moderate,admin.cookie,withdrawal));assert.ok(removed.withdrawnAt);assert.equal(sql(`SELECT title FROM campaign_update WHERE id='${corrected.id}'`),correction.title)
  assert.equal((await json<{total:number}>(await call(`campaigns/public/${c.id}/updates`))).total,0);assert.equal((await json<{total:number}>(await call('me/bookmarks/updates',other.cookie))).total,0)
  assert.equal(sql(`SELECT status FROM campaign WHERE id='${c.id}'`),'CLOSED');assert.equal((await call(moderate,admin.cookie,withdrawal)).status,409)
 }finally{await app.close();for(const id of campaigns)sql(`DELETE FROM campaign WHERE id='${id}';`);for(const id of users)sql(`DELETE FROM app_user WHERE id='${id}';`)}
})
