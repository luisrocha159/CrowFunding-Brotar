import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalRecoveryDelivery } from '../src/auth/infrastructure/local-recovery-delivery'
import { PasswordRecovery } from '../src/auth/application/password-recovery'

const env = { NODE_ENV: 'development', HOST: '127.0.0.1', PUBLIC_WEB_ORIGIN: 'http://127.0.0.1:5173', PASSWORD_RESET_LOCAL_FILE: 'true' }

test('buzón local exige activación explícita, desarrollo y orígenes locales', async () => {
  assert.equal(new LocalRecoveryDelivery(env).available(), true)
  for (const override of [{ NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { PASSWORD_RESET_LOCAL_FILE: 'false' }, { HOST: '0.0.0.0' }, { PUBLIC_WEB_ORIGIN: 'https://example.com' }, { PUBLIC_WEB_ORIGIN: 'http://user:pass@localhost' }]) {
    const delivery = new LocalRecoveryDelivery({ ...env, ...override })
    assert.equal(delivery.available(), false)
    await assert.rejects(delivery.send('demo@example.invalid', 'token'))
  }
})

test('guarda enlace solo en buzón y mantiene respuesta pública idéntica para cuenta existente o ausente', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'brotar-recovery-'))
  try {
    const delivery = new LocalRecoveryDelivery(env, directory)
    for (const issued of [true, false]) {
      const recovery = new PasswordRecovery({ issue: async () => issued, reset: async () => true },
        { hash: async () => 'hash' }, { hash: () => 'hash', create: () => ({ raw: 'test-token', hash: 'hash', expiresAt: new Date() }) }, false, delivery)
      assert.deepEqual(await recovery.request('demo@example.invalid'), { accepted: true })
    }
    const files = await readdir(directory)
    assert.equal(files.length, 1)
    const message = await readFile(join(directory, files[0]!), 'utf8')
    assert.match(message, /SOLO ENSAYO LOCAL/)
    assert.match(message, /http:\/\/127.0.0.1:5173\/recuperar-contrasena\?token=test-token/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
