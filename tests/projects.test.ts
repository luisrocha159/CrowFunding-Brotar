import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { projects, DEMO_REFERENCE_DATE } from '../src/mocks/projects/projects'
import { getMockProject, listFeaturedMockProjects, listMockProjects, MockProjectError } from '../src/mocks/projects/projectService'
import { getProjectFilterOptions, normalizeSearch, queryProjects } from '../src/features/public/explore-projects/projectQuery'
import { canSupportProject, getProgressPercentage, toProjectCardData } from '../src/shared/utils/project'

describe('Datos públicos de demostración', () => {
  it('incluye al menos seis campañas con IDs y slugs únicos', () => {
    assert.ok(projects.length >= 6)
    assert.equal(new Set(projects.map(p => p.id)).size, projects.length)
    assert.equal(new Set(projects.map(p => p.slug)).size, projects.length)
    for (const p of projects) assert.match(p.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })
  it('cubre las tres modalidades, estados y variedad de filtros', () => {
    assert.deepEqual([...new Set(projects.map(p => p.campaignType))].sort(), ['donation', 'presale', 'reward'])
    assert.deepEqual([...new Set(projects.map(p => p.status))].sort(), ['active', 'cancelled', 'finished'])
    assert.ok(new Set(projects.map(p => p.category)).size >= 3)
    assert.ok(new Set(projects.map(p => p.location)).size >= 3)
    assert.ok(projects.some(p => p.updates.length === 0))
    assert.ok(projects.some(p => p.updates.length > 0))
    assert.ok(projects.some(p => p.verified))
    assert.ok(projects.some(p => !p.verified))
  })
  it('asigna una portada y una descripción distintas a cada campaña', () => {
    assert.equal(new Set(projects.map(p => p.image)).size, projects.length)
    assert.equal(new Set(projects.map(p => p.imageAlt)).size, projects.length)
    for (const project of projects) assert.match(project.imageCaption, /ilustrativa generada con IA/)
  })
  it('contiene los campos mínimos y distingue objetivos de resultados', () => {
    for (const p of projects) {
      for (const value of [p.name, p.summary, p.category, p.location, p.creator, p.image, p.imageAlt, p.description, p.problem, p.solution, p.beneficiaries, p.creatorDescription, p.imageCaption]) assert.ok(value.trim())
      assert.equal(p.isDemo, true)
      assert.ok(p.trustSignals.length > 0)
      assert.ok(p.impact.length > 0 && p.impact.every(i => i.indicator && i.target))
      assert.ok(p.goal > 0 && Number.isFinite(p.goal))
      assert.ok(p.raised >= 0 && Number.isFinite(p.raised))
      assert.ok(Number.isFinite(getProgressPercentage(p)))
    }
  })
  it('mantiene fechas y días coherentes con la fecha fija de demostración', () => {
    for (const p of projects) {
      assert.ok(Date.parse(p.publishedAt) <= Date.parse(DEMO_REFERENCE_DATE))
      assert.ok(Date.parse(p.endsAt) >= Date.parse(p.publishedAt))
      const remaining = Math.max(0, Math.round((Date.parse(p.endsAt) - Date.parse(DEMO_REFERENCE_DATE)) / 86400000))
      assert.equal(p.daysRemaining, remaining)
      if (p.status !== 'active') {
        assert.equal(p.daysRemaining, 0)
        assert.ok(p.statusReason)
      }
      for (const update of p.updates) {
        assert.ok(Date.parse(update.date) >= Date.parse(p.publishedAt))
        assert.ok(Date.parse(update.date) <= Date.parse(DEMO_REFERENCE_DATE))
      }
    }
  })
  it('calcula progreso sin duplicarlo ni perder recaudación superior al 100%', () => {
    assert.equal(getProgressPercentage({ goal: 85000, raised: 61200 }), 72)
    assert.equal(getProgressPercentage({ goal: 30000, raised: 31500 }), 105)
    assert.equal(getProgressPercentage({ goal: 25000, raised: 0 }), 0)
    assert.equal(getProgressPercentage({ goal: 0, raised: 30 }), 0)
    assert.equal(getProgressPercentage({ goal: 10, raised: -1 }), 0)
    assert.equal(getProgressPercentage({ goal: Infinity, raised: 20 }), 0)
    assert.equal(getProgressPercentage({ goal: 10, raised: NaN }), 0)
  })
  it('no habilita aportes para campañas finalizadas o canceladas', () => {
    assert.equal(canSupportProject({ status: 'active' }), true)
    assert.equal(canSupportProject({ status: 'finished' }), false)
    assert.equal(canSupportProject({ status: 'cancelled' }), false)
  })
  it('la tarjeta y el detalle comparten datos de una misma campaña', () => {
    for (const p of projects) {
      const card = toProjectCardData(p)
      assert.equal(card.slug, p.slug)
      assert.equal(card.raised, p.raised)
      assert.equal(card.name, p.name)
      assert.equal(getProgressPercentage(card), getProgressPercentage(p))
    }
  })
})

describe('Búsqueda, filtros y paginación local', () => {
  it('normaliza acentos, mayúsculas y espacios', () => {
    assert.equal(normalizeSearch('  DONACIÓN   Potosí  '), 'donacion potosi')
    assert.equal(queryProjects(projects, { text: 'REForestacion' }).items[0]?.slug, 'reforestacion-chiquitana')
    assert.equal(queryProjects(projects, { text: '  donacion   potosi ' }).items[0]?.slug, 'biblioteca-comunitaria-potosi')
  })
  it('busca por creador y ubicación además del título', () => {
    assert.equal(queryProjects(projects, { text: 'Semilla Compartida' }).total, 1)
    assert.equal(queryProjects(projects, { text: 'la paz' }).total, 1)
  })
  it('combina categoría, ubicación, modalidad y texto con AND', () => {
    const result = queryProjects(projects, { category: 'Producción sostenible', location: 'Cochabamba', campaignType: 'reward', text: 'huertos' })
    assert.equal(result.total, 1)
    assert.equal(result.items[0]?.id, 'demo-002')
    assert.equal(queryProjects(projects, { ...{ category: 'Producción sostenible', location: 'Cochabamba' }, campaignType: 'donation' }).total, 0)
  })
  it('ofrece filtros derivados de los datos, sin duplicados', () => {
    const options = getProjectFilterOptions(projects)
    assert.equal(options.locations.length, 6)
    assert.equal(options.categories.length, new Set(projects.map(p => p.category)).size)
    assert.equal(options.campaignTypes.length, 3)
    assert.deepEqual(getProjectFilterOptions([]), { categories: [], locations: [], campaignTypes: [] })
  })
  it('devuelve vacío para búsquedas o filtros sin coincidencias', () => {
    assert.equal(queryProjects(projects, { text: 'inexistente-xyz' }).total, 0)
    assert.equal(queryProjects(projects, { category: 'Categoría inválida' }).total, 0)
    assert.equal(queryProjects(projects, { location: 'Ubicación inválida' }).total, 0)
    assert.equal(queryProjects([], {}).totalPages, 0)
  })
  it('restablecer filtros devuelve el listado general', () => {
    assert.equal(queryProjects(projects, { campaignType: 'presale' }).total, 2)
    assert.equal(queryProjects(projects, {}).total, projects.length)
    assert.equal(queryProjects(projects, { text: '   ' }).total, projects.length)
  })
  it('ordena por destacados, novedades, avance y cierre próximo', () => {
    assert.ok(queryProjects(projects).items.slice(0, 3).every(p => p.featured))
    assert.equal(queryProjects(projects, { sort: 'newest' }).items[0]?.id, 'demo-004')
    assert.equal(queryProjects(projects, { sort: 'progress' }).items[0]?.id, 'demo-003')
    const ending = queryProjects(projects, { sort: 'ending-soon' }).items
    assert.equal(ending[0]?.id, 'demo-003')
    assert.ok(ending.slice(-2).every(p => p.status !== 'active'))
  })
  it('pagina sin perder filtros y limita páginas fuera de rango', () => {
    const first = queryProjects(projects, { category: 'Producción sostenible', pageSize: 1 })
    const second = queryProjects(projects, { category: 'Producción sostenible', pageSize: 1, page: 2 })
    assert.equal(first.total, 2)
    assert.equal(first.hasMore, true)
    assert.equal(second.hasMore, false)
    assert.notEqual(first.items[0]?.id, second.items[0]?.id)
    assert.equal(queryProjects(projects, { pageSize: 2, page: 999 }).page, 3)
    assert.equal(queryProjects(projects, { pageSize: 0, page: -2 }).pageSize, 1)
    assert.equal(queryProjects(projects, { pageSize: NaN, page: Infinity }).page, 1)
  })
  it('no reordena ni modifica los datos originales', () => {
    const original = JSON.stringify(projects)
    queryProjects(projects, { sort: 'newest' })
    queryProjects(projects, { sort: 'progress' })
    assert.equal(JSON.stringify(projects), original)
  })
})

describe('Servicio simulado sin red', () => {
  it('entrega copias independientes y no contamina solicitudes posteriores', async () => {
    const first = await listMockProjects({ delayMs: 0 })
    assert.equal(first.length, 6)
    assert.notEqual(first[0], projects[0])
    assert.notEqual(first[0]?.impact, projects[0]?.impact)
    assert.ok(first[0])
    Reflect.set(first[0], 'name', 'Cambio de prueba')
    const second = await listMockProjects({ delayMs: 0 })
    assert.equal(second[0]?.name, projects[0]?.name)
  })
  it('resuelve el detalle correcto para los seis slugs y null para uno desconocido', async () => {
    for (const p of projects) assert.equal((await getMockProject(p.slug, { delayMs: 0 }))?.id, p.id)
    assert.equal(await getMockProject('no-existe', { delayMs: 0 }), null)
  })
  it('entrega tres destacados activos', async () => {
    const featured = await listFeaturedMockProjects({ delayMs: 0 })
    assert.equal(featured.length, 3)
    assert.ok(featured.every(p => p.featured && p.status === 'active'))
  })
  it('permite reproducir vacío en listado, destacados y detalle', async () => {
    const options = { scenario: 'empty' as const, delayMs: 0 }
    assert.deepEqual(await listMockProjects(options), [])
    assert.deepEqual(await listFeaturedMockProjects(options), [])
    assert.equal(await getMockProject('reforestacion-chiquitana', options), null)
  })
  it('permite reproducir un error y reintentar con éxito', async () => {
    await assert.rejects(listMockProjects({ scenario: 'error', delayMs: 0 }), MockProjectError)
    assert.equal((await listMockProjects({ delayMs: 0 })).length, 6)
  })
  it('conserva la promesa pendiente durante la carga simulada', async () => {
    let settled = false
    const pending = listMockProjects({ delayMs: 25 }).then(() => { settled = true })
    await Promise.resolve()
    assert.equal(settled, false)
    await pending
    assert.equal(settled, true)
  })
  it('cancela solicitudes en curso o previamente canceladas', async () => {
    const controller = new AbortController()
    const pending = listMockProjects({ delayMs: 5000, signal: controller.signal })
    controller.abort()
    await assert.rejects(pending, { name: 'AbortError' })
    await assert.rejects(listMockProjects({ signal: controller.signal, delayMs: 0 }), { name: 'AbortError' })
  })
})
