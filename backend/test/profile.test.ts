import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { InvalidProfile, ProfileUnavailable, Profiles, type ProfileRepository } from '../src/profiles/application/profile'

test('perfil: guarda solamente campos básicos y usa la identidad autenticada', async () => {
  const repository: ProfileRepository = {
    read: async () => null,
    save: async (id, input) => {
      assert.equal(id, 'own-user')
      assert.deepEqual(input, { firstName: 'Ana', lastName: 'Prueba', phoneCountryCode: '', phoneNumber: '' })
      return { ...input, email: 'own@example.invalid' }
    }
  }
  const result = await new Profiles(repository).save('own-user', { firstName: ' Ana ', lastName: ' Prueba ', phoneCountryCode: '', phoneNumber: '' })
  assert.equal(result.email, 'own@example.invalid')
})
test('perfil: teléfono incompleto no escribe y perfil ausente no inventa éxito', async () => {
  let writes = 0
  const profiles = new Profiles({ read: async () => null, save: async () => { writes++; return null } })
  await assert.rejects(profiles.save('own', { firstName: 'Ana', lastName: 'Prueba', phoneCountryCode: '+591', phoneNumber: '' }), InvalidProfile)
  assert.equal(writes, 0)
  await assert.rejects(profiles.read('own'), ProfileUnavailable)
  await assert.rejects(profiles.save('own', { firstName: 'Ana', lastName: 'Prueba', phoneCountryCode: '', phoneNumber: '' }), ProfileUnavailable)
})
