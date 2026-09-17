import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readEnvironment } from '../src/config/environment'

test('usa valores locales seguros sin necesitar secretos', () => {
  const config = readEnvironment({})
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.port, 3000)
  assert.deepEqual(config.corsOrigins, ['http://127.0.0.1:5173', 'http://localhost:5173'])
})

for (const port of ['0', '-1', '65536', 'abc', '3000.5', '3000extra', '']) {
  test(`rechaza puerto inválido: ${JSON.stringify(port)}`, () => {
    assert.throws(() => readEnvironment({ PORT: port }), /PORT/)
  })
}

for (const origin of ['*', 'null', 'ftp://localhost', 'https://example.com/ruta', 'https://u:p@example.com', '']) {
  test(`rechaza origen CORS inválido: ${JSON.stringify(origin)}`, () => {
    assert.throws(() => readEnvironment({ CORS_ORIGINS: origin }), /CORS_ORIGINS/)
  })
}

test('valida modo, host y HTTPS en producción', () => {
  assert.throws(() => readEnvironment({ NODE_ENV: 'otro' }), /NODE_ENV/)
  assert.throws(() => readEnvironment({ HOST: 'invalid host' }), /HOST/)
  assert.throws(() => readEnvironment({ NODE_ENV: 'production' }), /HTTPS/)
  assert.equal(readEnvironment({ NODE_ENV: 'production', CORS_ORIGINS: 'https://brotar.example' }).nodeEnv, 'production')
})

test('elimina duplicados y espacios en orígenes configurados', () => {
  assert.deepEqual(readEnvironment({ CORS_ORIGINS: 'http://localhost:5173, http://localhost:5173 ' }).corsOrigins,
    ['http://localhost:5173'])
})
