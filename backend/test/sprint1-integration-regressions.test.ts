import 'reflect-metadata'
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { TypeormCategoryRepository } from '../src/catalogs/infrastructure/typeorm-category.repository'
import type { DatabaseService } from '../src/shared/infrastructure/database/database.service'
import { allowsStepMove } from '../src/campaigns/domain/draft'
import { PasswordRecovery, RecoveryDeliveryUnavailable } from '../src/auth/application/password-recovery'
import { smtpRecoveryConfig } from '../src/auth/infrastructure/smtp-recovery-delivery'

test('categorías normaliza UPDATE RETURNING al objeto del contrato', async () => {
  const category = { id: 'category', isActive: false }
  const database = { connection: () => ({ query: async () => [[category], 1] }) } as unknown as DatabaseService
  assert.deepEqual(await new TypeormCategoryRepository(database).setActive('category', false), category)
})

test('la navegación omite recompensas solo en donación', () => {
  assert.equal(allowsStepMove(5, 7, 'DONATION'), true)
  assert.equal(allowsStepMove(5, 7, 'REWARD'), false)
  assert.equal(allowsStepMove(5, 7, 'PRESALE'), false)
})

test('recuperación no emite tokens cuando no hay canal configurado', async () => {
  let issued = false
  const service = new PasswordRecovery({ issue: async () => { issued = true; return true }, reset: async () => true },
    { hash: async x => x }, { hash: x => x, create: () => ({ raw: 'test', hash: 'hash', expiresAt: new Date() }) })
  await assert.rejects(service.request('test@example.invalid'), RecoveryDeliveryUnavailable)
  assert.equal(issued, false)
})

test('recuperación entrega al adaptador sin devolver el token en respuesta normal', async () => {
  const sent: string[] = []
  const service = new PasswordRecovery({ issue: async () => true, reset: async () => true }, { hash: async x => x },
    { hash: x => x, create: () => ({ raw: 'test-token', hash: 'hash', expiresAt: new Date() }) }, false,
    { available: () => true, send: async (email, token) => { sent.push(`${email}:${token}`) } })
  assert.deepEqual(await service.request(' TEST@example.invalid '), { accepted: true })
  assert.deepEqual(sent, ['test@example.invalid:test-token'])
})

test('SMTP requiere configuración completa y HTTPS fuera de desarrollo local', () => {
  const env = { SMTP_HOST: 'smtp.example.invalid', SMTP_PORT: '587', SMTP_USER: 'demo', SMTP_PASSWORD: 'test-only', SMTP_FROM: 'demo@example.invalid', PUBLIC_WEB_ORIGIN: 'https://brotar.example.invalid', NODE_ENV: 'production' }
  assert.ok(smtpRecoveryConfig(env))
  assert.equal(smtpRecoveryConfig({ ...env, PUBLIC_WEB_ORIGIN: 'http://brotar.example.invalid' }), null)
  assert.equal(smtpRecoveryConfig({ ...env, SMTP_PASSWORD: '' }), null)
})
