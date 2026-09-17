import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { RoleAccess } from '../src/roles/application/roles'
import { Organizations, type OrganizationRepository } from '../src/organizations/application/organizations'

test('roles: autorización exige los roles almacenados y no concede acceso con requisitos vacíos', async () => {
  const access = new RoleAccess({ active: async id => id==='own' ? [{ code:'REGISTERED_USER',name:'Usuario registrado' }] : [] })
  assert.equal(await access.allows('own',['REGISTERED_USER']),true)
  assert.equal(await access.allows('own',['ADMIN']),false)
  assert.equal(await access.allows('own',['REGISTERED_USER','CREATOR']),false)
  assert.equal(await access.allows('other',['REGISTERED_USER']),false)
  assert.equal(await access.allows('own',[]),false)
})
test('organizaciones: normaliza contacto y conserva la identidad autenticada sin campos extra', async () => {
  const repository: OrganizationRepository = {
    types: async()=>[], list: async()=>[], find: async()=>null,
    create: async(id,input)=>{
      assert.equal(id,'own')
      assert.deepEqual(input,{legalName:'Fundación Prueba',tradeName:'Prueba',organizationTypeId:'type',contactEmail:'contact@example.invalid',contactPhone:''})
      return {...input,id:'org',status:'DRAFT',typeName:'Fundación',membershipRole:'OWNER'}
    }
  }
  const result=await new Organizations(repository).create('own',{legalName:' Fundación Prueba ',tradeName:' Prueba ',organizationTypeId:'type',contactEmail:' CONTACT@example.invalid ',contactPhone:''})
  assert.equal(result.status,'DRAFT')
})
