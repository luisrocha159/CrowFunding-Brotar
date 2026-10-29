import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFile,execFileSync} from 'node:child_process'
import {promisify} from 'node:util'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {setTimeout as pause} from 'node:timers/promises'
import {NestFactory} from '@nestjs/core'
import {AppModule} from '../src/app.module'
import {readEnvironment} from '../src/config/environment'
import {configureHttp} from '../src/shared/infrastructure/http/configure-http'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {readTestDatabaseTarget} from './database-target'

test('S3-15/16/17/18: matriz real, perfil de auditor, permisos residuales, rollback, caducidad en espera y archivos íntegros',{timeout:180000},async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
 const {container}=readTestDatabaseTarget(config),sql=(query:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:query,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim()
 const oldRoot=process.env.FILE_STORAGE_DIR,oldDemo=process.env.DEMO_PAYMENTS_ENABLED,root=mkdtempSync(join(tmpdir(),'brotar-integrated-files-'))
 process.env.FILE_STORAGE_DIR=root;process.env.DEMO_PAYMENTS_ENABLED='true'
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}))
 const suffix=randomUUID(),password=randomBytes(24).toString('hex'),users:string[]=[],roles=['REGISTERED_USER','CREATOR','SPONSOR','REVIEWER','COMPLIANCE','FINANCE','SUPPORT','ADMIN','AUDITOR']
 app.use((r:object,_s:unknown,next:()=>void)=>{Object.defineProperty(r,'ip',{value:`security-${suffix}`});next()});await app.listen(0,'127.0.0.1')
 const base=await app.getUrl(),source=app.get(DatabaseService).connection()
 const call=(path:string,cookie='',method='GET',body?:unknown)=>fetch(`${base}/api/${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173'},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const accounts:Record<string,{id:string;cookie:string}>={}
 let changedGrants=false,auditRevoked=false,readGrantRemoved=false
 try{
  for(const role of roles){
   const email=`security-${role.toLowerCase()}-${suffix}@example.invalid`,r=await call('auth/register','','POST',{ legalVersion:'mvp-demo-legal-1.0-20261028',email,password,firstName:'DEMO',lastName:'Ñandú',demoConsent:true});assert.equal(r.status,201)
   const {id}=await r.json() as{id:string};users.push(id)
   if(role!=='REGISTERED_USER')sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}'`)
   const login=await call('auth/login','','POST',{email,password});assert.equal(login.status,200);accounts[role]={id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}
  }
  const matrix:[string,string[]][]=[
   ['admin/audit',['ADMIN','AUDITOR']],['catalogs/admin/settings',['ADMIN','AUDITOR']],
   ['admin/finance/payments',['ADMIN','AUDITOR','FINANCE']],['admin/verifications',['ADMIN','COMPLIANCE']],
   ['administration/parties',['ADMIN','AUDITOR']],['administration/dashboard',['ADMIN','AUDITOR','REVIEWER','COMPLIANCE','FINANCE','SUPPORT']],
   ['admin/campaign-closure',['ADMIN','AUDITOR','REVIEWER','FINANCE','SUPPORT']]
  ]
  for(const [path,allowed]of matrix){
   assert.equal((await call(path)).status,401,path)
   for(const role of roles)assert.equal((await call(path,accounts[role]!.cookie)).status,allowed.includes(role)?200:403,`${role}: ${path}`)
  }
  const owner=accounts.REGISTERED_USER!,admin=accounts.ADMIN!,auditor=accounts.AUDITOR!,profile={firstName:'DEMO Ñandú',lastName:'Prueba técnica',phoneCountryCode:'',phoneNumber:''}
  assert.equal((await call('health/ready')).status,200)
  sql(`DELETE FROM role_permission rp USING role r,permission p WHERE rp.role_id=r.id AND rp.permission_id=p.id AND r.code='ADMIN' AND p.code='dashboard.read'`);readGrantRemoved=true
  assert.equal((await call('health/ready')).status,503,'Una concesión necesaria ausente impide anunciar preparación.')
  assert.equal((await call('administration/dashboard',admin.cookie)).status,403)
  sql(`INSERT INTO role_permission(role_id,permission_id) SELECT r.id,p.id FROM role r CROSS JOIN permission p WHERE r.code='ADMIN' AND p.code='dashboard.read' ON CONFLICT DO NOTHING`);readGrantRemoved=false
  assert.equal((await call('health/ready')).status,200)
  assert.equal((await call('profile',owner.cookie,'PATCH',profile)).status,200)
  assert.equal((await call('profile',owner.cookie,'PATCH',{...profile,actorId:admin.id})).status,400)
  assert.equal((await call('profile',auditor.cookie)).status,200)
  assert.equal((await call('profile',auditor.cookie,'PATCH',profile)).status,403)
  sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='ADMIN'`)
  assert.equal((await call('profile',auditor.cookie,'PATCH',profile)).status,403,'AUDITOR + ADMIN sigue en lectura.')
  const before=sql(`SELECT first_name FROM user_profile WHERE user_id='${owner.id}'`)
  sql('REVOKE INSERT ON audit_log FROM brotar_app');auditRevoked=true
  assert.equal((await call('profile',owner.cookie,'PATCH',{...profile,firstName:'No debe persistir'})).status,500)
  sql('GRANT INSERT ON audit_log TO brotar_app');auditRevoked=false
  assert.equal(sql(`SELECT first_name FROM user_profile WHERE user_id='${owner.id}'`),before,'Fallo de auditoría revierte el perfil.')
  sql(`INSERT INTO role_permission(role_id,permission_id) SELECT r.id,p.id FROM role r CROSS JOIN permission p WHERE (r.code='ADMIN' AND p.code='finance.operate') OR(r.code='SUPPORT' AND p.code='verification.read') ON CONFLICT DO NOTHING`);changedGrants=true
  for(const [role,code]of [['ADMIN','finance.operate'],['SUPPORT','verification.read']]){
   const p=await(await call('access/permissions',accounts[role!]!.cookie)).json() as{permissions:string[]};assert.equal(p.permissions.includes(code!),false)
  }
  assert.equal((await call('admin/finance/demo/reconciliations',admin.cookie,'POST',{})).status,403)
  assert.equal((await call('admin/verifications',accounts.SUPPORT!.cookie)).status,403)
  const runner=source.createQueryRunner();await runner.connect();await runner.startTransaction()
  let pending:Promise<Response>|undefined
  try{
   await runner.query('SELECT id FROM app_user WHERE id=$1 FOR UPDATE',[owner.id])
   const pid=(await runner.query('SELECT pg_backend_pid() AS pid') as{pid:number}[])[0]!.pid
   sql(`UPDATE user_role SET expires_at=clock_timestamp()+interval '3 seconds' WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER')`)
   pending=call('profile',owner.cookie,'PATCH',{...profile,firstName:'Tampoco debe persistir'})
   const deadline=Date.now()+10000;let waiting=false
   while(Date.now()<deadline){const [row]=await source.query('SELECT EXISTS(SELECT 1 FROM pg_stat_activity a WHERE $1=ANY(pg_blocking_pids(a.pid))) AS waiting',[pid]);if(row.waiting){waiting=true;break}await pause(20)}
   assert.equal(waiting,true,'La solicitud esperó el bloqueo real de cuenta.')
   while(Date.now()<deadline){const [row]=await source.query(`SELECT expires_at<=clock_timestamp() AS expired FROM user_role WHERE user_id=$1 AND role_id=(SELECT id FROM role WHERE code='REGISTERED_USER')`,[owner.id]);if(row.expired)break;await pause(25)}
   await runner.commitTransaction();assert.equal((await pending).status,403,'No se conserva el rol que venció durante la espera.')
   assert.equal(sql(`SELECT first_name FROM user_profile WHERE user_id='${owner.id}'`),before)
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();if(pending)await pending;sql(`UPDATE user_role SET expires_at=NULL WHERE user_id='${owner.id}'`)}
  const content=Buffer.from('%PDF-1.4\nDEMO evidencia privada Ñandú'),fileInput={purpose:'SUPPORT_EVIDENCE',visibility:'PRIVATE',originalName:'DEMO-respaldo.pdf',mimeType:'application/pdf',contentBase64:content.toString('base64')}
  assert.equal((await call('files',owner.cookie,'POST',{...fileInput,originalName:'DEMO\nevidencia.pdf'})).status,400)
  const uploaded=await call('files',owner.cookie,'POST',fileInput);assert.equal(uploaded.status,201);const {id:fileId}=await uploaded.json() as{id:string}
  for(const role of ['ADMIN','COMPLIANCE','AUDITOR'])assert.equal((await call(`files/${fileId}`,accounts[role]!.cookie)).status,403,'El rol interno no abre un archivo privado ajeno.')
  assert.equal((await call(`files/${fileId}`,owner.cookie)).status,200)
  const path=join(root,'SUPPORT_EVIDENCE',fileId+'.bin');writeFileSync(path,Buffer.alloc(content.length))
  assert.equal((await call(`files/${fileId}`,owner.cookie)).status,404,'No entrega un binario alterado aunque conserve el tamaño.')
  writeFileSync(path,content)
  const history=await(await call(`admin/audit?actorId=${owner.id}`,admin.cookie)).json() as{items:{entity:string;action:string;result:string}[]}
  for(const [entity,action]of [['app_user','CREATE'],['app_user','LOGIN'],['user_profile','UPDATE'],['file_asset','CREATE'],['file_asset','READ']])assert.ok(history.items.some(r=>r.entity===entity&&r.action===action&&r.result==='APPLIED'),entity+' '+action)
  assert.equal(sql(`SELECT count(*) FROM audit_log WHERE actor_user_id='${owner.id}' AND (new_values::text LIKE '%${password}%' OR new_values::text LIKE '%Ñandú%' OR new_values::text LIKE '%DEMO evidencia%')`),'0','El historial mínimo no copia credenciales, nombre ni contenido.')
  const evidence=mkdtempSync(join(tmpdir(),'brotar-integrated-recovery-'))
  const {stdout:output}=await promisify(execFile)(process.execPath,['scripts/drill-recovery.mjs','--with-files'],{encoding:'utf8',timeout:120000,env:{...process.env,BROTAR_DRILL_DIR:evidence}})
  assert.match(output,/"verifiedCount": 1/);assert.match(output,/"restoredContentsUnchangedAfterUp": true/)
  assert.deepEqual(readFileSync(path),content,'El ensayo no modifica los archivos originales.')
  assert.equal((await call('auth/logout',owner.cookie,'POST')).status,204)
  assert.equal(sql(`SELECT count(*) FROM audit_log WHERE actor_user_id='${owner.id}' AND action='LOGOUT'`),'1')
 }finally{
  if(auditRevoked)sql('GRANT INSERT ON audit_log TO brotar_app')
  if(readGrantRemoved)sql(`INSERT INTO role_permission(role_id,permission_id) SELECT r.id,p.id FROM role r CROSS JOIN permission p WHERE r.code='ADMIN' AND p.code='dashboard.read' ON CONFLICT DO NOTHING`)
  if(changedGrants)sql(`DELETE FROM role_permission rp USING role r,permission p WHERE rp.role_id=r.id AND rp.permission_id=p.id AND ((r.code='ADMIN' AND p.code='finance.operate') OR(r.code='SUPPORT' AND p.code='verification.read'))`)
  await app.close()
  for(const id of users)sql(`UPDATE file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE uploaded_by='${id}';DELETE FROM audit_log WHERE actor_user_id='${id}';DELETE FROM app_user WHERE id='${id}';`)
  if(oldRoot===undefined)delete process.env.FILE_STORAGE_DIR;else process.env.FILE_STORAGE_DIR=oldRoot
  if(oldDemo===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=oldDemo
 }
})
