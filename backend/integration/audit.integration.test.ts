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
import { DatabaseService } from '../src/shared/infrastructure/database/database.service'
import { recordAudit, setAuditActor } from '../src/shared/infrastructure/database/audit'
import type { AuditEntry } from '../src/audit/audit.module'
import { readTestDatabaseTarget } from './database-target'

interface Page {source:'AUDIT'|'STATUS';items:AuditEntry[];nextCursor:string|null}

test('S3-15/16/18 PostgreSQL/HTTP: auditoría mínima, actor local, permisos, legado, páginas y rollback atómico', {timeout:120000},async()=>{
  const config=readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
  const {container}=readTestDatabaseTarget(config)
  const sql=(query:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],
    {input:query,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim()
  const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1')
  const base=await app.getUrl(),suffix=randomUUID(),password=randomBytes(24).toString('hex'),secret='NO-EXPONER-LEGADO-'+suffix
  const idOffset=BigInt('0x'+randomBytes(4).toString('hex'))
  const legacyIds=[(9007199254740993n+idOffset).toString(),(10007199254740993n+idOffset).toString()]
  const users:string[]=[],campaigns:string[]=[]
  const call=(path:string,cookie='',method='GET',body?:unknown,extra:Record<string,string>={})=>fetch(`${base}/api/${path}`,{
    method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',...extra},
    ...(body===undefined?{}:{body:JSON.stringify(body)})})
  async function account(role:string) {
    const email=`audit-${role.toLowerCase()}-${suffix}@example.invalid`
    const registered=await call('auth/register','','POST',{firstName:'Ensayo',lastName:'Auditoría',email,password,demoConsent:true});assert.equal(registered.status,201)
    const {id}=await registered.json() as {id:string};users.push(id)
    if (role!=='REGISTERED_USER') sql(`INSERT INTO user_role(user_id,role_id) SELECT '${id}',id FROM role WHERE code='${role}'`)
    const login=await call('auth/login','','POST',{email,password});assert.equal(login.status,200)
    return {id,cookie:login.headers.get('set-cookie')!.split(';')[0]!}
  }
  try {
    const owner=await account('CREATOR'),outsider=await account('REGISTERED_USER'),admin=await account('ADMIN'),auditor=await account('AUDITOR')
    const path='admin/audit'
    assert.equal((await call(path)).status,401)
    for (const role of ['REVIEWER','FINANCE','SUPPORT','COMPLIANCE']) {
      const user=await account(role);assert.equal((await call(path,user.cookie)).status,403,role)
    }
    for (const user of [owner,outsider]) assert.equal((await call(path,user.cookie)).status,403)
    for (const user of [admin,auditor]) for (const source of ['AUDIT','STATUS']) assert.equal((await call(`${path}?source=${source}`,user.cookie)).status,200)
    for (const query of ['source=FILES','limit=51','limit=1&limit=2','actorId=no','entityId=no','entity=campaign;DROP','action=SECRET',
      'from=2026-02-29','to=2026-04-31','from=2026-02-01&to=2026-01-01','cursor=0','cursor=9223372036854775808','userId='+owner.id]) {
      assert.equal((await call(`${path}?${query}`,admin.cookie)).status,400,query)
    }
    const input={title:'Campaña de auditoría '+suffix,summary:'Contenido privado de campaña '+secret,campaignType:'DONATION'}
    assert.equal((await call('campaigns/drafts',owner.cookie,'POST',{...input,actorId:admin.id})).status,400,'El cliente no puede elegir al actor.')
    const key=randomUUID(),created=await call('campaigns/drafts',owner.cookie,'POST',input,{'Idempotency-Key':key})
    assert.equal(created.status,201);const {id}=await created.json() as {id:string};campaigns.push(id)
    const replay=await call('campaigns/drafts',owner.cookie,'POST',input,{'Idempotency-Key':key});assert.equal(replay.status,201)
    assert.equal((await replay.json() as {id:string}).id,id)
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_id='${id}' AND action='CREATE'`),'1')
    assert.equal((await call(`campaigns/drafts/${id}`,outsider.cookie,'PUT',{...input,builderStep:0})).status,404)
    assert.equal((await call(`campaigns/drafts/${id}`,owner.cookie,'PUT',{...input,title:'Edición de auditoría '+suffix,builderStep:0})).status,200)
    assert.equal((await call(`campaigns/mine/${id}/discard`,owner.cookie,'POST',{confirmed:true})).status,204)
    const current=await call(`${path}?entityId=${id}`,admin.cookie);assert.equal(current.status,200);assert.equal(current.headers.get('cache-control'),'no-store')
    const page=await current.json() as Page
    assert.equal(page.items.length,3);assert.deepEqual(page.items.map(row=>row.action),['DELETE','UPDATE','CREATE'])
    assert.ok(page.items.every(row=>row.actorId===owner.id && row.result==='APPLIED' && row.entity==='campaign' && row.fromStatus===null && row.toStatus===null))
    assert.deepEqual(Object.keys(page.items[0]!).sort(),['id','actorId','actorRole','action','entity','entityId','occurredAt','result','fromStatus','toStatus'].sort())
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_id='${id}' AND new_values='{"result":"APPLIED","source":"APPLICATION"}'::jsonb AND old_values IS NULL`),'3')
    const status=await (await call(`${path}?source=STATUS&entityId=${id}`,auditor.cookie)).json() as Page
    assert.equal(status.items.length,2,'Alta y descarte lógico, no un historial reconstruido a partir de audit_log.')
    assert.ok(status.items.every(row=>row.actorId===owner.id && row.actorRole===null && row.result==='RECORDED'))
    // Registros antiguos y textos libres permanecen en almacenamiento: la consulta NO los exporta.
    sql(`INSERT INTO audit_log(id,actor_user_id,actor_role,action,entity_name,entity_id,description,old_values,new_values,ip_address,user_agent,occurred_at) OVERRIDING SYSTEM VALUE
      VALUES(${legacyIds[0]},NULL,'${secret}','READ','campaign','${id}','${secret}','{"password":"${secret}"}','{"token":"${secret}","card":"${secret}"}','127.0.0.1','${secret}','2026-01-01 23:59:59.999999+00'),
      (${legacyIds[1]},NULL,NULL,'READ','campaign','${id}','${secret}',NULL,NULL,NULL,NULL,'2026-01-02 00:00:00+00');
      UPDATE status_history SET reason='${secret}',metadata='{"private":"${secret}"}' WHERE entity_id='${id}';`)
    for (const source of ['AUDIT','STATUS']) {
      const text=await (await call(`${path}?source=${source}&entityId=${id}`,auditor.cookie)).text()
      for (const hidden of [secret,'password','token','card','description','user_agent','ip_address','metadata','reason','old_values','new_values']) assert.equal(text.includes(hidden),false,hidden)
    }
    const historical=await (await call(`${path}?entityId=${id}&from=2026-01-01&to=2026-01-01`,admin.cookie)).json() as Page
    assert.equal(historical.items.length,1);assert.equal(historical.items[0]!.result,'UNSPECIFIED');assert.equal(historical.items[0]!.actorId,null);assert.equal(historical.items[0]!.actorRole,null)
    const filtered=await (await call(`${path}?entityId=${id}&actorId=${owner.id}&action=UPDATE&entity=campaign`,admin.cookie)).json() as Page
    assert.equal(filtered.items.length,1)
    const all:string[]=[];let cursor:string|null=null
    do {
      const result=await (await call(`${path}?entityId=${id}&limit=2${cursor?'&cursor='+cursor:''}`,admin.cookie)).json() as Page
      all.push(...result.items.map(row=>row.id));cursor=result.nextCursor;assert.ok(all.length<=5)
    } while (cursor)
    assert.equal(all.length,5);assert.equal(new Set(all).size,5)
    assert.deepEqual(all,[...all].sort((a,b)=>BigInt(a)>BigInt(b)?-1:1),'El orden es bigint, no el alias convertido a texto; no pierde precisión por encima de 2^53.')
    assert.deepEqual(await (await call(`${path}?entityId=${randomUUID()}`,admin.cookie)).json(),{source:'AUDIT',items:[],nextCursor:null})
    assert.equal((await call(path,admin.cookie,'POST',{})).status,404);assert.equal((await call(path,admin.cookie,'DELETE')).status,404)
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${auditor.id}',id FROM role WHERE code='ADMIN'`)
    assert.equal((await call('campaigns/drafts',auditor.cookie,'POST',input)).status,403,'AUDITOR sigue siendo solo lectura aunque tenga ADMIN.')
    sql(`UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${admin.id}' AND role_id=(SELECT id FROM role WHERE code='ADMIN')`)
    assert.equal((await call(path,admin.cookie)).status,403,'No se conserva una autorización revocada en la cookie.')
    sql(`UPDATE user_role SET granted_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE user_id='${auditor.id}' AND role_id=(SELECT id FROM role WHERE code='AUDITOR');
      UPDATE user_role SET revoked_at=clock_timestamp() WHERE user_id='${auditor.id}' AND role_id=(SELECT id FROM role WHERE code='ADMIN')`)
    assert.equal((await call(path,auditor.cookie)).status,403,'Los permisos vencidos no habilitan la lectura.')
    // Misma conexión del pool, dos transacciones: identidad local termina en COMMIT y ROLLBACK.
    const database=app.get(DatabaseService).connection(),runner=database.createQueryRunner()
    await runner.connect()
    try {
      await runner.startTransaction();await setAuditActor(runner.manager,owner.id)
      assert.equal((await runner.query('SELECT public.brotar_current_actor() AS actor'))[0].actor,owner.id)
      await runner.commitTransaction();await runner.startTransaction()
      assert.equal((await runner.query('SELECT public.brotar_current_actor() AS actor'))[0].actor,null)
      await setAuditActor(runner.manager,outsider.id);await runner.rollbackTransaction();await runner.startTransaction()
      assert.equal((await runner.query('SELECT public.brotar_current_actor() AS actor'))[0].actor,null)
      await runner.commitTransaction()
    } finally {if (runner.isTransactionActive) await runner.rollbackTransaction();await runner.release()}
    const before=sql(`SELECT title FROM campaign WHERE id='${id}'`),count=sql(`SELECT count(*) FROM audit_log WHERE entity_id='${id}'`)
    await assert.rejects(database.transaction(async manager=>{
      await setAuditActor(manager,owner.id);await manager.query('UPDATE campaign SET title=$2 WHERE id=$1',[id,'No debe persistir'])
      await recordAudit(manager,owner.id,'UPDATE','campaign','not-a-uuid')
    }),/uuid/i)
    assert.equal(sql(`SELECT title FROM campaign WHERE id='${id}'`),before,'Fallo al auditar revierte también la escritura de negocio.')
    await assert.rejects(database.transaction(async manager=>{
      await setAuditActor(manager,owner.id);await manager.query('UPDATE campaign SET title=$2 WHERE id=$1',[id,'Tampoco persiste'])
      await recordAudit(manager,owner.id,'UPDATE','campaign',id);throw new Error('Fallo posterior controlado')
    }),/Fallo posterior/)
    assert.equal(sql(`SELECT count(*) FROM audit_log WHERE entity_id='${id}'`),count,'La auditoría no afirma una operación revertida.')
    assert.equal(sql(`SELECT title FROM campaign WHERE id='${id}'`),before)
    // Dos transacciones simultáneas conservan identidades independientes.
    const parallel=await Promise.all([owner,outsider].map(user=>database.transaction(async manager=>{
      await setAuditActor(manager,user.id);await manager.query('SELECT pg_sleep(0.02)')
      const [row]=await manager.query('SELECT public.brotar_current_actor() AS actor');return row.actor as string
    })))
    assert.deepEqual(parallel,[owner.id,outsider.id])
    assert.equal(sql("SELECT has_table_privilege('brotar_app','audit_log','SELECT,INSERT') AND NOT has_table_privilege('brotar_app','audit_log','UPDATE') AND NOT has_table_privilege('brotar_app','audit_log','DELETE')"),'t')
  } finally {
    await app.close()
    // Solo nuestras cuentas y objetos sintéticos; el usuario postgres se usa únicamente en el ensayo.
    if (campaigns.length) sql(`DELETE FROM audit_log WHERE entity_id IN (${campaigns.map(id=>`'${id}'`).join(',')});DELETE FROM campaign WHERE id IN (${campaigns.map(id=>`'${id}'`).join(',')});`)
    for (const id of users) sql(`DELETE FROM app_user WHERE id='${id}'`)
  }
})
