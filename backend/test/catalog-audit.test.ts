import 'reflect-metadata'
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { Categories } from '../src/catalogs/application/categories'
import { TypeormCategoryRepository } from '../src/catalogs/infrastructure/typeorm-category.repository'
import type { DatabaseService } from '../src/shared/infrastructure/database/database.service'

const category = { id: 'cat-1', slug: 'education', name: 'Education', description: null, displayOrder: 0, parentId: null, isActive: true }
test('catálogos: cambio y auditoría usan la misma transacción y actor autenticado', async () => {
  const statements: { sql: string; parameters?: unknown[] }[] = []
  const manager = { query: async (sql: string, parameters?: unknown[]) => {
    statements.push({ sql, parameters })
    if (sql.includes('INSERT INTO public.category')) return [category]
    if (sql.includes('FROM public.category')) return []
    return []
  } }
  let transactions = 0
  const database = { connection: () => ({ transaction: async (operation: (transaction: typeof manager) => Promise<unknown>) => { transactions++; return operation(manager) }, query: async () => { throw new Error('Consulta fuera de transacción') } }) } as unknown as DatabaseService
  const result = await new Categories(new TypeormCategoryRepository(database)).create({ slug: 'education', name: 'Education', description: '', displayOrder: 0, parentId: null }, 'actor-1')
  assert.deepEqual(result, category); assert.equal(transactions, 1)
  const audit = statements.find(row => row.sql.includes('INSERT INTO public.audit_log'))
  assert.ok(audit)
  assert.deepEqual(audit.parameters, ['actor-1', 'CREATE', category.id, null, JSON.stringify(category)])
})

test('catálogos: fallo de auditoría impide confirmar el cambio', async () => {
  let committed = false
  const manager = { query: async (sql: string) => {
    if (sql.includes('INSERT INTO public.audit_log')) throw new Error('Audit unavailable')
    if (sql.includes('INSERT INTO public.category')) return [category]
    return []
  } }
  const database = { connection: () => ({ transaction: async (operation: (transaction: typeof manager) => Promise<unknown>) => { const result = await operation(manager); committed = true; return result } }) } as unknown as DatabaseService
  await assert.rejects(() => new Categories(new TypeormCategoryRepository(database)).create({ slug: 'education', name: 'Education', description: '', displayOrder: 0, parentId: null }, 'actor-1'), /Audit unavailable/)
  assert.equal(committed, false)
})
