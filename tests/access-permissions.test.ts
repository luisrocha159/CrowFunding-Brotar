import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { canAccess, permissionsFrom } from '../src/features/access/session/accessPermissions'

test('contrato de permisos: tipos estrictos, lectura explícita y sin duplicar capacidades', () => {
  assert.deepEqual(permissionsFrom({ permissions:['campaign.review.read','campaign.review.read'],readOnly:true }),{ permissions:['campaign.review.read'],readOnly:true })
  for (const value of [null,{}, { permissions:'ADMIN',readOnly:false },{ permissions:[true],readOnly:false },{ permissions:[],readOnly:'false' }]) assert.throws(() => permissionsFrom(value))
  assert.equal(canAccess(null,'campaign.publish'),false)
  const reader={permissions:['campaign.review.read','campaign.publish'],readOnly:true}
  assert.equal(canAccess(reader,'campaign.review.read'),true)
  assert.equal(canAccess(reader,'campaign.publish'),false)
  assert.equal(canAccess({...reader,readOnly:false},'campaign.publish'),true)
})
