import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { EntityManager } from 'typeorm'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { AuditController, AuditQueryDto, AuditReader } from '../src/audit/audit.module'
import { setAuditActor, recordAudit } from '../src/shared/infrastructure/database/audit'
import { RoleGuard } from '../src/roles/infrastructure/roles-http'
import { DatabaseService } from '../src/shared/infrastructure/database/database.service'

test('S3-15/16: DTO acota fuente, identificadores, acción y páginas; ambas lecturas requieren audit.read',async()=>{
  const options={whitelist:true,forbidNonWhitelisted:true}
  for (const value of [{},{source:'STATUS',limit:'50',action:'STATUS_CHANGE',cursor:'9007199254740993'}]) assert.equal((await validate(plainToInstance(AuditQueryDto,value),options)).length,0)
  for (const value of [{source:'private_documents'},{limit:'51'},{limit:'1.5'},{limit:['1','2']},{cursor:'0'},{cursor:'1e3'},{actorId:'no'},
    {entity:'campaign;DROP TABLE audit_log'},{action:'READ_SECRET'},{result:'APPLIED'},{body:{password:'never'}}]) assert.ok((await validate(plainToInstance(AuditQueryDto,value),options)).length)
  assert.deepEqual(Reflect.getMetadata('brotar.requiredPermissions',AuditController),['audit.read'])
  assert.ok(Reflect.getMetadata('__guards__',AuditController).includes(RoleGuard))
  const reader=new AuditReader({connection:()=>{throw new Error('No debería consultar.')}} as unknown as DatabaseService)
  await assert.rejects(reader.list(plainToInstance(AuditQueryDto,{cursor:'9223372036854775808'})),/marcador/)
  await assert.rejects(reader.list(plainToInstance(AuditQueryDto,{from:'2026-02-29'})),/fechas/)
})
test('S3-15: actor local y registro mínimo parametrizado sin cuerpo ni estado de negocio inventado',async()=>{
  const calls:{sql:string;args:unknown[]|undefined}[]=[]
  const manager={query:async(sql:string,args?:unknown[])=>{calls.push({sql,args});return []}} as unknown as EntityManager
  const actor='11111111-1111-4111-8111-111111111111'
  await setAuditActor(manager,actor);await recordAudit(manager,actor,'UPDATE','campaign',actor);await setAuditActor(manager,null)
  assert.deepEqual(calls[0]!.args,['brotar.actor_id',actor]);assert.deepEqual(calls.at(-1)!.args,['brotar.actor_id',''])
  assert.match(calls[0]!.sql,/true/);assert.deepEqual(calls[1]!.args,[actor,'UPDATE','campaign',actor])
  assert.match(calls[1]!.sql,/APPLIED/);assert.match(calls[1]!.sql,/ur\.expires_at>clock_timestamp/)
  await assert.rejects(setAuditActor(manager,'no-uuid'),/Actor/)
})
