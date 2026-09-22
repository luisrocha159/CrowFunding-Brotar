import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'

test('portada integrada: carga, persistencia PostgreSQL, nueva sesión y sustitución por campaña', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.port, 15433)
  assert.notEqual(process.env.NODE_ENV, 'production')
  const root = await mkdtemp(join(tmpdir(), 'brotar-cover-test-'))
  const originalRoot = process.env.FILE_STORAGE_DIR
  process.env.FILE_STORAGE_DIR = root
  const files: string[] = []
  const userIds: string[] = []
  const password = randomBytes(24).toString('hex')
  const email = `cover-${randomUUID()}@example.invalid`
  const admin = (sql: string) => execFileSync('docker', ['exec', '-i', 'brotar-provisional-v2-postgres-1',
    'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'],
  { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 })
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const call = (path: string, cookie: string, method = 'GET', body?: unknown) => fetch(`${base}/api/${path}`, {
    method, headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const login = async () => {
    const response = await call('auth/login', '', 'POST', { email, password })
    assert.equal(response.status, 200)
    return response.headers.get('set-cookie')!.split(';')[0]!
  }
  try {
    const registered = await call('auth/register', '', 'POST', { firstName: 'Prueba', lastName: 'Portada', email, password, demoConsent: true })
    assert.equal(registered.status, 201)
    const user = await registered.json() as { id: string }
    assert.match(user.id, /^[a-f0-9-]{36}$/)
    userIds.push(user.id)
    let cookie = await login()
    const campaigns: string[] = []
    for (const title of ['Portada integración uno', 'Portada integración dos']) {
      const created = await call('campaigns/drafts', cookie, 'POST', { title, summary: 'Prueba temporal de persistencia', campaignType: 'DONATION' })
      assert.equal(created.status, 201)
      campaigns.push((await created.json() as { id: string }).id)
    }
    // PNG de 1px válido, seguido de padding para ejercitar el parser de cargas >100KiB.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
    for (let index = 0; index < 2; index++) {
      const content = index === 0 ? Buffer.concat([png, Buffer.alloc(128 * 1024)]) : png
      const uploaded = await call('files', cookie, 'POST', { visibility: 'PUBLIC', purpose: 'CAMPAIGN_PUBLIC_IMAGE',
        originalName: `árbol-${index}.png`, mimeType: 'image/png', contentBase64: content.toString('base64') })
      assert.equal(uploaded.status, 201)
      const file = await uploaded.json() as { id: string }
      assert.match(file.id, /^[a-f0-9-]{36}$/)
      files.push(file.id)
      const saved = await call(`campaigns/drafts/${campaigns[0]}/cover`, cookie, 'PATCH', { fileId: file.id, altText: `Bosque de prueba número ${index}` })
      assert.equal(saved.status, 200)
      assert.equal((await saved.json() as { campaignId: string }).campaignId, campaigns[0])
      const downloaded = await call(`files/public/${file.id}`, '')
      assert.equal(downloaded.status, 200)
      assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), content)
      const stored = admin(`SELECT count(*) FROM campaign c JOIN file_asset f ON c.cover_file_id=f.id
        JOIN file_attachment a ON a.campaign_id=c.id AND a.file_id=f.id
        WHERE c.id='${campaigns[0]}' AND f.id='${file.id}' AND a.attachment_role='COVER';`).toString()
      assert.match(stored, /\b1\b/)
    }
    assert.equal((await call('auth/logout', cookie, 'POST', {})).status, 204)
    cookie = await login()
    const recovered = await call(`campaigns/drafts/${campaigns[0]}/cover`, cookie)
    assert.equal(recovered.status, 200)
    assert.equal((await recovered.json() as { fileId: string }).fileId, files[1])
    const separate = await call(`campaigns/drafts/${campaigns[1]}/cover`, cookie)
    assert.equal(separate.status, 200)
    assert.equal(await separate.text(), '')
    assert.equal((await call(`files/${files[0]}`, cookie, 'DELETE')).status, 204)
    assert.equal((await call(`files/public/${files[0]}`, '')).status, 404)
    assert.equal((await call(`files/${files[1]}`, cookie, 'DELETE')).status, 409)
  } finally {
    await app.close()
    for (const id of userIds) {
      admin(`DELETE FROM campaign WHERE creator_user_id='${id}';
        DELETE FROM file_asset WHERE uploaded_by='${id}';
        DELETE FROM app_user WHERE id='${id}';`)
    }
    for (const id of files) await rm(join(root, 'CAMPAIGN_PUBLIC_IMAGE', `${id}.bin`), { force: true })
    if (originalRoot === undefined) delete process.env.FILE_STORAGE_DIR
    else process.env.FILE_STORAGE_DIR = originalRoot
  }
})
