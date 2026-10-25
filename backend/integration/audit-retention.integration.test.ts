import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { resolve } from 'node:path'
import { DataSource } from 'typeorm'
import { auditRetention } from '../src/audit/audit-retention'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'

test('retención PostgreSQL: plan sin borrar, retención por caso activo y anonimización atómica sin IDs ni textos', { timeout: 120000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true'); assert.notEqual(process.env.NODE_ENV,'production')
  readTestDatabaseTarget(config)
  const env = parseEnv(readFileSync(resolve('../infra/postgres-v2/.env'),'utf8'))
  const source = new DataSource({ type:'postgres',host:config.host,port:config.port,database:config.database,username:'postgres',password:env.POSTGRES_PASSWORD,
    entities:[],synchronize:false,logging:false,extra:{max:2} })
  await source.initialize()
  const entityId = randomUUID(), caseId = randomUUID(), marker = `No conservar texto ${randomUUID()}`
  let fixtures = false
  try {
    const initial = await auditRetention(source)
    assert.equal(initial.eligible,'0','El ensayo solo puede anonimizar sus dos filas sintéticas; no debe haber auditoría histórica preexistente elegible.')
    assert.equal(initial.held,false,'Ensayo requiere una copia aislada sin trabajo activo.')
    const before = await source.query('SELECT * FROM brotar_extension.audit_monthly ORDER BY month_utc,action')
    assert.deepEqual(before,[], 'El ensayo requiere estadísticas vacías para no modificar agregados de otra ejecución.')
    fixtures = true
    await source.query(`INSERT INTO public.audit_log(action,entity_name,entity_id,description,new_values,occurred_at)
      VALUES('READ','campaign',$1,$2,jsonb_build_object('secret',$2::text),'2001-01-01T00:00:00Z'),
        ('READ','campaign',$1,$2,NULL,'2001-01-02T00:00:00Z'),('READ','campaign',$1,$2,NULL,now())`,[entityId,marker])
    assert.equal((await auditRetention(source)).eligible,'2')
    assert.equal((await source.query('SELECT count(*)::text AS n FROM public.audit_log WHERE entity_id=$1',[entityId]))[0].n,'3')
    const locked = source.createQueryRunner()
    await locked.connect(); await locked.startTransaction()
    try {
      await locked.query('LOCK TABLE public.support_case IN ROW EXCLUSIVE MODE')
      await assert.rejects(auditRetention(source,true),/could not obtain lock/,'No se espera ni elimina durante una escritura concurrente.')
    } finally { await locked.rollbackTransaction(); await locked.release() }
    await source.query(`INSERT INTO public.support_case(id,subject,description,category) VALUES($1,'Caso sintético de retención',$2,'TEST')`,[caseId,marker])
    const held = await auditRetention(source,true)
    assert.equal(held.held,true); assert.equal(held.processed,'0'); assert.equal(held.holds.support,'1')
    await source.query("UPDATE public.support_case SET status='CLOSED',closed_at=now() WHERE id=$1",[caseId])
    const cli = execFileSync(process.execPath,['scripts/audit-retention.mjs','apply','--confirm-12-months'],{
      encoding:'utf8',timeout:45000,env:{...process.env,BROTAR_RETENTION_BACKUP_DIR:resolve(tmpdir(),'brotar-s3-retention-20261020')}
    })
    assert.match(cli,/Respaldo privado completo/)
    const applied = JSON.parse(cli.trim().split('\n').at(-1)!) as Awaited<ReturnType<typeof auditRetention>>
    assert.equal(applied.processed,'2'); assert.equal(applied.businessHistoryDeleted,false)
    assert.equal((await source.query('SELECT count(*)::text AS n FROM public.audit_log WHERE entity_id=$1',[entityId]))[0].n,'1')
    const stats = await source.query("SELECT month_utc::text,action,event_count::text FROM brotar_extension.audit_monthly WHERE month_utc='2001-01-01'")
    assert.deepEqual(stats,[{month_utc:'2001-01-01',action:'READ',event_count:'2'}])
    assert.equal(JSON.stringify(stats).includes(marker),false); assert.equal(JSON.stringify(stats).includes(entityId),false)
    const recovery = execFileSync(process.execPath,['scripts/drill-recovery.mjs'],{
      encoding:'utf8',timeout:90000,env:{...process.env,BROTAR_DRILL_DIR:resolve(tmpdir(),'brotar-s3-recovery-20261019')}
    })
    assert.match(recovery,/Ensayo completado/)
    assert.match(recovery,/"auditMonthly": \[/)
    assert.match(recovery,/"count": "2"/,'El agregado restaurado conserva el conteo exacto como cadena.')
    assert.equal((await auditRetention(source,true)).processed,'0','Repetir no suma estadísticas ni elimina dos veces.')
    const columns: { column_name: string }[] = await source.query("SELECT column_name FROM information_schema.columns WHERE table_schema='brotar_extension' AND table_name='audit_monthly' ORDER BY ordinal_position")
    assert.deepEqual(columns.map(row=>row.column_name),['month_utc','action','event_count'])
    assert.equal((await source.query("SELECT has_table_privilege('brotar_app','public.audit_log','DELETE') AS write,has_table_privilege('brotar_app','brotar_extension.audit_monthly','SELECT') AS read"))[0].write,false)
    assert.equal((await source.query("SELECT has_table_privilege('brotar_app','brotar_extension.audit_monthly','SELECT') AS allowed"))[0].allowed,false)
    // Fuerza un fallo real de la agregación, no simula un error fuera del caso de uso.
    await source.query(`INSERT INTO public.audit_log(action,entity_name,entity_id,occurred_at) VALUES('READ','campaign',$1,'2001-01-03T00:00:00Z')`,[entityId])
    await source.query("UPDATE brotar_extension.audit_monthly SET event_count=9223372036854775807 WHERE month_utc='2001-01-01' AND action='READ'")
    await assert.rejects(auditRetention(source,true),/out of range/)
    assert.equal((await source.query('SELECT count(*)::text AS n FROM public.audit_log WHERE entity_id=$1',[entityId]))[0].n,'2')
  } finally {
    if (fixtures) {
      await source.query('DELETE FROM public.audit_log WHERE entity_id=$1',[entityId])
      await source.query('DELETE FROM public.support_case WHERE id=$1',[caseId])
      await source.query("DELETE FROM brotar_extension.audit_monthly WHERE month_utc='2001-01-01'")
    }
    await source.destroy()
  }
})
