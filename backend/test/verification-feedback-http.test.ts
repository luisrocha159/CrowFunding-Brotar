import 'reflect-metadata'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {BadRequestException,type ArgumentsHost} from '@nestjs/common'
import {VerificationController} from '../src/verifications/infrastructure/verification.controller'
import type {Verifications} from '../src/verifications/application/verifications'
import {validateSubmission,type VerificationSubmission} from '../src/verifications/domain/verification'
import type {Files} from '../src/files/application/files'
import type {DatabaseService} from '../src/shared/infrastructure/database/database.service'
import type {AuthenticatedRequest} from '../src/roles/infrastructure/roles-http'
import {ApiExceptionFilter} from '../src/shared/infrastructure/http/api-exception.filter'
import {LEGAL_VERSION} from '../src/legal/domain/legal-v2-20261109'

const policy={version:'mvp-demo-1.1-20261109',treatmentNotice:'Solo datos ficticios.',evidenceReference:'fixture',approvedBy:'equipo',approvedAt:'2026-11-09T00:00:00Z',fields:[{key:'name',label:'Nombre ficticio',required:true,maxLength:150}],documents:[],requiresAcceptance:true}

test('captura: el controlador y filtro HTTP conservan errores por campo y permiten guardar sin prefijo',async()=>{
 const cases={save:async(_actor:string,_id:string,_version:string,input:VerificationSubmission,submit:boolean)=>validateSubmission(policy,input,submit)} as unknown as Verifications
 const controller=new VerificationController(cases,{} as Files,{} as DatabaseService)
 const request={brotarUser:{id:'fixture'}} as AuthenticatedRequest
 const input={expectedVersion:'1',policyVersion:policy.version,legalVersion:LEGAL_VERSION,fields:{name:' '},documents:[],accepted:false,submit:true}
 let status=0,body:unknown
 const response={status(value:number){status=value;return this},json(value:unknown){body=value}}
 const host={switchToHttp:()=>({getResponse:()=>response})} as ArgumentsHost
 await assert.rejects(controller.save(request,'case',input),error=>{
  assert.ok(error instanceof BadRequestException)
  new ApiExceptionFilter().catch(error,host)
  assert.equal(status,400)
  assert.deepEqual(body,{statusCode:400,message:['name: Completa este campo obligatorio.','accepted: Confirma el tratamiento del expediente antes de enviarlo.']})
  return true
 })
 const valid=await controller.save(request,'case',{...input,fields:{name:'Persona ficticia'},submit:false})
 assert.equal(valid.fields.name,'Persona ficticia')
})
