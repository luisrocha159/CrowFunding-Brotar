import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { catalogAccess, categoryInput, availableParents, catalogError } from '../src/features/catalogs/catalogForm'
import { listCategories, listSettings, saveCategory, setCategoryActive, categoryFrom } from '../src/features/catalogs/catalogClient'
import { CategoryForm } from '../src/features/catalogs/CategoryForm'
import { CategoryList } from '../src/features/catalogs/CategoryList'
import { SessionError } from '../src/shared/api/sessionError'

const category = { id: 'cat-1', slug: 'educacion', name: 'Educación', description: null, displayOrder: 0, parentId: null, isActive: true }
const draft = { slug: ' EDUCACION ', name: ' Educación ', description: ' Texto ', displayOrder: '2', parentId: '' }

test('catálogos: auditor conserva lectura, incluso combinado con ADMIN', () => {
  assert.equal(catalogAccess(['REGISTERED_USER']), 'forbidden')
  assert.equal(catalogAccess(['ADMIN']), 'edit')
  assert.equal(catalogAccess(['AUDITOR']), 'read')
  assert.equal(catalogAccess(['ADMIN', 'AUDITOR']), 'read')
})
test('catálogos: formulario normaliza y rechaza datos que el API no admite', () => {
  assert.deepEqual(categoryInput(draft, [category]), { input: { slug: 'educacion', name: 'Educación', description: 'Texto', displayOrder: 2, parentId: null }, errors: {} })
  for (const patch of [{ slug: 'con espacio' }, { name: ' ' }, { name: 'Texto\0oculto' }, { description: 'Texto\0oculto' }, { description: 'a'.repeat(2001) }, { displayOrder: '' }, { displayOrder: '1.5' }, { displayOrder: '-1' }, { displayOrder: '32768' }, { parentId: 'missing' }]) {
    assert.ok(Object.keys(categoryInput({ ...draft, ...patch }, [category]).errors).length > 0)
  }
})
test('catálogos: padres excluyen propia categoría, descendientes e inactivos', () => {
  const rows = [category, { ...category, id: 'child', parentId: category.id }, { ...category, id: 'grandchild', parentId: 'child' }, { ...category, id: 'retired', isActive: false }, { ...category, id: 'valid' }]
  assert.deepEqual(availableParents(rows, category.id).map(row => row.id), ['valid'])
  assert.ok(categoryInput({ ...draft, parentId: 'grandchild' }, rows, category.id).errors.parentId)
})
test('catálogos: cliente consulta lista real y parámetros sin inventar claves', async () => {
  assert.deepEqual(await listCategories(undefined, (async (url, init) => {
    assert.equal(url, '/api/catalogs/admin/categories'); assert.equal(init?.credentials, 'same-origin')
    return Response.json([category])
  }) as typeof fetch), [category])
  assert.deepEqual(await listSettings(undefined, (async url => { assert.equal(url, '/api/catalogs/admin/settings'); return Response.json([]) }) as typeof fetch), [])
  for (const patch of [{ id: null }, { displayOrder: '0' }, { isActive: 'true' }, { parentId: 4 }, { description: undefined }]) assert.throws(() => categoryFrom({ ...category, ...patch }), SessionError)
  await assert.rejects(() => listCategories(undefined, (async () => Response.json({ error: 'bad' })) as typeof fetch), SessionError)
})
test('catálogos: mutaciones mantienen contratos y protección de origen', async () => {
  const input = { slug: 'educacion', name: 'Educación', description: '', displayOrder: 0, parentId: null }
  for (const id of [null, category.id]) {
    assert.deepEqual(await saveCategory(id, input, undefined, (async (url, init) => {
      assert.equal(url, id ? '/api/catalogs/admin/categories/cat-1' : '/api/catalogs/admin/categories')
      assert.equal(init?.method, id ? 'PUT' : 'POST'); assert.equal((init?.headers as Record<string,string>)['X-Brotar-Request'], '1')
      assert.deepEqual(JSON.parse(init?.body as string), input)
      return Response.json(category)
    }) as typeof fetch), category)
  }
  assert.equal((await setCategoryActive('cat-1', false, undefined, (async (url, init) => {
    assert.equal(url, '/api/catalogs/admin/categories/cat-1/state'); assert.equal(init?.method, 'PUT')
    assert.deepEqual(JSON.parse(init?.body as string), { isActive: false }); return Response.json({ ...category, isActive: false })
  }) as typeof fetch)).isActive, false)
  await assert.rejects(() => setCategoryActive('cat-1', false, undefined, (async () => new Response('', { status: 409 })) as typeof fetch), (error: unknown) => error instanceof SessionError && error.status === 409)
})
test('catálogos: error de referencia orienta sin mostrar mensajes internos', () => {
  assert.match(catalogError(new SessionError(409), 'state'), /campañas|subcategorías/)
  assert.match(catalogError(new SessionError(409), 'save'), /identificador/)
  assert.match(catalogError(new SessionError(0), 'save'), /comprobar|actualiza/i)
  assert.doesNotMatch(catalogError(new Error('private token'), 'save'), /private token/)
})
test('catálogos: formulario accesible y lista de auditor sin controles de edición', () => {
  const form = renderToStaticMarkup(<CategoryForm categories={[category]} busy={false} onSave={async () => true} onCancel={() => {}} />)
  assert.match(form, /<label[^>]*for=/); assert.match(form, /type="submit"/); assert.match(form, /maxLength="2000"/i)
  const readonly = renderToStaticMarkup(<CategoryList categories={[category]} editable={false} busy={false} onEdit={() => {}} onState={() => {}} />)
  assert.match(readonly, /Educación/); assert.doesNotMatch(readonly, /<button/)
  const empty = renderToStaticMarkup(<CategoryList categories={[]} editable busy={false} onEdit={() => {}} onState={() => {}} />)
  assert.match(empty, /No hay categorías/)
})
