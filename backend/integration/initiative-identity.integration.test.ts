import 'reflect-metadata'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'

test('borradores PostgreSQL/HTTP: reintentos atómicos, rutas retiradas, propiedad y cuota compartida entre dos API', { timeout: 120000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true' && process.env.NODE_ENV !== 'production')
  const { container } = readTestDatabaseTarget(config)
  const sql = (query: string) => execFileSync('docker', ['exec','-i',container,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'], { input: query, encoding: 'utf8', timeout: 10000, stdio: ['pipe','pipe','pipe'] }).trim()
  const suffix = randomUUID().slice(0,8), fixtureIp = `fixture-identity-${suffix}`, users: string[] = [], apps: INestApplication[] = []
  const urls: string[] = []
  const start = async () => {
    const app = await NestFactory.create(AppModule, { logger: false }); apps.push(app)
    configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
    // Solo el servidor de pruebas asigna un cliente independiente; el producto no confía en cabeceras de IP.
    app.use((request: object, _response: unknown, next: () => void) => { Object.defineProperty(request,'ip',{ value: fixtureIp }); next() })
    await app.listen(0,'127.0.0.1'); urls.push(await app.getUrl())
  }
  const call = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST', key?: string, server = 0) => fetch(`${urls[server]}/api/${path}`, {
    method, headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Origin: 'http://127.0.0.1:5173', ...(key ? { 'Idempotency-Key': key } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const account = async (name: string) => {
    const email = `identity-${name}-${suffix}@example.invalid`, password = `Ensayo con Ñ ${suffix} protegido`
    const created = await call('auth/register','',{ legalVersion:'mvp-demo-legal-1.0-20261028', firstName: 'Ensayo', lastName: name, email, password, demoConsent: true })
    assert.equal(created.status,201); const { id } = await created.json() as { id: string }; users.push(id)
    const login = await call('auth/login','',{ email,password }); assert.equal(login.status,200)
    return { id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }
  const hashed = (value: string) => createHash('sha256').update(`campaign-write:v1:${value}`).digest('hex')
  try {
    await start(); await start()
    const owner = await account('propietario'), other = await account('ajeno')
    const input = { title: `Iniciativa de ensayo ${suffix}`, summary: 'Resumen suficiente del ensayo de identidad', campaignType: 'DONATION' }
    const key = randomUUID()
    assert.equal((await call('campaigns/drafts',owner.cookie,input,'POST','no-es-un-uuid')).status,400)
    const parallel = await Promise.all([0,1,0,1].map(server => call('campaigns/drafts',owner.cookie,input,'POST',key,server)))
    assert.ok(parallel.every(response => response.status === 201))
    const records = await Promise.all(parallel.map(response => response.json() as Promise<{ id: string }>))
    const id = records[0]!.id, path = `campaigns/drafts/${id}`
    assert.ok(records.every(record => record.id === id), 'Mismo intento concurrente: un solo recurso real.')
    assert.equal(sql(`SELECT count(*) FROM campaign WHERE creator_user_id='${owner.id}';`),'1')
    assert.equal((await call('campaigns/drafts',owner.cookie,{ ...input,title: 'Otros datos en el mismo intento' },'POST',key)).status,409)
    assert.equal((await call(`${path}/identity`,other.cookie)).status,404)
    assert.equal((await call(`${path}/identity`)).status,404, 'El endpoint experimental de identidad fue retirado.')
    const categories = await (await call('catalogs/categories',owner.cookie)).json() as { id: string }[]
    assert.ok(categories.length >= 5, 'Catálogo preparado por migraciones.')
    assert.equal((await call(`${path}/general`,owner.cookie,{ title: input.title,summary: input.summary,categoryId: categories[0]!.id,location: { countryCode: 'BO',locality: 'Samaipata',addressLine: '',reference: '' } },'PUT')).status,200)
    assert.equal((await call(`${path}/identity`,owner.cookie,{},'PUT')).status,404)
    assert.equal((await call(path,other.cookie)).status,404,'La eliminación de una regla de negocio no elimina la protección de propiedad.')
    const second = await (await call('campaigns/drafts',owner.cookie,input)).json() as { id: string }
    const foreign = await (await call('campaigns/drafts',other.cookie,input)).json() as { id: string }
    assert.notEqual(second.id,id); assert.notEqual(foreign.id,id)
    assert.equal(sql(`SELECT count(DISTINCT slug) FROM campaign WHERE creator_user_id IN ('${owner.id}','${other.id}');`),'3','Mismo nombre y resumen, tres registros técnicamente distintos.')
    const missing = await (await call(`${path}/submission`,owner.cookie)).json() as { missing: { field: string }[] }
    assert.ok(missing.missing.length > 0, 'Las secciones obligatorias siguen validándose.')
    assert.ok(!missing.missing.some(item => item.field.startsWith('initiative') || item.field === 'duplication'))
    // Se reinicia exclusivamente la cuota del actor y cliente EFÍMEROS para medir el umbral exacto.
    sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN ('${hashed(`account:${owner.id}`)}','${hashed(`ip:${fixtureIp}`)}');`)
    const retryKey = randomUUID(), rateBody = { ...input,title: 'Reintento sujeto a cuota compartida' }
    const responses = await Promise.all(Array.from({ length: 21 },(_,i) => call('campaigns/drafts',owner.cookie,rateBody,'POST',retryKey,i % 2)))
    assert.equal(responses.filter(response => response.status === 201).length,20)
    assert.equal(responses.filter(response => response.status === 429).length,1)
    assert.equal(responses.find(response => response.status === 429)!.headers.get('retry-after'),'60')
    const successful = await Promise.all(responses.filter(response => response.status === 201).map(response => response.json() as Promise<{ id: string }>))
    assert.equal(new Set(successful.map(value => value.id)).size,1,'Veinte respuestas de reintento no crean veinte campañas.')
  } finally {
    for (const app of apps) await app.close()
    for (const id of users) sql(`DELETE FROM audit_log WHERE actor_user_id='${id}'; DELETE FROM status_history WHERE entity_type='CAMPAIGN' AND entity_id IN (SELECT id FROM campaign WHERE creator_user_id='${id}'); DELETE FROM campaign WHERE creator_user_id='${id}'; DELETE FROM app_user WHERE id='${id}'; DELETE FROM brotar_extension.rate_bucket WHERE key_hash='${hashed(`account:${id}`)}';`)
    sql(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash='${hashed(`ip:${fixtureIp}`)}';`)
  }
})
