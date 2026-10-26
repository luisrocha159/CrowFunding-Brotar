import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'

test('S3-25: acceso y agregados del panel por responsabilidad sin filtrar datos de otras áreas',{timeout:90000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container}=readTestDatabaseTarget(config),admin=(sql:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:15000}).trim()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl(),users:string[]=[],campaigns:string[]=[],suffix=randomUUID(),password=randomBytes(24).toString('hex')
 const call=(path:string,cookie='',body?:unknown)=>fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1'},...(body?{body:JSON.stringify(body)}:{})})
 const expected:Record<string,string[]>={
  REVIEWER:['campaigns','accountabilityAlerts','closureAlerts'],COMPLIANCE:['identityAlerts'],
  FINANCE:['campaigns','accountabilityAlerts','closureAlerts'],SUPPORT:['supportAlerts','accountabilityAlerts','closureAlerts'],
  ADMIN:['campaigns','catalogs','parties','supportAlerts','identityAlerts','accountabilityAlerts','closureAlerts'],
  AUDITOR:['campaigns','catalogs','parties','supportAlerts','accountabilityAlerts','closureAlerts']
 }
 try{
  assert.equal((await call('administration/dashboard')).status,401)
  for(const role of ['REGISTERED_USER','CREATOR','SPONSOR',...Object.keys(expected)]){
   const email=`dash-${role}-${suffix}@example.invalid`,r=await call('auth/register','',{firstName:'DEMO',lastName:'Panel',email,password,demoConsent:true});assert.equal(r.status,201);const {id}=await r.json() as{id:string};users.push(id)
   if(role!=='REGISTERED_USER')admin(`INSERT INTO public.user_role(user_id,role_id) SELECT '${id}',id FROM public.role WHERE code='${role}';`)
   const login=await call('auth/login','',{email,password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0]!
   const result=await call('administration/dashboard',cookie);assert.equal(result.status,expected[role]?200:403,`${role} accede según responsabilidad`)
   if(!expected[role])continue
   assert.equal(result.headers.get('cache-control'),'no-store');const data=await result.json() as Record<string,unknown>
   assert.deepEqual(Object.keys(data).sort(),['readOnly',...expected[role]!].sort(),`${role} recibe solo sus agregados`)
   assert.equal(data.readOnly,role==='AUDITOR')
   assert.ok(!JSON.stringify(data).includes(email),'No se exponen correos ni documentos en los agregados.')
   if(role==='ADMIN'){
    const active=randomUUID(),closed=randomUUID(),old=randomUUID(),latest=randomUUID();campaigns.push(active,closed)
    admin(`INSERT INTO public.campaign(id,slug,creator_user_id,title,campaign_type,goal_amount,currency_code,status)
      VALUES('${active}','dash-${active}','${id}','DEMO Ejecución','DONATION',100,'BOB','IN_EXECUTION'),('${closed}','dash-${closed}','${id}','DEMO Cerrada','DONATION',100,'BOB','CLOSED');
      INSERT INTO public.accountability_report(id,campaign_id,currency_code,is_final,status,created_at)
      VALUES('${old}','${active}','BOB',true,'CHANGES_REQUESTED',clock_timestamp()-interval '2 days'),('${latest}','${active}','BOB',true,'APPROVED',clock_timestamp()-interval '1 day');
      INSERT INTO public.support_case(user_id,campaign_id,subject,description) VALUES('${id}','${closed}','DEMO Histórico previo','DEMO Caso histórico en campaña ya cerrada');`)
    const snapshot=await (await call('administration/dashboard',cookie)).json() as {closureAlerts:{blocked:number};accountabilityAlerts:{requiresInformation:number;awaitingReview:number}}
    assert.equal(snapshot.closureAlerts.blocked,(data.closureAlerts as {blocked:number}).blocked,'No marcar cerradas ni una versión antigua corregida como bloqueo actual.')
    assert.equal(snapshot.accountabilityAlerts.requiresInformation,(data.accountabilityAlerts as {requiresInformation:number}).requiresInformation,'Solo la rendición final vigente afecta el contador.')
    admin(`UPDATE public.accountability_report SET status='SUBMITTED' WHERE id='${latest}';`)
    const pending=await (await call('administration/dashboard',cookie)).json() as typeof snapshot
    assert.equal(pending.closureAlerts.blocked,snapshot.closureAlerts.blocked+1)
    assert.equal(pending.accountabilityAlerts.awaitingReview,snapshot.accountabilityAlerts.awaitingReview+1)
   }
   admin(`UPDATE public.user_role SET revoked_at=clock_timestamp() WHERE user_id='${id}' AND role_id IN(SELECT id FROM public.role WHERE code='${role}');`)
   assert.equal((await call('administration/dashboard',cookie)).status,403,'La sesión no conserva el acceso después de revocar el rol.')
  }
 }finally{await app.close();for(const id of campaigns)admin(`DELETE FROM public.support_case WHERE campaign_id='${id}';DELETE FROM public.accountability_report WHERE campaign_id='${id}';DELETE FROM public.status_history WHERE entity_type='CAMPAIGN' AND entity_id='${id}';DELETE FROM public.campaign WHERE id='${id}';`);for(const id of users)admin(`DELETE FROM public.audit_log WHERE actor_user_id='${id}';DELETE FROM public.app_user WHERE id='${id}';`)}
})
