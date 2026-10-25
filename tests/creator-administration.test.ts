import assert from 'node:assert/strict'
import { test } from 'node:test'
import { enableCreator, findManagedUser, managedUserFrom } from '../src/features/organizations/creatorAdministrationClient'
import { SessionError } from '../src/shared/api/sessionError'
import { authenticatedContinuation, publicContinuation } from '../src/features/access/navigation'

const user = { id: 'test-user', email: 'user@example.invalid', name: 'Usuario', status: 'PENDING_VERIFICATION', locked: false, roles: ['REGISTERED_USER'], canEnableCreator: true, provisional: true }
test('habilitación: continuación administrativa solo tras login, sin redirección externa', () => {
  assert.equal(authenticatedContinuation('/administracion/usuarios'), '/administracion/usuarios')
  assert.equal(publicContinuation('/administracion/usuarios'), '/explorar')
  assert.equal(authenticatedContinuation('https://example.invalid/administracion/usuarios'), '/explorar')
})
test('habilitación: consulta codificada y contrato provisional sin verificación simulada', async () => {
  const send = (async (url, init) => {
    assert.equal(url, '/api/admin/users?email=user%40example.invalid')
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'same-origin')
    return Response.json(user)
  }) as typeof fetch
  assert.deepEqual(await findManagedUser(' USER@EXAMPLE.INVALID ', undefined, send), user)
  for (const patch of [{ provisional: false }, { roles: null }, { locked: 'false' }, { canEnableCreator: undefined }, { id: 4 }]) assert.throws(() => managedUserFrom({ ...user, ...patch }), SessionError)
})
test('habilitación: solo CREATOR, confirmación y origen protegido; no acepta éxito falso', async () => {
  const send = (async (url, init) => {
    assert.equal(url, '/api/admin/users/test-user/creator')
    assert.equal(init?.method, 'POST')
    assert.equal((init?.headers as Record<string, string>)['X-Brotar-Request'], '1')
    assert.deepEqual(JSON.parse(init?.body as string), { confirmed: true, reason: 'Ensayo' })
    return Response.json({ id: user.id, role: 'CREATOR', created: true, provisional: true })
  }) as typeof fetch
  assert.deepEqual(await enableCreator(user.id, ' Ensayo ', undefined, send), { created: true })
  await assert.rejects(() => enableCreator(user.id, 'Ensayo', undefined, (async () => Response.json({ id: user.id, role: 'ADMIN', created: true, provisional: true })) as typeof fetch), SessionError)
  await assert.rejects(() => findManagedUser(user.email, undefined, (async () => new Response('', { status: 403 })) as typeof fetch), SessionError)
})
