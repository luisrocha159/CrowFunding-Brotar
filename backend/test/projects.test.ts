import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DataSource } from 'typeorm'
import { DiscardUnconfirmed, ProjectConflict, ProjectMissing, Projects, type ProjectDetail, type ProjectRepository } from '../src/campaigns/application/projects'
import { canDiscardCampaign, isPublicCampaign, reviewTarget } from '../src/campaigns/domain/lifecycle'
import { TypeormProjectRepository } from '../src/campaigns/infrastructure/typeorm-project.repository'
import type { DatabaseService } from '../src/shared/infrastructure/database/database.service'

const project: ProjectDetail = {
  id: 'project', title: 'Borrador', summary: null, status: 'DRAFT', categoryName: null,
  goalAmount: null, currencyCode: null, updatedAt: new Date(), submittedAt: null, creatorName: 'Creador',
  location: null, story: null, history: []
}
function build(status = 'DRAFT') {
  const discarded: string[] = []
  const repository: ProjectRepository = {
    listOwn: async user => user === 'own' ? [{ ...project, status }] : [],
    findOwn: async (user, id) => user === 'own' && id === project.id ? { ...project, status } : null,
    discardOwn: async (user, id) => { discarded.push(`${user}:${id}`) },
    reviewQueue: async () => [], findForReview: async () => null
  }
  return { projects: new Projects(repository), discarded }
}
test('S2-15: confirma descarte; propiedad y estado se comprueban antes de escribir', async () => {
  const { projects, discarded } = build()
  await assert.rejects(() => projects.discard('own', 'project', false), DiscardUnconfirmed)
  await assert.rejects(() => projects.discard('other', 'project', true), ProjectMissing)
  await assert.rejects(() => projects.findOwn('own', 'missing'), ProjectMissing)
  assert.deepEqual(discarded, [])
  await projects.discard('own', 'project', true)
  assert.deepEqual(discarded, ['own:project'])
  assert.equal((await projects.listOwn('other')).length, 0)
})
test('S2-15: no descarta campañas enviadas, aprobadas, publicadas ni estados desconocidos', async () => {
  for (const status of ['IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'UNKNOWN']) {
    const { projects, discarded } = build(status)
    assert.equal(canDiscardCampaign(status), false)
    await assert.rejects(() => projects.discard('own', 'project', true), ProjectConflict)
    assert.deepEqual(discarded, [])
  }
})
test('S2-17: lista vacía real y detalle no disponible no simulan aprobación', async () => {
  const { projects } = build()
  assert.deepEqual(await projects.reviewQueue(), [])
  await assert.rejects(() => projects.findForReview('missing'), ProjectMissing)
})
test('S2-12/14: contrato de decisiones exige revisión y motivos; aprobar no publica', () => {
  assert.equal(reviewTarget('IN_REVIEW', 'APPROVED', ''), 'APPROVED')
  assert.equal(reviewTarget('IN_REVIEW', 'REJECTED', 'Motivo concreto'), 'REJECTED')
  assert.equal(reviewTarget('IN_REVIEW', 'CHANGES_REQUESTED', 'Completar presupuesto'), 'CHANGES_REQUESTED')
  assert.throws(() => reviewTarget('DRAFT', 'APPROVED', ''))
  assert.throws(() => reviewTarget('IN_REVIEW', 'REJECTED', ' '))
  assert.throws(() => reviewTarget('IN_REVIEW', 'CHANGES_REQUESTED', ''))
  assert.throws(() => reviewTarget('IN_REVIEW', 'APPROVED', 'x'.repeat(5001)))
  for (const status of ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'UNKNOWN']) assert.equal(isPublicCampaign(status), false)
  assert.equal(isPublicCampaign('PUBLISHED'), true)
})
function sqlRepository(status: string | null) {
  const seen: { sql: string; parameters: unknown[] | undefined }[] = []
  const manager = { query: async (sql: string, parameters?: unknown[]) => {
    seen.push({ sql, parameters })
    return sql.startsWith('SELECT status') ? status === null ? [] : [{ status }] : []
  } }
  const source = { transaction: async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager) }
  const database = { connection: () => source as unknown as DataSource } as DatabaseService
  return { repository: new TypeormProjectRepository(database), seen }
}
test('descarte SQL bloquea el registro, reafirma propiedad, conserva relaciones y audita en la misma transacción', async () => {
  const { repository, seen } = sqlRepository('DRAFT')
  await repository.discardOwn('own', 'project')
  assert.match(seen[0]!.sql, /creator_user_id=\$2.*deleted_at IS NULL FOR UPDATE/)
  const update = seen.find(call => call.sql.startsWith('UPDATE'))!
  assert.match(update.sql, /deleted_at=now\(\)/)
  assert.match(update.sql, /creator_user_id=\$2 AND status='DRAFT' AND deleted_at IS NULL/)
  assert.deepEqual(update.parameters, ['project', 'own'])
  assert.ok(seen.some(call => call.sql.includes('INSERT INTO public.status_history') && call.sql.includes('DISCARD_DRAFT')))
  assert.ok(seen.every(call => !/DELETE FROM/.test(call.sql)))
})
test('carrera de estado o borrador ya descartado aborta antes de UPDATE e historial', async () => {
  for (const status of [null, 'IN_REVIEW']) {
    const { repository, seen } = sqlRepository(status)
    await assert.rejects(() => repository.discardOwn('own', 'project'), status === null ? ProjectMissing : ProjectConflict)
    assert.equal(seen.length, 1)
  }
})
