import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { reportCsv, ReportInvalid, validatePeriod } from '../src/finance/domain/report'
import { FinanceController, OperationsQueryDto, ReportFiltersDto } from '../src/finance/finance.module'
import { RoleGuard } from '../src/roles/infrastructure/roles-http'

test('S3-06: fechas reales e inclusivas, periodos ordenados y campos/estados/cursor estrictos',async()=>{
  for (const filters of [{},{from:'2024-02-29',to:'2024-02-29'},{from:'0001-01-01',to:'9999-12-31'}]) assert.doesNotThrow(()=>validatePeriod(filters))
  for (const filters of [{from:'2026-02-29'},{to:'2026-04-31'},{from:'0000-01-01'},{from:'ayer'},{from:'2026-02-01',to:'2026-01-31'}]) assert.throws(()=>validatePeriod(filters),ReportInvalid)
  const options={whitelist:true,forbidNonWhitelisted:true}
  for (const value of [{},{limit:'50',status:'DISPUTED',from:'2026-01-01'},{campaignId:'11111111-1111-4111-8111-111111111111'}]) assert.equal((await validate(plainToInstance(OperationsQueryDto,value),options)).length,0)
  for (const value of [{limit:'0'},{limit:'51'},{limit:'1e1'},{limit:'01'},{limit:['1','2']},{cursor:'no'},{status:'COMPLETED'},{userId:'ajeno'},{campaignId:'no'}]) assert.ok((await validate(plainToInstance(OperationsQueryDto,value),options)).length)
  assert.ok((await validate(plainToInstance(ReportFiltersDto,{cursor:'11111111-1111-4111-8111-111111111111'}),options)).length,'CSV no acepta paginación ni devuelve exportaciones parciales.')
})
test('S3-06: CSV UTF-8 entrecomilla delimitadores, comillas y saltos, neutraliza fórmulas sin cambiar importes',()=>{
  const csv=reportCsv([['nombre','importe'],['=HYPERLINK("evil")','0.30'],['  +cmd','999999999999.99'],['@SUM(1)','0.00'],['\ttexto','0.00'],['＝1+1','0.00'],['Texto, con "comillas"\ny Ñ','0.00']])
  assert.ok(csv.startsWith('\uFEFF"nombre","importe"\r\n'))
  for (const text of ["'=HYPERLINK", "'  +cmd", "'@SUM", "'\ttexto", "'＝1+1"]) assert.ok(csv.includes(text))
  assert.ok(csv.includes('"Texto, con ""comillas""\ny Ñ","0.00"'))
  assert.ok(csv.includes('"999999999999.99"'))
})
test('S3-06: lista y CSV comparten permiso de lectura y no ofrecen endpoints de mutación',()=>{
  assert.deepEqual(Reflect.getMetadata('brotar.requiredPermissions',FinanceController),['finance.read'])
  assert.ok(Reflect.getMetadata('__guards__',FinanceController).includes(RoleGuard))
  assert.equal(Reflect.getMetadata('method',FinanceController.prototype.list),0)
  assert.equal(Reflect.getMetadata('method',FinanceController.prototype.export),0)
})
