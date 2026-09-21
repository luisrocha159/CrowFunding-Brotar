import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { allowsDeactivation, isSelfReference, isValidSlug, normalizeCategory } from '../src/catalogs/domain/category'
import { AGREED_SETTINGS, isAgreedSetting, isValidSettingKey } from '../src/catalogs/domain/setting'
import {
  Categories, CategoryInUse, CategoryInvalid, CategoryParentUnavailable, CategorySlugTaken,
  Settings, SettingNotAgreed, type Category, type CategoryRepository, type CategoryUsage
} from '../src/catalogs/application/categories'

const base: Category = {
  id: 'id-1', slug: 'educacion', name: 'Educación', description: null,
  displayOrder: 0, parentId: null, isActive: true
}

function repositoryWith(overrides: Partial<CategoryRepository> = {}): CategoryRepository {
  return {
    list: async () => [base],
    find: async (id) => id === base.id ? base : null,
    findBySlug: async () => null,
    usage: async (): Promise<CategoryUsage> => ({ campaigns: 0, activeChildren: 0 }),
    create: async (input) => ({ ...base, ...input, id: 'nueva', description: input.description || null }),
    update: async (id, input) => ({ ...base, ...input, id, description: input.description || null }),
    setActive: async (id, isActive) => ({ ...base, id, isActive }),
    ...overrides
  }
}

const input = { slug: ' EDUCACION ', name: ' Educación ', description: ' Texto ', displayOrder: 1, parentId: null }

test('normaliza la categoría y valida su identificador', () => {
  assert.deepEqual(normalizeCategory(input), { slug: 'educacion', name: 'Educación', description: 'Texto', displayOrder: 1, parentId: null })
  for (const slug of ['educacion', 'medio-ambiente', 'a1-b2']) assert.equal(isValidSlug(slug), true)
  for (const slug of ['', 'Educacion', 'con espacio', '-inicio', 'final-', 'doble--guion', 'x'.repeat(121)]) {
    assert.equal(isValidSlug(slug), false, slug)
  }
  assert.equal(isSelfReference('id-1', 'id-1'), true)
  assert.equal(isSelfReference('id-1', 'id-2'), false)
  assert.equal(isSelfReference('id-1', null), false)
})

test('BG-55 protege las referencias existentes al desactivar', async () => {
  assert.equal(allowsDeactivation(0, 0), true)
  assert.equal(allowsDeactivation(1, 0), false)
  assert.equal(allowsDeactivation(0, 1), false)

  const inUse = new Categories(repositoryWith({ usage: async () => ({ campaigns: 2, activeChildren: 0 }) }))
  await assert.rejects(() => inUse.setActive(base.id, false), CategoryInUse)
  // Reactivar no exige la comprobación: no deja referencias colgando.
  assert.equal((await inUse.setActive(base.id, true)).isActive, true)

  const withChildren = new Categories(repositoryWith({ usage: async () => ({ campaigns: 0, activeChildren: 1 }) }))
  await assert.rejects(() => withChildren.setActive(base.id, false), CategoryInUse)

  const free = new Categories(repositoryWith())
  assert.equal((await free.setActive(base.id, false)).isActive, false)
})

test('rechaza datos inválidos, identificadores repetidos y padres no disponibles', async () => {
  const categories = new Categories(repositoryWith())
  await assert.rejects(() => categories.create({ ...input, slug: 'Mayúsculas' }), CategoryInvalid)
  await assert.rejects(() => categories.create({ ...input, name: '   ' }), CategoryInvalid)
  await assert.rejects(() => categories.create({ ...input, displayOrder: -1 }), CategoryInvalid)
  await assert.rejects(() => categories.create({ ...input, displayOrder: 1.5 }), CategoryInvalid)
  await assert.rejects(() => categories.update(base.id, { ...input, parentId: base.id }), CategoryInvalid)

  const taken = new Categories(repositoryWith({ findBySlug: async () => ({ ...base, id: 'otra' }) }))
  await assert.rejects(() => taken.create(input), CategorySlugTaken)
  // El mismo identificador en la propia categoría no es conflicto.
  const same = new Categories(repositoryWith({ findBySlug: async () => base }))
  assert.equal((await same.update(base.id, input)).slug, 'educacion')

  const retired = new Categories(repositoryWith({ find: async (id) => id === base.id ? base : { ...base, id, isActive: false } }))
  await assert.rejects(() => retired.create({ ...input, parentId: 'padre-retirado' }), CategoryParentUnavailable)
})

test('solo se gestionan parámetros acordados y se registra quién modifica', async () => {
  // Vacía a propósito: poblarla exige D02 y D10.
  assert.deepEqual(AGREED_SETTINGS, [])
  assert.equal(isAgreedSetting('campaign.max_goal'), false)
  assert.equal(isValidSettingKey('campaign.max_goal'), true)
  assert.equal(isValidSettingKey('Campaign.Max'), false)

  let recorded: { key: string; updatedBy: string } | null = null
  const settings = new Settings({
    read: async () => null,
    write: async (key, value, updatedBy) => {
      recorded = { key, updatedBy }
      return { key, value, updatedBy, updatedAt: new Date() }
    }
  })
  await assert.rejects(() => settings.write('campaign.max_goal', 100, 'admin-1'), SettingNotAgreed)
  await assert.rejects(() => settings.read('campaign.max_goal'), SettingNotAgreed)
  assert.equal(recorded, null, 'Una clave no acordada no llega al repositorio.')
})
