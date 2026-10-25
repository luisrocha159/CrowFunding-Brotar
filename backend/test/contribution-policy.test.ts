import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Reflector } from '@nestjs/core'
import type { ExecutionContext } from '@nestjs/common'
import { Sessions } from '../src/auth/application/sessions'
import { RoleGuard } from '../src/roles/infrastructure/roles-http'
import { RoleAccess } from '../src/roles/application/roles'
import { PermissionAccess } from '../src/roles/application/permissions'
import { money, decimal, nextPaymentState, LedgerConflict, LedgerInvalid } from '../src/contributions/domain/payment'
import { ACCESS_POLICY, effectivePermissions } from '../src/roles/domain/access-policy'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ContributionPageDto } from '../src/contributions/contributions.module'

test('S3-18: consulta propia acotada, sin convertir fracciones, arrays ni filtros de otro usuario', async () => {
  const options={whitelist:true,forbidNonWhitelisted:true}
  for (const input of [{},{limit:'1'},{limit:'50',cursor:'11111111-1111-4111-8111-111111111111'}]) {
    assert.equal((await validate(plainToInstance(ContributionPageDto,input),options)).length,0)
  }
  for (const input of [{limit:'0'},{limit:'51'},{limit:'1.5'},{limit:'1e1'},{limit:'01'},{limit:' 2'},
    {limit:2},{limit:['1','2']},{cursor:''},{cursor:['11111111-1111-4111-8111-111111111111']},
    {cursor:'no-uuid'},{userId:'ajeno'},{status:'CONFIRMED'}]) {
    assert.ok((await validate(plainToInstance(ContributionPageDto,input),options)).length>0,JSON.stringify(input))
  }
})

test('S3-02: céntimos exactos y límites numeric(14,2), sin convertir números o redondear datos inválidos', () => {
  assert.equal(decimal(money('0.10')+money('0.20')),'0.30')
  assert.equal(decimal(money('999999999999.99')),'999999999999.99')
  for (const invalid of ['0','-1','1.001','1e2','NaN','Infinity',' 1','1,50','1000000000000','01.00',1,null,{},undefined]) assert.throws(() => money(invalid),LedgerInvalid)
  assert.equal(money('0',true),0n)
  assert.throws(() => decimal(-1n),LedgerInvalid)
  assert.throws(() => decimal(100000000000000n),LedgerInvalid)
})
test('S3-02: estados externos no desconfirman, ni reactivan fallidos/expirados ni simulan reembolsos', () => {
  assert.equal(nextPaymentState('INITIATED','PENDING'),'PENDING')
  assert.equal(nextPaymentState('PENDING','CONFIRMED'),'CONFIRMED')
  for (const state of ['PENDING','FAILED','EXPIRED','CONFIRMED'] as const) assert.equal(nextPaymentState('CONFIRMED',state),'CONFIRMED')
  assert.throws(() => nextPaymentState('EXPIRED','CONFIRMED'),LedgerConflict)
  assert.throws(() => nextPaymentState('FAILED','PENDING'),LedgerConflict)
  assert.throws(() => nextPaymentState('PENDING','REFUNDED' as never),LedgerInvalid)
  assert.equal(nextPaymentState('REFUNDED','CONFIRMED'),'REFUNDED')
  assert.equal(nextPaymentState('DISPUTED','PENDING'),'DISPUTED')
})
test('S3-16: responsabilidades separadas, administrador no equivale automáticamente a Finanzas/Soporte', () => {
  assert.deepEqual(ACCESS_POLICY['campaign.review.decide'].roles,['REVIEWER','ADMIN'])
  assert.deepEqual(ACCESS_POLICY['campaign.publish'].roles,['ADMIN'])
  assert.deepEqual(ACCESS_POLICY['finance.operate'].roles,['FINANCE'])
  assert.deepEqual(ACCESS_POLICY['support.resolve'].roles,['SUPPORT'])
  assert.deepEqual(effectivePermissions(['campaign.publish','campaign.review.read','unknown.write','campaign.review.read'],true),['campaign.review.read'])
  assert.deepEqual(effectivePermissions(['campaign.publish'],false),['campaign.publish'])
})

test('S3-16: guard sin requisitos deniega; requisitos vacíos, combinados y auditor no abren accesos por omisión', async () => {
  const handler=()=>{}, controller=class TestController {}
  let codes=['ADMIN']
  const guard=new RoleGuard({current:async()=>({id:'fixture'})} as unknown as Sessions,
    new RoleAccess({active:async()=>codes.map(code=>({code,name:code}))}),
    new PermissionAccess({granted:async()=>['campaign.publish']}),new Reflector())
  const request={headers:{},method:'GET'}
  const context={getHandler:()=>handler,getClass:()=>controller,switchToHttp:()=>({getRequest:()=>request})} as unknown as ExecutionContext
  await assert.rejects(guard.canActivate(context),/no declara autorización/)
  Reflect.defineMetadata('brotar.requiredPermissions',[],handler)
  await assert.rejects(guard.canActivate(context),/permiso/)
  Reflect.defineMetadata('brotar.requiredPermissions',['campaign.publish'],handler)
  assert.equal(await guard.canActivate(context),true)
  Reflect.defineMetadata('brotar.requiredRoles',['FINANCE'],handler)
  await assert.rejects(guard.canActivate(context),/rol requerido/)
  Reflect.defineMetadata('brotar.requiredRoles',['ADMIN'],handler)
  assert.equal(await guard.canActivate(context),true)
  codes=['ADMIN','AUDITOR'];request.method='POST'
  await assert.rejects(guard.canActivate(context),/auditor/)
})
