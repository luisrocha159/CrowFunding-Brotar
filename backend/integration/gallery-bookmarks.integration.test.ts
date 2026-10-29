import 'reflect-metadata'
import assert from 'node:assert/strict'
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
import { readTestDatabaseTarget } from './database-target'
import type { Gallery } from '../src/campaign-drafts/application/gallery'

test('S3 galería/guardadas: PostgreSQL real, propiedad, concurrencia, nueva sesión y novedades', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true')
  assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', timeout: 10000 }).trim()
  const root = await mkdtemp(join(tmpdir(), 'brotar-s3-test-'))
  const originalRoot = process.env.FILE_STORAGE_DIR
  process.env.FILE_STORAGE_DIR = root
  const users: { id: string; email: string; password: string; cookie: string }[] = []
  const fileIds: { id: string; purpose: string }[] = []
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}/api/${path}`, {
    method, headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const json = async <T>(response: Response, expected = 200): Promise<T> => { const body: unknown = await response.json(); assert.equal(response.status, expected, JSON.stringify(body)); return body as T }
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
  try {
    for (let index = 0; index < 2; index++) {
      const email = `s3-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('hex')
      const user = await json<{ id: string }>(await call('auth/register', '', { legalVersion:'mvp-demo-legal-1.0-20261028', firstName: 'Ensayo', lastName: 'Sprint Tres', email, password, demoConsent: true }), 201)
      assert.match(user.id, /^[a-f0-9-]{36}$/)
      const login = await call('auth/login', '', { email, password }); assert.equal(login.status, 200)
      users.push({ id: user.id, email, password, cookie: login.headers.get('set-cookie')!.split(';')[0]! })
    }
    const [owner, other] = users as [typeof users[number], typeof users[number]]
    const draft = await json<{ id: string }>(await call('campaigns/drafts', owner.cookie, { title: 'Galería de ensayo Sprint tres', summary: 'Prueba temporal de galería y listas', campaignType: 'DONATION' }), 201)
    assert.match(draft.id, /^[a-f0-9-]{36}$/)
    const path = `campaigns/drafts/${draft.id}/gallery`
    assert.equal((await call(path)).status, 401)
    assert.equal((await call(path, other.cookie)).status, 404)
    assert.equal((await call(`campaigns/public/${draft.id}/gallery`)).status, 404)
    for (const [cookie, purpose, visibility] of [[owner.cookie, 'CAMPAIGN_PUBLIC_IMAGE', 'PUBLIC'], [owner.cookie, 'CAMPAIGN_PUBLIC_IMAGE', 'PUBLIC'], [other.cookie, 'CAMPAIGN_PUBLIC_IMAGE', 'PUBLIC'], [owner.cookie, 'ORGANIZATION_DOCUMENT', 'PRIVATE']] as const) {
      const result = await json<{ id: string }>(await call('files', cookie, { visibility, purpose, originalName: 'ensayo.png', mimeType: 'image/png', contentBase64: png }), 201)
      assert.match(result.id, /^[a-f0-9-]{36}$/); fileIds.push({ ...result, purpose })
    }
    let gallery = await json<Gallery>(await call(path, owner.cookie))
    const image = (index: number) => ({ fileId: fileIds[index]!.id, caption: `Recurso público ${index}` })
    for (const index of [2, 3]) assert.equal((await call(path, owner.cookie, { ...gallery, images: [image(index)] }, 'PUT')).status, 404)
    assert.equal((await call(path, owner.cookie, { ...gallery, videoUrl: 'https://example.com/video' }, 'PUT')).status, 400)
    assert.equal((await call(path, owner.cookie, { ...gallery, images: [image(0), image(0)] }, 'PUT')).status, 400)
    assert.equal((await call(path, owner.cookie, { ...gallery, images: Array.from({ length: 21 }, () => image(0)) }, 'PUT')).status, 400)
    assert.equal((await call(`campaigns/drafts/${draft.id}/cover`, owner.cookie, { fileId: fileIds[0]!.id, altText: 'Portada de ensayo independiente' }, 'PATCH')).status, 200)
    gallery = await json<Gallery>(await call(path, owner.cookie, { ...gallery, images: [image(1), image(0)], videoUrl: 'https://youtu.be/abcdefghijk' }, 'PUT'))
    assert.deepEqual(gallery.images.map(item => item.fileId), [fileIds[1]!.id, fileIds[0]!.id])
    assert.equal(typeof gallery.revision, 'string', 'La respuesta conserva la revisión para una segunda edición.')
    await json(await call(path, other.cookie, gallery, 'PUT'), 404)
    const concurrent = await Promise.all([call(path, owner.cookie, { ...gallery, images: [image(0)] }, 'PUT'), call(path, owner.cookie, { ...gallery, images: [image(1)] }, 'PUT')])
    assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409])
    gallery = await json<Gallery>(await call(path, owner.cookie))
    assert.equal(sql(`SELECT count(*) FROM file_attachment WHERE campaign_id='${draft.id}' AND attachment_role='GALLERY_ARCHIVED'`), '2')
    for (const file of fileIds.slice(0, 2)) assert.equal((await call(`files/${file.id}`, owner.cookie, undefined, 'DELETE')).status, 409, 'Adjuntos actuales e históricos conservan sus archivos')
    assert.equal((await call('auth/logout', owner.cookie, {})).status, 204)
    const login = await call('auth/login', '', { email: owner.email, password: owner.password }); assert.equal(login.status, 200)
    owner.cookie = login.headers.get('set-cookie')!.split(';')[0]!
    assert.deepEqual(await json<Gallery>(await call(path, owner.cookie)), gallery)
    const mark = (kind: string, active = true, cookie = owner.cookie) => call(`me/bookmarks/${draft.id}/${kind}`, cookie, { active }, 'PUT')
    assert.equal((await mark('FAVORITE')).status, 404)
    sql(`UPDATE campaign SET status='PUBLISHED',published_at=now(),goal_amount=1000,currency_code='BOB' WHERE id='${draft.id}'`)
    const publicGallery = await json<Omit<Gallery, 'revision'>>(await call(`campaigns/public/${draft.id}/gallery`))
    assert.deepEqual(publicGallery.images, gallery.images)
    assert.equal('revision' in publicGallery, false)
    assert.equal((await call(path, owner.cookie, gallery, 'PUT')).status, 404)
    assert.equal((await mark('FAKE')).status, 400)
    assert.equal((await call(`me/bookmarks/${draft.id}/FAVORITE`, owner.cookie, { active: 'true' }, 'PUT')).status, 400)
    assert.equal((await call('me/bookmarks')).status, 401)
    assert.equal((await call('me/bookmarks?page=0', owner.cookie)).status, 400)
    for (const response of await Promise.all([mark('FAVORITE'), mark('FAVORITE'), mark('FOLLOW')])) assert.equal(response.status, 200)
    assert.equal(sql(`SELECT count(*) FROM campaign_bookmark WHERE user_id='${owner.id}' AND campaign_id='${draft.id}'`), '2')
    assert.deepEqual(await json(await call(`me/bookmarks/${draft.id}`, other.cookie)), { favorite: false, following: false })
    assert.deepEqual(await json(await mark('FAVORITE', false)), { favorite: false, following: true })
    sql(`INSERT INTO campaign_update(campaign_id,author_user_id,title,body,visibility,published_at) VALUES
      ('${draft.id}','${owner.id}','Novedad pública','Avance visible de ensayo','PUBLIC',now()),
      ('${draft.id}','${owner.id}','PRIVADA','No divulgar','PRIVATE',now()),
      ('${draft.id}','${owner.id}','SOLO_APORTANTES','No divulgar','SUPPORTERS_ONLY',now()),
      ('${draft.id}','${owner.id}','FUTURA','No divulgar','PUBLIC',now()+interval '1 day');`)
    const updates = await json<{ items: { title: string }[]; total: number }>(await call('me/bookmarks/updates', owner.cookie))
    assert.equal(updates.total, 1); assert.equal(updates.items[0]!.title, 'Novedad pública')
    assert.equal((await json<{ total: number }>(await call('me/bookmarks/updates', other.cookie))).total, 0)
    await mark('FAVORITE')
    sql(`INSERT INTO campaign(creator_user_id,slug,title,summary,campaign_type,status,published_at,goal_amount,currency_code)
      SELECT '${owner.id}','s3-'||gen_random_uuid(),'Campaña de ensayo '||n,'Solo prueba temporal','DONATION','PUBLISHED',now(),1000,'BOB'
      FROM generate_series(1,21) n;
      INSERT INTO campaign_bookmark(user_id,campaign_id,kind) SELECT '${owner.id}',id,'FAVORITE' FROM campaign
      WHERE creator_user_id='${owner.id}' ON CONFLICT DO NOTHING;`)
    const page1 = await json<{ items: { campaignId: string }[]; total: number }>(await call('me/bookmarks', owner.cookie))
    const page2 = await json<{ items: { campaignId: string }[]; total: number }>(await call('me/bookmarks?page=2', owner.cookie))
    assert.equal(page1.total, 22); assert.equal(page1.items.length, 20); assert.equal(page2.items.length, 2)
    assert.equal(new Set([...page1.items, ...page2.items].map(item => item.campaignId)).size, 22)
    sql(`UPDATE campaign SET status='CLOSED' WHERE id='${draft.id}'`)
    const closed = await json<{ items: { status: string; slug: string | null }[] }>(await call('me/bookmarks?kind=FOLLOW', owner.cookie))
    assert.equal(closed.items[0]!.status, 'CLOSED'); assert.equal(closed.items[0]!.slug, null)
    sql(`UPDATE campaign SET status='DRAFT',title='TITULO_PRIVADO' WHERE id='${draft.id}'`)
    const hidden = await call('me/bookmarks?kind=FOLLOW', owner.cookie)
    assert.equal(hidden.status, 200); assert.ok(!(await hidden.text()).includes('TITULO_PRIVADO'))
    assert.equal((await json<{ total: number }>(await call('me/bookmarks/updates', owner.cookie))).total, 0)
    assert.deepEqual(await json(await mark('FOLLOW', false)), { favorite: true, following: false })
  } finally {
    await app.close()
    // Solo datos efímeros creados por este ensayo, nunca cuentas preexistentes.
    for (const user of users) sql(`DELETE FROM campaign WHERE creator_user_id='${user.id}'; DELETE FROM file_asset WHERE uploaded_by='${user.id}'; DELETE FROM app_user WHERE id='${user.id}';`)
    for (const file of fileIds) await rm(join(root, file.purpose, `${file.id}.bin`), { force: true })
    if (originalRoot === undefined) delete process.env.FILE_STORAGE_DIR
    else process.env.FILE_STORAGE_DIR = originalRoot
  }
})
