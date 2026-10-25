import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {GUARDS_METADATA} from '@nestjs/common/constants'
import {ProfileController} from '../src/profiles/infrastructure/profile.controller'
import {RoleGuard} from '../src/roles/infrastructure/roles-http'
import {execFileSync} from 'node:child_process'
import {TypeormPermissionRepository} from '../src/roles/infrastructure/typeorm-permission.repository'
import type {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import {TypeormSessionRepository} from '../src/auth/infrastructure/typeorm-session.repository'

test('S3-16: perfil propio pasa por la política común de AUDITOR y roles vigentes',()=>{
  const guards:unknown[]=[...(Reflect.getMetadata(GUARDS_METADATA,ProfileController)??[]),...(Reflect.getMetadata(GUARDS_METADATA,ProfileController.prototype.save)??[])]
  assert.ok(guards.includes(RoleGuard),'La sesión por sí sola no mantiene AUDITOR en lectura.')
})

test('S3-16: una concesión residual no amplía responsabilidades de un permiso conocido',async()=>{
  const repository=new TypeormPermissionRepository({connection:()=>({query:async()=>[
    {code:'finance.operate',role:'ADMIN'},{code:'verification.review',role:'SUPPORT'},
    {code:'finance.read',role:'ADMIN'},{code:'support.resolve',role:'SUPPORT'},
    {code:'finance.read',role:'AUDITOR'}
  ]})} as unknown as DatabaseService)
  assert.deepEqual(await repository.granted('actor'),['finance.read','support.resolve'])
})

test('S3-18: todos los endpoints reales conservan contrato y autorización explícitos',()=>{
  const result=execFileSync(process.execPath,['scripts/check-http-contracts.mjs','--test-build'],{encoding:'utf8',timeout:30000})
  assert.match(result,/rutas verificadas/)
})

test('S3-15: salida audita solo la revocación efectiva y normaliza UPDATE RETURNING de TypeORM',async()=>{
 const id='11111111-1111-4111-8111-111111111111',events:unknown[]=[];let revoked=false
 const manager={query:async(sql:string,args:unknown[])=>{
  if(sql.includes('UPDATE public.user_token')){if(revoked)return[[],0];revoked=true;return[[{userId:id}],1]}
  if(sql.includes('INSERT INTO public.audit_log'))events.push(args)
  return[]
 }}
 const repository=new TypeormSessionRepository({connection:()=>({transaction:async(operation:(m:typeof manager)=>Promise<void>)=>operation(manager)})}as unknown as DatabaseService)
 await repository.revoke('never-log-the-session-hash');await repository.revoke('never-log-the-session-hash')
 assert.deepEqual(events,[[id,'LOGOUT','app_user',id]])
})
