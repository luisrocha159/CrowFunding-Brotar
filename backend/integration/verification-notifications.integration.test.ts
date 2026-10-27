import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readTestDatabaseTarget } from './database-target'
import { ContactMail, ContactMailSender } from '../src/contacts/contact-mail'
import type { VerificationDetail, VerificationType } from '../src/verifications/application/verifications'

test('S2-09: correo verificado, observaciones, corrección, reenvío y avisos privados integrados', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true'); assert.notEqual(process.env.NODE_ENV, 'production')
  const target = readTestDatabaseTarget(config); assert.match(target.project, /qa/)
  const sql = (query: string) => execFileSync('docker', ['exec', '-i', target.container, 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'], { input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  const app = await NestFactory.create(AppModule, { logger: false }); configureHttp(app, readEnvironment({ NODE_ENV: 'test' })); await app.listen(0, '127.0.0.1')
  const base = await app.getUrl(), users: string[] = [], files: string[] = [], cases: string[] = []
  const messages: { to: string; text: string }[] = [], mail = app.get(ContactMail), sender = app.get(ContactMailSender)
  sender.available = () => true; sender.origin = () => 'http://127.0.0.1:5173'
  sender.send = async (to, _subject, text) => { messages.push({ to, text }) }
  const request = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => fetch(`${base}/api/${path}`, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173', 'X-Brotar-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const value = async <T>(response: Response, status = 200): Promise<T> => { assert.equal(response.status, status, await response.clone().text()); return await response.json() as T }
  try {
    for (let i = 0; i < 100 && await mail.collect() === 100; i++) { /* Consume solo el historial previo de QA. */ }
    const accounts: { id: string; cookie: string; email: string }[] = []
    for (let i = 0; i < 2; i++) {
      const email = `s2-09-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('hex')
      const user = await value<{ id: string }>(await request('auth/register', '', { firstName: 'DEMO', lastName: 'Corrección', email, password, demoConsent: true }), 201)
      users.push(user.id)
      if (i) sql(`INSERT INTO public.user_role(user_id,role_id) SELECT '${user.id}',id FROM public.role WHERE code='COMPLIANCE';`)
      const login = await request('auth/login', '', { email, password }); assert.equal(login.status, 200)
      accounts.push({ id: user.id, cookie: login.headers.get('set-cookie')!.split(';')[0]!, email })
    }
    const owner = accounts[0]!, reviewer = accounts[1]!
    await value(await request('contacts/email/request', owner.cookie, {}), 201)
    const token = /token=([a-f0-9]{64})/.exec(messages[0]!.text)?.[1]; assert.ok(token)
    assert.equal((await request('contacts/email/confirm', reviewer.cookie, { token })).status, 400)
    await value(await request('contacts/email/confirm', owner.cookie, { token }), 201)
    assert.equal((await request('contacts/email/confirm', owner.cookie, { token })).status, 400)
    await value(await request('contacts/email/preferences', owner.cookie, { enabled: true }, 'PUT'))
    const types = await value<VerificationType[]>(await request('me/verifications/types', owner.cookie))
    const type = types.find(t => t.code === 'KYC_IDENTITY')!; assert.ok(type.policy)
    let detail = await value<VerificationDetail>(await request('me/verifications', owner.cookie, { verificationTypeId: type.id }), 201); cases.push(detail.id)
    const documents: { documentTypeId: string; fileId: string }[] = []
    for (const doc of type.policy.documents) {
      const file = await value<{ id: string }>(await request('files', owner.cookie, { purpose: 'VERIFICATION_DOCUMENT', visibility: 'PRIVATE', originalName: 'DEMO-correccion.pdf', mimeType: 'application/pdf', contentBase64: Buffer.from('%PDF-1.4\nDEMO documento sintético').toString('base64') }), 201)
      files.push(file.id); documents.push({ documentTypeId: doc.documentTypeId, fileId: file.id })
    }
    const fields = Object.fromEntries(type.policy.fields.map(f => [f.key, 'DEMO Persona de prueba']))
    const submit = async (updatedFields = fields) => {
      detail = await value<VerificationDetail>(await request(`me/verifications/${detail.id}`, owner.cookie, { expectedVersion: detail.version, policyVersion: type.policy!.version, fields: updatedFields, documents, accepted: true, submit: true }, 'PUT'))
      assert.equal(detail.status, 'PENDING')
    }
    const review = async (decision: string) => {
      detail = await value<VerificationDetail>(await request(`admin/verifications/${detail.id}/review`, reviewer.cookie, { expectedVersion: detail.version, decision, reason: 'Observación y revisión explícita de documentación sintética DEMO.', documents: decision === 'APPROVED' ? detail.documents.map(d => ({ fileId: d.fileId, isValid: true, notes: 'Documento sintético revisado' })) : [] }), 201)
    }
    await submit(); await review('IN_REVIEW'); await review('REQUIRES_INFO'); await mail.tick()
    const notices = await value<{ entityName: string; body: string; delivery: string }[]>(await request('contacts/notifications', owner.cookie))
    assert.ok(notices.some(n => n.entityName === 'VERIFICATION' && n.body.includes('se requiere información') && n.delivery === 'SMTP_ACCEPTED'))
    assert.ok(messages.some(m => m.to === owner.email && m.text.includes('se requiere información')))
    assert.equal((await request(`me/verifications/${detail.id}`, reviewer.cookie)).status, 404)
    const previousVersion = detail.version, previousRevisions = detail.revisions.length
    const corrected = Object.fromEntries(type.policy.fields.map(f => [f.key, 'DEMO Persona con datos corregidos']))
    await submit(corrected); assert.notEqual(detail.version, previousVersion); assert.ok(detail.revisions.length > previousRevisions)
    await review('IN_REVIEW'); await review('APPROVED'); await mail.tick()
    const final = await value<VerificationDetail>(await request(`me/verifications/${detail.id}`, owner.cookie)); assert.equal(final.status, 'APPROVED')
    assert.ok(final.history.some(h => h.status === 'REQUIRES_INFO')); assert.ok(messages.some(m => m.to === owner.email && m.text.includes('aprobada')))
    const otherNotices = await value<unknown[]>(await request('contacts/notifications', reviewer.cookie)); assert.equal(otherNotices.length, 0)
    assert.ok(messages.filter(m => !m.text.includes('token=')).every(m => !m.text.includes('Persona con datos corregidos')))
  } finally {
    await app.close()
    for (const id of cases) sql(`DELETE FROM brotar_extension.verification_revision WHERE verification_id='${id}'; DELETE FROM public.verification_document WHERE verification_id='${id}'; DELETE FROM public.verification WHERE id='${id}';`)
    for (const id of files) sql(`DELETE FROM public.file_asset WHERE id='${id}';`)
    for (const id of users) sql(`DELETE FROM public.audit_log WHERE actor_user_id='${id}'; DELETE FROM public.app_user WHERE id='${id}';`)
  }
})
