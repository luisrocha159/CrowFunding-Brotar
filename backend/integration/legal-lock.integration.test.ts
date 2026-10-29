import 'reflect-metadata'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomUUID,randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {setTimeout} from 'node:timers/promises'
import {DataSource} from 'typeorm'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readEnvironment} from '../src/config/environment'
import {LEGAL_VERSION} from '../src/legal/domain/legal-v1-20261028'

test('consentimiento: bloqueo de cuenta durante espera impide insertar un recibo', {timeout:45000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');readTestDatabaseTarget(config)
 const e=parseEnv(readFileSync('../infra/postgres-v2/.env','utf8'))
 const admin=new DataSource({type:'postgres',host:config.host,port:config.port,database:config.database,username:'postgres',password:e.POSTGRES_PASSWORD,entities:[],synchronize:false});await admin.initialize()
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl()
 const email=`legal-lock-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex');let id='',pending:Promise<{status:number}>|undefined
 const locker=admin.createQueryRunner();await locker.connect()
 const request=async(path:string,method:string,body:unknown,cookie='')=>{const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});return{status:r.status,headers:r.headers,data:await r.json() as{id:string}}}
 try{
  const reg=await request('auth/register','POST',{email,password,firstName:'Prueba',lastName:'Bloqueo',demoConsent:true,legalVersion:LEGAL_VERSION});assert.equal(reg.status,201);id=reg.data.id
  const login=await request('auth/login','POST',{email,password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0]!
  await admin.query("DELETE FROM brotar_extension.legal_acceptance WHERE user_id=$1",[id])
  await locker.startTransaction();await locker.query('SELECT id FROM app_user WHERE id=$1 FOR UPDATE',[id]);const [{pid}]=await locker.query('SELECT pg_backend_pid() AS pid')
  pending=request('me/legal','PUT',{version:LEGAL_VERSION,accepted:true},cookie)
  let waiting=false
  for(let n=0;n<50;n++){const [r]=await admin.query('SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))) AS waiting',[pid]);if(r.waiting){waiting=true;break}await setTimeout(20)}
  assert.equal(waiting,true,'La solicitud realmente alcanzó el bloqueo después del guard de sesión.')
  await locker.query("UPDATE app_user SET locked_until=clock_timestamp()+interval '1 hour' WHERE id=$1",[id]);await locker.commitTransaction()
  assert.equal((await pending).status,403,'La cuenta bloqueada después del guard no puede escribir el consentimiento.')
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM brotar_extension.legal_acceptance WHERE user_id=$1',[id]))[0].n,0)
 }finally{
  if(locker.isTransactionActive)await locker.rollbackTransaction();await locker.release();if(pending)await pending.catch(()=>{})
  if(id){await admin.query('DELETE FROM audit_log WHERE actor_user_id=$1',[id]);await admin.query('DELETE FROM user_profile WHERE user_id=$1',[id]);await admin.query('DELETE FROM app_user WHERE id=$1',[id])}
  await app.close();await admin.destroy()
 }
})
