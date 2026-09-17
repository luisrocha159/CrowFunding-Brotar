import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOrganization, myOrganizations, myRoles, organizationTypes, validateOrganization } from '../src/features/organizations/organizationsClient'
import { SessionError } from '../src/features/access/session/sessionClient'

const types=[{id:'type-id',code:'NGO',name:'ONG'}]
const input={legalName:'Organización de prueba',tradeName:'Prueba',organizationTypeId:'type-id',contactEmail:'contact@example.invalid',contactPhone:''}
const organization={...input,id:'org-id',status:'DRAFT',typeName:'ONG',membershipRole:'OWNER'}
test('organización: nombres, catálogo y contacto se validan sin tipos inventados',()=>{
  assert.deepEqual(validateOrganization(input,types),{})
  assert.ok(validateOrganization({...input,legalName:' '},types).legalName)
  assert.ok(validateOrganization({...input,tradeName:'x'.repeat(201)},types).tradeName)
  assert.ok(validateOrganization({...input,organizationTypeId:'otro'},types).organizationTypeId)
  assert.ok(validateOrganization({...input,contactEmail:'incorrecto'},types).contactEmail)
  assert.ok(validateOrganization({...input,contactPhone:'texto'},types).contactPhone)
})
test('organizaciones y roles: contratos reales con cookies y carga permitida únicamente',async()=>{
  const original=globalThis.fetch
  try {
    globalThis.fetch=(async(url,init)=>{
      assert.equal(init?.credentials,'same-origin');assert.equal(init?.cache,'no-store')
      if(init?.method==='POST') {
        assert.equal((init.headers as Record<string,string>)['X-Brotar-Request'],'1')
        assert.deepEqual(JSON.parse(String(init.body)),input)
        return Response.json(organization,{status:201})
      }
      if(String(url).endsWith('/types')) return Response.json(types)
      if(String(url).endsWith('/roles')) return Response.json({roles:[{code:'REGISTERED_USER',name:'Usuario registrado'}]})
      return Response.json([organization])
    }) as typeof fetch
    assert.deepEqual(await createOrganization({...organization,contactEmail:' CONTACT@example.invalid '}),organization)
    assert.deepEqual(await myOrganizations(),[organization])
    assert.deepEqual(await organizationTypes(),types)
    assert.deepEqual(await myRoles(),[{code:'REGISTERED_USER',name:'Usuario registrado'}])
  } finally {globalThis.fetch=original}
})
test('organizaciones: fallos y contratos incompletos no se convierten en listas vacías ni éxito',async()=>{
  const original=globalThis.fetch
  try {
    for(const status of [400,401,403,429,503]) {
      globalThis.fetch=(async()=>new Response(null,{status})) as typeof fetch
      await assert.rejects(createOrganization(input),(error:unknown)=>error instanceof SessionError&&error.status===status)
    }
    globalThis.fetch=(async()=>Response.json({})) as typeof fetch
    for(const read of [myOrganizations,myRoles,organizationTypes]) await assert.rejects(read(),SessionError)
    await assert.rejects(createOrganization(input),SessionError)
    globalThis.fetch=(async()=>{throw new TypeError('network')}) as typeof fetch
    await assert.rejects(myOrganizations(),SessionError)
  } finally {globalThis.fetch=original}
})
