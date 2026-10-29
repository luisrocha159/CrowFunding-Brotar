import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'
import { DatabaseService } from '../src/shared/infrastructure/database/database.service'
import type { ProgressState } from '../src/campaign-progress/infrastructure/progress.repository'
test('S3 avances: propiedad, concurrencia, publicación, instantáneas y consulta administrativa reales', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env); assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true'); assert.notEqual(process.env.NODE_ENV, 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', timeout: 10000 }).trim()
  const users: { id: string; cookie: string }[] = []; const campaigns: string[] = []
  const app = await NestFactory.create(AppModule, { logger: false }); configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1'); const base = await app.getUrl()
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}/api/${path}`, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const json = async <T>(response: Response, expected = 200): Promise<T> => { const body: unknown = await response.json(); assert.equal(response.status, expected, JSON.stringify(body)); return body as T }
  try {
    for (let i = 0; i < 2; i++) { const email = `progress-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('hex'); const user = await json<{ id: string }>(await call('auth/register', '', { legalVersion:'mvp-demo-legal-1.0-20261028', firstName: 'Ensayo', lastName: 'Avances', email, password, demoConsent: true }), 201); const login = await call('auth/login', '', { email, password }); assert.equal(login.status, 200); users.push({ id: user.id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }); sql(`INSERT INTO user_role(user_id,role_id) SELECT '${user.id}',id FROM role WHERE code='CREATOR' ON CONFLICT DO NOTHING;`)
      const draft = await json<{ id: string }>(await call('campaigns/drafts', users[i]!.cookie, { title: 'Avances temporales de ensayo', summary: 'Prueba de seguimiento real', campaignType: 'DONATION' }), 201); campaigns.push(draft.id)
    }
    const owner = users[0]!, other = users[1]!, id = campaigns[0]!, path = `campaigns/${id}/progress`
    assert.equal((await call(path)).status, 401); assert.equal((await call(path, other.cookie)).status, 404)
    let state = await json<ProgressState>(await call(path, owner.cookie)); assert.equal(state.editable, false)
    assert.equal((await call(path, owner.cookie, { revision: state.revision, activities: [], milestones: [], indicators: [] }, 'PUT')).status, 409)
    const activityId = randomUUID(), indicatorId = randomUUID()
    for (const campaign of campaigns) sql(`UPDATE campaign SET status='PUBLISHED',published_at=now(),goal_amount=1000,currency_code='BOB' WHERE id='${campaign}';`)
    sql(`INSERT INTO campaign_activity(id,campaign_id,name,responsible_name) VALUES('${activityId}','${id}','Preparación del terreno','Responsable de ensayo'); INSERT INTO campaign_impact_indicator(id,campaign_id,name,unit,target_value) VALUES('${indicatorId}','${id}','Árboles','unidades',100);`)
    state = await json<ProgressState>(await call(path, owner.cookie))
    const input = { revision: state.revision, activities: [{ id: activityId, responsibleName: 'Responsable de ensayo', status: 'IN_PROGRESS', progressPercent: 20, actualStartOn: '2026-01-01', actualEndOn: null }], milestones: [], indicators: [{ id: indicatorId, achievedValue: 10 }] }
    assert.equal((await call(path, owner.cookie, { ...input, activities: [{ ...input.activities[0], actualStartOn: '2026-13-01' }] }, 'PUT')).status, 400)
    assert.equal((await call(path, owner.cookie, { ...input, indicators: [{ id: indicatorId, achievedValue: 0.000001 }] }, 'PUT')).status, 400)
    const concurrent = await Promise.all([call(path, owner.cookie, input, 'PUT'), call(path, owner.cookie, { ...input, indicators: [{ id: indicatorId, achievedValue: 11 }] }, 'PUT')]); assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409])
    state = await json<ProgressState>(await call(path, owner.cookie)); assert.equal(state.activities[0]!.progressPercent, 20)
    const updateId = randomUUID(); const update = { revision: null, title: 'Preparación completada de ensayo', body: 'Se ha preparado el terreno para la siguiente actividad del proyecto.', milestoneId: null, images: [], publish: false }
    const draft = await json<{ revision: string }>(await call(`campaigns/${id}/updates/${updateId}`, owner.cookie, update, 'PUT'))
    assert.equal((await json<{revision:string}>(await call(`campaigns/${id}/updates/${updateId}`,owner.cookie))).revision,draft.revision)
    assert.equal((await call(`campaigns/${id}/updates/${updateId}`,other.cookie)).status,404)
    assert.equal((await call(`campaigns/${id}/updates/${randomUUID()}`,owner.cookie)).status,404)
    assert.equal((await json<{ items: unknown[] }>(await call(`campaigns/public/${id}/updates`))).items.length, 0)
    const published = await json<{ revision: string; progress: ProgressState }>(await call(`campaigns/${id}/updates/${updateId}`, owner.cookie, { ...update, revision: draft.revision, publish: true }, 'PUT')); assert.equal(published.progress.activities[0]!.progressPercent, 20)
    await json(await call(path, owner.cookie, { ...input, revision: state.revision, activities: [{ ...input.activities[0], progressPercent: 40 }] }, 'PUT'))
    const visible = await json<{ items: { progress: ProgressState; revision?: string }[] }>(await call(`campaigns/public/${id}/updates`)); assert.equal(visible.items[0]!.progress.activities[0]!.progressPercent, 20); assert.equal(visible.items[0]!.revision, undefined)
    assert.equal((await call(`campaigns/${id}/updates/${updateId}`, owner.cookie, { ...update, revision: published.revision }, 'PUT')).status, 409)
    const shared = randomUUID(); const race = await Promise.all([call(`campaigns/${id}/updates/${shared}`, owner.cookie, { ...update, title: 'Primera campaña de ensayo' }, 'PUT'), call(`campaigns/${campaigns[1]}/updates/${shared}`, other.cookie, { ...update, title: 'Segunda campaña de ensayo' }, 'PUT')]); assert.deepEqual(race.map(r => r.status).sort(), [200, 409])
    assert.equal(sql(`SELECT count(*) FROM campaign_update WHERE id='${shared}'`), '1')
    const oldId = randomUUID()
    const old = await json<{revision:string}>(await call(`campaigns/${id}/updates/${oldId}`,owner.cookie,update,'PUT'))
    sql(`INSERT INTO campaign_update(campaign_id,author_user_id,title,body,visibility,published_at) SELECT '${id}','${owner.id}','Novedad de paginación '||n,'Contenido de ensayo para comprobar paginación histórica','PUBLIC',now() FROM generate_series(1,101) n;`)
    const page1=await json<{items:{id:string}[];total:number}>(await call(`campaigns/${id}/updates`,owner.cookie))
    const page2=await json<{items:{id:string}[]}>(await call(`campaigns/${id}/updates?page=2`,owner.cookie))
    assert.equal(page1.items.length,20); assert.equal(page2.items.length,20); assert.equal(new Set([...page1.items,...page2.items].map(i=>i.id)).size,40)
    assert.equal((await json<{id:string}>(await call(`campaigns/${id}/updates/${oldId}`,owner.cookie,{...update,revision:old.revision,title:'Borrador antiguo editado'},'PUT'))).id,oldId)
    assert.equal((await json<{total:number;items:unknown[]}>(await call(`campaigns/public/${id}/updates?page=6`))).items.length,2)
    assert.equal((await call(`campaigns/public/${id}/updates?page=0`)).status,400)
    assert.equal((await call('administration/dashboard', owner.cookie)).status, 403)
    const lockedFile=randomUUID(), expiringUpdate=randomUUID()
    sql(`INSERT INTO file_asset(id,storage_key,file_name,mime_type,size_bytes,scope,uploaded_by) VALUES('${lockedFile}','CAMPAIGN_PUBLIC_IMAGE/${lockedFile}.bin','ensayo.png','image/png',8,'PUBLIC','${owner.id}'); UPDATE user_role SET expires_at=clock_timestamp()+interval '2 seconds' WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='CREATOR');`)
    const holder=app.get(DatabaseService).connection().createQueryRunner(); await holder.connect(); await holder.startTransaction()
    let pending: Promise<Response> | undefined
    try {
      await holder.query('SELECT id FROM public.file_asset WHERE id=$1 FOR UPDATE',[lockedFile])
      pending=call(`campaigns/${id}/updates/${expiringUpdate}`,owner.cookie,{...update,images:[{fileId:lockedFile,caption:'Evidencia temporal'}],publish:true},'PUT')
      await holder.query('SELECT pg_sleep(2.2)')
    } finally {await holder.rollbackTransaction();await holder.release()}
    assert.equal((await pending!).status,403,'Un rol vencido mientras espera evidencia no puede publicar')
    assert.equal(sql(`SELECT count(*) FROM campaign_update WHERE id='${expiringUpdate}'`),'0')
    sql(`UPDATE user_role SET expires_at=NULL WHERE user_id='${owner.id}' AND role_id=(SELECT id FROM role WHERE code='CREATOR');`)
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='ADMIN' ON CONFLICT DO NOTHING;`)
    assert.ok((await json<{ campaigns: unknown[] }>(await call('administration/dashboard', owner.cookie))).campaigns.length)
    assert.equal((await json<{ reports: unknown[] }>(await call(`campaigns/${id}/accountability`, owner.cookie))).reports.length, 0)
    assert.equal((await call(`campaigns/${id}/accountability`, other.cookie)).status, 404)
    const dashboard = await json<{ items: { id: string; amountRaised: string }[] }>(await call('campaigns/creator-dashboard', owner.cookie)); assert.ok(dashboard.items.some(i => i.id === id && Number(i.amountRaised) === 0)); assert.ok(!dashboard.items.some(i => i.id === campaigns[1]))
    sql(`UPDATE campaign SET status='CLOSED' WHERE id='${id}';`); assert.equal((await json<ProgressState>(await call(path, owner.cookie))).editable, false); assert.equal((await call(`campaigns/public/${id}/updates`)).status, 200)
    sql(`INSERT INTO user_role(user_id,role_id) SELECT '${owner.id}',id FROM role WHERE code='AUDITOR' ON CONFLICT DO NOTHING;`)
    assert.equal((await call(path, owner.cookie, input, 'PUT')).status, 403)
  } finally { await app.close(); for (const user of users) sql(`DELETE FROM campaign WHERE creator_user_id='${user.id}'; DELETE FROM file_asset WHERE uploaded_by='${user.id}'; DELETE FROM app_user WHERE id='${user.id}';`) }
})
