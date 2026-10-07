import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { canEnableCreator, CreatorAdministration, CreatorGrantConflict, ManagedUserMissing, type ManagedUser } from '../src/roles/application/creator-administration'
import { CreatorAdministrationController, EnableCreatorDto } from '../src/roles/infrastructure/creator-administration.controller'
import { RoleGuard } from '../src/roles/infrastructure/roles-http'
import { SessionMutationGuard } from '../src/auth/infrastructure/http/session-http'

const user: ManagedUser = { id: 'user', email: 'user@example.invalid', name: 'Usuario', status: 'PENDING_VERIFICATION', locked: false, roles: ['REGISTERED_USER'] }
test('CREATOR provisional: no requiere inventar KYC, pero respeta bloqueo y roles', () => {
  assert.equal(canEnableCreator(user), true)
  for (const patch of [{ locked: true }, { status: 'SUSPENDED' }, { roles: [] }, { roles: ['REGISTERED_USER', 'AUDITOR'] }]) assert.equal(canEnableCreator({ ...user, ...patch }), false)
})
test('CREATOR provisional: consulta normalizada, motivo obligatorio y actor del servidor', async () => {
  const service = new CreatorAdministration({
    find: async email => { assert.equal(email, user.email); return user },
    grant: async (actorId, userId, reason) => { assert.deepEqual([actorId, userId, reason], ['admin', 'user', 'Ensayo local']); return { id: userId, role: 'CREATOR', created: true, provisional: true } }
  })
  assert.equal((await service.find(' USER@EXAMPLE.INVALID ')).provisional, true)
  assert.equal((await service.grant('admin', 'user', ' Ensayo local ')).created, true)
  for (const reason of ['', ' ', '\u0000', 'a'.repeat(501)]) assert.throws(() => service.grant('admin', 'user', reason), CreatorGrantConflict)
  await assert.rejects(() => new CreatorAdministration({ find: async () => null, grant: async () => { throw new Error() } }).find('missing@example.invalid'), ManagedUserMissing)
})
test('CREATOR provisional: guardias ADMIN/CSRF y confirmación explícita, no roles arbitrarios', async () => {
  assert.deepEqual(Reflect.getMetadata('brotar.requiredRoles', CreatorAdministrationController), ['ADMIN'])
  assert.ok(Reflect.getMetadata('__guards__', CreatorAdministrationController).includes(RoleGuard))
  assert.ok(Reflect.getMetadata('__guards__', CreatorAdministrationController.prototype.grant).includes(SessionMutationGuard))
  for (const confirmed of [false, 'true', undefined]) assert.ok((await validate(plainToInstance(EnableCreatorDto, { confirmed, reason: 'Ensayo' }))).length > 0)
  assert.equal((await validate(plainToInstance(EnableCreatorDto, { confirmed: true, reason: 'Ensayo' }))).length, 0)
})
