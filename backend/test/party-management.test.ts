import 'reflect-metadata'
import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {validate} from 'class-validator'
import type {EntityManager} from 'typeorm'
import {assertMutation,partyActor,partyVersion} from '../src/verifications/infrastructure/party-mutations'
import {MemberMutationDto} from '../src/verifications/infrastructure/organization-management.controller'
import {PartyUpdateDto} from '../src/verifications/infrastructure/party-administration.controller'
const reason='Motivo explícito para la prueba.'
test('mutaciones: confirmación, motivo, acciones y UUID son obligatorios',async()=>{
 for(const input of [{confirmed:false,reason},{confirmed:true,reason:'corto'}])assert.throws(()=>assertMutation({...input,expectedVersion:'0'}))
 const member=Object.assign(new MemberMutationDto(),{action:'ADD',userId:'bad',role:'SYSTEM_ADMIN',reason,confirmed:true,expectedVersion:'0'})
 assert.ok((await validate(member)).length>=2)
 member.userId='3cfd2859-d51b-4de0-aad2-e581e7ce1643';member.role='MEMBER';assert.deepEqual(await validate(member),[])
 const user=Object.assign(new PartyUpdateDto(),{action:'CLOSE',confirmed:false,expectedVersion:'0',reason,websiteUrl:'javascript:alert(1)'})
 assert.ok((await validate(user)).length>=3)
})
test('actor: AUDITOR conserva solo lectura incluso combinado con ADMIN',async()=>{
 const manager={query:async()=>[{code:'REGISTERED_USER'},{code:'ADMIN'},{code:'AUDITOR'}]} as unknown as EntityManager
 await assert.rejects(partyActor(manager,'actor',true));await assert.rejects(partyActor(manager,'actor',false))
 await partyActor(manager,'actor',true,false)
 const revoked={query:async()=>[]} as unknown as EntityManager
 await assert.rejects(partyActor(revoked,'actor',true));await assert.rejects(partyActor(revoked,'actor',false))
})
test('version: no aplica cambios sobre una versión obsoleta',async()=>{
 const queries:string[]=[]
 const manager={query:async(sql:string)=>{queries.push(sql);return [{version:'2',restore_status:null}]}} as unknown as EntityManager
 await assert.rejects(partyVersion(manager,'USER','id','1'))
 assert.ok(queries[1]?.includes('FOR UPDATE'))
 assert.deepEqual(await partyVersion(manager,'USER','id','2'),{version:'2',restore_status:null})
})

// Administrative edits preserve the same personal-name policy as registration/profile.
test('terceros: nombres personales y motivos no admiten números, HTML ni controles ocultos',async()=>{
 for(const name of ['12345','<b>Nombre</b>','Nombre\u0000oculto','Nombre\u200Boculto']){
  const user=Object.assign(new PartyUpdateDto(),{action:'UPDATE',confirmed:true,expectedVersion:'0',reason,firstName:name,lastName:'Apellido'})
  assert.ok((await validate(user)).length,`Nombre inválido admitido: ${JSON.stringify(name)}`)
 }
 const valid=Object.assign(new PartyUpdateDto(),{action:'UPDATE',confirmed:true,expectedVersion:'0',reason,firstName:'Ñusta María',lastName:'Núñez del Prado'})
 assert.deepEqual(await validate(valid),[])
 for(const field of ['displayName','city'])for(const invalid of ['<b>Contenido</b>','Contenido\u0000oculto','Contenido\u200Boculto','!!!!!!!!']){
  const user=Object.assign(new PartyUpdateDto(),{action:'UPDATE',confirmed:true,expectedVersion:'0',reason,firstName:'Ñusta María',lastName:'Núñez',[field]:invalid})
  assert.ok((await validate(user)).length,`Campo opcional inválido admitido: ${field}`)
 }
 for(const invalid of ['<b>Motivo demasiado general</b>','!!!!!!!!!!!!','Motivo\u0001con control'])assert.throws(()=>assertMutation({confirmed:true,expectedVersion:'0',reason:invalid}))
})


test('S3-14: altas y promoción ADMIN requieren aceptación; vencimiento y versión no reactivan una invitación',async()=>{
 const {requiresInvitation,assertInvitationPending}=await import('../src/verifications/domain/organization-invitation')
 assert.equal(requiresInvitation('ADD','MEMBER'),true);assert.equal(requiresInvitation('ADD','ADMIN'),true);assert.equal(requiresInvitation('CHANGE','ADMIN'),true)
 assert.equal(requiresInvitation('REMOVE','ADMIN'),false);assert.equal(requiresInvitation('CHANGE','MEMBER'),false)
 assert.doesNotThrow(()=>assertInvitationPending({status:'PENDING',version:1,expired:false},'1'))
 for(const row of [{status:'ACCEPTED',version:1,expired:false},{status:'PENDING',version:2,expired:false},{status:'PENDING',version:1,expired:true}])assert.throws(()=>assertInvitationPending(row,'1'))
})
