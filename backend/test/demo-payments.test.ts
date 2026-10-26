import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { isDemoEnabled, compareSettlement, reason, reconciliationPeriod, requestKey, settlementTotal } from '../src/demo-payments/domain/demo'
import { CheckoutDto, CloseDto, ConsentDto, DemoPaymentsController, DemoReconciliationController, ExpirationDto, PendingReconciliationDto, ReconciliationDto, ResolutionDto, SimulationDto } from '../src/demo-payments/demo-payments.module'
import { SessionMutationGuard } from '../src/auth/infrastructure/http/session-http'
import { ReportInvalid } from '../src/finance/domain/report'
import { LedgerInvalid } from '../src/contributions/domain/payment'

const options={whitelist:true,forbidNonWhitelisted:true}
const validCheckout={campaignId:randomUUID(),requestKey:randomUUID(),amount:'0.30',currencyCode:'BOB',demoConsent:true}

test('S3-07: consulta de pendientes exige período, moneda y paginación cerrados sin convertir tipos',async()=>{
  const input={from:'2026-10-01',to:'2026-10-21',currencyCode:'BOB',limit:'20'}
  assert.equal((await validate(plainToInstance(PendingReconciliationDto,input),options)).length,0)
  for(const extra of [{limit:20},{limit:'0'},{limit:'51'},{limit:['1','2']},{currencyCode:['BOB']},{currencyCode:'bob'},{from:''},{cursor:'not-uuid'},{actorId:randomUUID()}]) {
    assert.ok((await validate(plainToInstance(PendingReconciliationDto,{...input,...extra}),options)).length)
  }
  assert.ok((await validate(plainToInstance(PendingReconciliationDto,{}),options)).length)
})

test('S3-01: DEMO requiere true explícito, nunca producción ni entornos desconocidos',()=>{
  for (const env of [{},{DEMO_PAYMENTS_ENABLED:'false'},{DEMO_PAYMENTS_ENABLED:'TRUE'},
    {DEMO_PAYMENTS_ENABLED:'true',NODE_ENV:'production'},{DEMO_PAYMENTS_ENABLED:'true',NODE_ENV:'staging'}]) assert.equal(isDemoEnabled(env),false)
  for (const NODE_ENV of ['test','development',undefined]) assert.equal(isDemoEnabled({NODE_ENV,DEMO_PAYMENTS_ENABLED:'true'}),true)
})
test('S3-02: checkout conserva importes string, consentimiento y límites; no acepta estado, actor, proveedor ni referencia del cliente',async()=>{
  for (const input of [validCheckout,{...validCheckout,rewardId:null},{...validCheckout,rewardId:randomUUID()}]) assert.equal((await validate(plainToInstance(CheckoutDto,input),options)).length,0)
  for (const extra of [{amount:1},{amount:'1e2'},{amount:'1.001'},{amount:'1000000000000'},{amount:'01'},
    {currencyCode:'bob'},{demoConsent:'true'},{demoConsent:false},{rewardId:''},{requestKey:'not-uuid'},
    {userId:randomUUID()},{providerId:randomUUID()},{status:'CONFIRMED'},{externalReference:'bank'},{feeAmount:'0'}]) {
    assert.ok((await validate(plainToInstance(CheckoutDto,{...validCheckout,...extra}),options)).length,JSON.stringify(extra))
  }
  assert.ok((await validate(plainToInstance(CheckoutDto,{}),options)).length)
})
test('S3-01/07: comandos cerrados de simulación, expiración, cierre y resolución',async()=>{
  assert.equal((await validate(plainToInstance(SimulationDto,{requestKey:randomUUID(),outcome:'CONFIRMED'}),options)).length,0)
  assert.equal((await validate(plainToInstance(ConsentDto,{requestKey:randomUUID(),demoConsent:true}),options)).length,0)
  assert.equal((await validate(plainToInstance(ReconciliationDto,{from:'2026-10-01',to:'2026-10-21',currencyCode:'BOB',requestKey:randomUUID()}),options)).length,0)
  assert.equal((await validate(plainToInstance(ResolutionDto,{action:'RECHECK',reason:'Evidencia contrastada en la prueba local.'}),options)).length,0)
  for (const input of [{limit:0},{limit:101},{limit:1.5},{limit:'10'},{limit:[1,2]}]) assert.ok((await validate(plainToInstance(ExpirationDto,input),options)).length)
  for (const input of [{outcome:'REFUNDED'},{outcome:'CONFIRMED',amount:'10'},{outcome:['CONFIRMED']}]) assert.ok((await validate(plainToInstance(SimulationDto,{requestKey:randomUUID(),...input}),options)).length)
  for (const input of [{confirmed:false},{confirmed:'true'},{confirmed:true,force:true},{}]) assert.ok((await validate(plainToInstance(CloseDto,input),options)).length)
  for (const input of [{action:'IGNORE',reason:'Motivo lo suficientemente largo.'},{action:'RECHECK',reason:' '},{action:'RECHECK',reason:'x'.repeat(501)}]) assert.ok((await validate(plainToInstance(ResolutionDto,input),options)).length)
})
test('S3-07: todos los tipos de diferencia y repetición de avisos sin doble contabilización',()=>{
  const a={paymentId:randomUUID(),reference:'DEMO-a',amount:'0.30'},b={paymentId:randomUUID(),reference:'DEMO-b',amount:'0.20'}
  assert.equal(compareSettlement([a],[a,a,{...a,amount:'0.3'}])[0]!.classification,'MATCHED')
  assert.equal(compareSettlement([],[a])[0]!.classification,'MISSING_INTERNAL')
  assert.equal(compareSettlement([a],[])[0]!.classification,'MISSING_PROVIDER')
  assert.equal(compareSettlement([a],[{...a,amount:'0.31'}])[0]!.classification,'AMOUNT_MISMATCH')
  assert.equal(compareSettlement([a],[a,{...a,paymentId:b.paymentId}])[0]!.classification,'DUPLICATED')
  assert.equal(compareSettlement([a],[{...a,paymentId:b.paymentId}])[0]!.classification,'DUPLICATED')
  assert.equal(compareSettlement([],[a,a])[0]!.providerAmount,'0.30')
  assert.deepEqual(compareSettlement([],[]),[])
  assert.equal(settlementTotal(['0.10','0.20']),'0.30')
  assert.equal(settlementTotal(['999999999999.99','999999999999.99']),'1999999999999.98')
  assert.throws(()=>compareSettlement([],Array.from({length:501},(_,i)=>({...a,reference:`${i}`}))),LedgerInvalid)
})
test('S3-07: fechas reales, período acotado, razones legibles y claves v4',()=>{
  assert.doesNotThrow(()=>reconciliationPeriod('2026-10-01','2026-10-31','BOB'))
  assert.doesNotThrow(()=>reconciliationPeriod('2024-02-29','2024-03-01','BOB'))
  for (const [from,to] of [['2026-02-29','2026-03-01'],['2026-10-21','2026-10-20'],['2026-10-01','2026-11-01']]) {
    assert.throws(()=>reconciliationPeriod(from!,to!,'BOB'),error=>error instanceof LedgerInvalid || error instanceof ReportInvalid)
  }
  assert.throws(()=>reconciliationPeriod('2026-10-01','2026-10-21','bob'),LedgerInvalid)
  assert.throws(()=>reconciliationPeriod(undefined as never,'2026-10-21','BOB'),LedgerInvalid)
  for (const value of ['', ' '.repeat(25), 'Motivo válido con\u200bcontrol oculto','x'.repeat(501)]) assert.throws(()=>reason(value),LedgerInvalid)
  assert.equal(reason('  Un motivo válido para la resolución.  '),'Un motivo válido para la resolución.')
  requestKey(randomUUID());assert.throws(()=>requestKey('11111111-1111-1111-8111-111111111111'),LedgerInvalid)
})
test('S3-01/07: rutas de escritura exigen sesión, consentimiento CSRF y permiso, Finanzas no se reemplaza por ADMIN',()=>{
  assert.deepEqual(Reflect.getMetadata('brotar.requiredPermissions',DemoPaymentsController),['contribution.write.own'])
  assert.deepEqual(Reflect.getMetadata('brotar.requiredPermissions',DemoReconciliationController),['finance.read'])
  for (const method of ['create','resolve','close','expire'] as const) {
    assert.deepEqual(Reflect.getMetadata('brotar.requiredPermissions',DemoReconciliationController.prototype[method]),['finance.operate'])
    assert.ok(Reflect.getMetadata('__guards__',DemoReconciliationController.prototype[method]).includes(SessionMutationGuard))
  }
})
