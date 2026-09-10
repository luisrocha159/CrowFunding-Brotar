import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { projects } from '../src/mocks/projects/projects'
import { changeProjectParams, clearProjectFilters, readProjectParams } from '../src/features/public/explore-projects/projectParams'
import { queryProjects } from '../src/features/public/explore-projects/projectQuery'

describe('Estado público de filtros en URL', () => {
  it('lee búsqueda, filtros, orden y página desde un enlace compartido', () => {
    const { query, issues } = readProjectParams(new URLSearchParams('q=huertos&categoria=Producción+sostenible&ubicacion=Cochabamba&tipo=reward&orden=newest&pagina=1'), projects)
    assert.deepEqual(issues, [])
    assert.equal(queryProjects(projects, query).items[0]?.id, 'demo-002')
    assert.equal(query.pageSize, 3)
  })
  it('permite dos páginas de tres campañas', () => {
    const { query } = readProjectParams(new URLSearchParams('pagina=2'), projects)
    const result = queryProjects(projects, query)
    assert.equal(result.page, 2)
    assert.equal(result.items.length, 3)
    assert.equal(result.items[0]?.id, 'demo-004')
  })
  it('cambia un filtro sin perder los demás y vuelve a la primera página', () => {
    const original = new URLSearchParams('q=bosque&tipo=donation&pagina=2&estado=normal')
    const next = changeProjectParams(original, 'ubicacion', 'Santa Cruz')
    assert.equal(next.get('q'), 'bosque')
    assert.equal(next.get('tipo'), 'donation')
    assert.equal(next.get('ubicacion'), 'Santa Cruz')
    assert.equal(next.has('pagina'), false)
    assert.equal(original.get('pagina'), '2')
  })
  it('cambiar página conserva búsqueda, filtros y orden', () => {
    const next = changeProjectParams(new URLSearchParams('q=bosque&tipo=donation&orden=progress'), 'pagina', '2')
    assert.equal(next.get('q'), 'bosque')
    assert.equal(next.get('tipo'), 'donation')
    assert.equal(next.get('orden'), 'progress')
    assert.equal(next.get('pagina'), '2')
  })
  it('quita filtros individualmente y permite limpiar todos', () => {
    const params = new URLSearchParams('q=bosque&tipo=donation&categoria=Medio+ambiente&ubicacion=Santa+Cruz&pagina=2&orden=progress')
    assert.equal(changeProjectParams(params, 'tipo', '').has('tipo'), false)
    const cleared = clearProjectFilters(params)
    assert.equal(cleared.toString(), 'orden=progress')
  })
  it('señala valores inválidos sin fallar y usa un orden seguro', () => {
    for (const type of ['inexistente', 'constructor', '__proto__']) {
      const result = readProjectParams(new URLSearchParams({ tipo: type, categoria: 'No existe', ubicacion: 'No existe', orden: 'otro' }), projects)
      assert.equal(result.issues.length, 3)
      assert.equal(result.query.sort, 'featured')
    }
  })
})
