import {test} from 'node:test'
import assert from 'node:assert/strict'
import type {EntityManager} from 'typeorm'
import {attachAccountContacts} from '../src/shared/infrastructure/database/account-contacts'

test('cuentas vinculadas: una lectura parametrizada, sin inventar contactos ni devolver secretos',async()=>{
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',calls:{sql:string;args:unknown[]}[]=[]
 const reader={query:async(sql:string,args:unknown[])=>{calls.push({sql,args});return[{id:a,name:'Ana Ñúñez',email:'ana@example.invalid',password:'NO_DEVOLVER'}]}} as unknown as EntityManager
 const result=await attachAccountContacts(reader,[{actorId:a,ownerId:b},{actorId:a,ownerId:null}],{actorContact:'actorId',ownerContact:'ownerId'})
 assert.equal(calls.length,1);assert.match(calls[0]!.sql,/ANY\(\$1::uuid\[\]\)/);assert.deepEqual(calls[0]!.args,[[a,b]])
 assert.deepEqual(result[0]!.actorContact,{name:'Ana Ñúñez',email:'ana@example.invalid'});assert.equal(result[0]!.ownerContact,null);assert.equal(result[1]!.ownerContact,null)
 assert.ok(!JSON.stringify(result).includes('NO_DEVOLVER'));assert.equal(result[0]!.actorId,a)
 await attachAccountContacts(reader,[{actorId:null}],{actorContact:'actorId'});assert.equal(calls.length,1,'Sin actor no se consulta ni se le atribuye una cuenta')
})
