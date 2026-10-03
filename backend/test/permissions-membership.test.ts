import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  RESPONSIBILITY_ROLES, deniesMutation, grantsResponsibility, hasRequiredPermissions, mutates
} from '../src/roles/domain/responsibility'
import { PermissionAccess } from '../src/roles/application/permissions'
import { allowsMembership, ORGANIZATION_MANAGERS } from '../src/organizations/domain/membership'
import { Memberships } from '../src/organizations/application/memberships'

test('BG-53 separa las ocho responsabilidades y no las concede por registro público', () => {
  assert.deepEqual([...RESPONSIBILITY_ROLES].sort(), [
    'ADMIN', 'AUDITOR', 'COMPLIANCE', 'CREATOR', 'FINANCE', 'REVIEWER', 'SPONSOR', 'SUPPORT'
  ])
  assert.equal(new Set(RESPONSIBILITY_ROLES).size, RESPONSIBILITY_ROLES.length)
  // El registro público solo entrega REGISTERED_USER, que no es una responsabilidad.
  assert.equal(grantsResponsibility(['REGISTERED_USER']), false)
  assert.equal(grantsResponsibility(['REGISTERED_USER', 'CREATOR']), true)
})

test('el auditor queda en lectura aunque acumule otros roles', () => {
  for (const method of ['POST', 'put', 'PATCH', 'delete']) assert.equal(mutates(method), true)
  for (const method of ['GET', 'head', 'OPTIONS']) assert.equal(mutates(method), false)

  assert.equal(deniesMutation(['AUDITOR'], 'GET'), false, 'El auditor sí lee.')
  assert.equal(deniesMutation(['AUDITOR'], 'POST'), true)
  assert.equal(deniesMutation(['AUDITOR', 'ADMIN'], 'POST'), true, 'Acumular roles no levanta la restricción.')
  assert.equal(deniesMutation(['ADMIN'], 'POST'), false)
  assert.equal(deniesMutation([], 'POST'), false, 'Sin roles decide la exigencia de rol, no esta regla.')
})

test('los permisos exigidos deben estar concedidos y un requisito vacío deniega', async () => {
  assert.equal(hasRequiredPermissions(['campaign.read'], ['campaign.read']), true)
  assert.equal(hasRequiredPermissions(['campaign.read'], ['campaign.write']), false)
  assert.equal(hasRequiredPermissions(['campaign.read'], ['campaign.read', 'campaign.write']), false)
  assert.equal(hasRequiredPermissions([], ['campaign.read']), false)
  assert.equal(hasRequiredPermissions(['campaign.read'], []), false, 'Sin requisito declarado no se abre el endpoint.')

  const access = new PermissionAccess({ granted: async (id) => id === 'own' ? ['campaign.read'] : [] })
  assert.equal(await access.allows('own', ['campaign.read']), true)
  assert.equal(await access.allows('own', ['campaign.write']), false)
  assert.equal(await access.allows('other', ['campaign.read']), false)
})

test('la pertenencia se resuelve contra el rol almacenado, no contra la interfaz', async () => {
  assert.equal(allowsMembership(null, ORGANIZATION_MANAGERS), false, 'Sin membresía vigente se deniega.')
  assert.equal(allowsMembership('MEMBER', ORGANIZATION_MANAGERS), false)
  assert.equal(allowsMembership('OWNER', ORGANIZATION_MANAGERS), true)
  assert.equal(allowsMembership('OWNER', []), false)

  const memberships = new Memberships({
    roleOf: async (userId, organizationId) =>
      userId === 'own' && organizationId === 'org' ? 'ADMIN' : null
  })
  assert.equal(await memberships.manages('own', 'org'), true)
  assert.equal(await memberships.manages('own', 'otra'), false, 'Otra organización no hereda la membresía.')
  assert.equal(await memberships.manages('ajeno', 'org'), false)
  assert.equal(await memberships.allows('own', 'org', ['OWNER']), false, 'ADMIN no es OWNER.')
})
