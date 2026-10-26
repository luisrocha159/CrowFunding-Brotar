import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { staffChange, StaffRoleConflict, StaffRoleDenied, STAFF_ROLES } from '../src/roles/domain/staff-role'
import { StaffAdministrationController, StaffChangeDto } from '../src/roles/infrastructure/staff-administration.controller'
import { RoleGuard } from '../src/roles/infrastructure/roles-http'
import { SessionMutationGuard } from '../src/auth/infrastructure/http/session-http'

test('responsabilidades: lista cerrada, no autoasignación ni ADMIN por formulario, motivo acotado', () => {
  for (const role of STAFF_ROLES) assert.deepEqual(staffChange('actor', 'target', role, ' Motivo del ensayo '), { role, reason: 'Motivo del ensayo' })
  assert.throws(() => staffChange('actor', 'actor', 'FINANCE', 'Motivo del ensayo'), StaffRoleDenied)
  for (const role of ['ADMIN', 'CREATOR', 'REGISTERED_USER', 'finance', '']) assert.throws(() => staffChange('actor', 'target', role, 'Motivo del ensayo'), StaffRoleConflict)
  for (const reason of ['', 'a'.repeat(9), 'a'.repeat(501), 'Motivo\u0000 del ensayo', 'Motivo\n del ensayo']) assert.throws(() => staffChange('actor', 'target', 'FINANCE', reason), StaffRoleConflict)
})
test('responsabilidades: contrato exige sesión, ADMIN, permiso, CSRF y confirmación exacta', async () => {
  assert.deepEqual(Reflect.getMetadata('brotar.requiredRoles', StaffAdministrationController), ['ADMIN'])
  assert.deepEqual(Reflect.getMetadata('brotar.requiredPermissions', StaffAdministrationController), ['roles.manage'])
  const guards = Reflect.getMetadata('__guards__', StaffAdministrationController)
  assert.ok(guards.includes(RoleGuard)); assert.ok(guards.includes(SessionMutationGuard))
  const valid = { role: 'FINANCE', operation: 'GRANT', confirmed: true, reason: 'Motivo de prueba' }
  assert.equal((await validate(plainToInstance(StaffChangeDto, valid))).length, 0)
  for (const patch of [{ role: 'ADMIN' }, { operation: 'DELETE' }, { confirmed: 'true' }, { confirmed: false }, { reason: 'corto' }]) {
    assert.ok((await validate(plainToInstance(StaffChangeDto, { ...valid, ...patch }))).length)
  }
})
