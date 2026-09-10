import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { EmptyState, ErrorState, Message, ProjectCardSkeleton } from '../../../shared/components/Feedback'
import { ProjectCard } from '../../../shared/components/ProjectCard'
import { campaignTypeLabels, type CampaignType } from '../../../shared/types/project'
import { DemoNotice, DemoStates } from '../PublicDemo'
import { useProjectResource } from '../useProjectResource'
import { queryProjects } from './projectQuery'
import { changeProjectParams, clearProjectFilters, filterParamKeys, readProjectParams } from './projectParams'
import shared from '../public.module.css'
import styles from './explore.module.css'

export function ProjectCatalog({ search = false }: { search?: boolean }) {
  const [params, setParams] = useSearchParams()
  const resource = useProjectResource()
  const resultsRef = useRef<HTMLElement>(null)
  const { query, issues, options } = readProjectParams(params, resource.projects)
  const result = queryProjects(issues.length ? [] : resource.projects, query)
  const active = filterParamKeys.filter(key => params.get(key))
  const loading = resource.status === 'loading'
  function change(key: string, value: string) {
    setParams(changeProjectParams(params, key, value), { preventScrollReset: true })
  }
  function clear() { setParams(clearProjectFilters(params), { preventScrollReset: true }) }
  function page(value: number) {
    change('pagina', String(value))
    resultsRef.current?.focus({ preventScroll: true })
    resultsRef.current?.scrollIntoView({ block: 'start' })
  }
  return <>
    <div className={shared.sectionHeading}><div><p className="eyebrow">Descubre iniciativas con propósito</p><h1>{search ? 'Encuentra el proyecto que te inspira' : 'Explorar proyectos'}</h1><p className="lead">Conoce sus historias, revisa sus metas y descubre cómo buscan transformar su entorno.</p></div>
      {!search && <ButtonLink to={`/explorar/buscar${params.size ? `?${params}` : ''}`}>Búsqueda y filtros</ButtonLink>}
    </div>
    <DemoNotice />
    {search && <section className={styles.toolbar} aria-label="Búsqueda y filtros">
      <form className={styles.searchForm} onSubmit={event => {
        event.preventDefault()
        const value = new FormData(event.currentTarget).get('busqueda')?.toString().trim() ?? ''
        change('q', value)
      }}>
        <FormField key={params.get('q') ?? ''} label="Buscar proyectos" name="busqueda" type="search" defaultValue={query.text} placeholder="Proyecto, organización o causa…" />
        <Button type="submit">Buscar</Button>
      </form>
      <div className={styles.filters}>
        <FormField as="select" label="Categoría" value={query.category} disabled={resource.status !== 'ready'} onChange={event => change('categoria', event.target.value)}><option value="">Todas las categorías</option>{query.category && !options.categories.includes(query.category) && <option value={query.category}>{query.category} (no disponible)</option>}{options.categories.map(value => <option key={value}>{value}</option>)}</FormField>
        <FormField as="select" label="Ubicación" value={query.location} disabled={resource.status !== 'ready'} onChange={event => change('ubicacion', event.target.value)}><option value="">Toda Bolivia</option>{query.location && !options.locations.includes(query.location) && <option value={query.location}>{query.location} (no disponible)</option>}{options.locations.map(value => <option key={value}>{value}</option>)}</FormField>
        <FormField as="select" label="Tipo de campaña" value={query.campaignType ?? ''} disabled={resource.status !== 'ready'} onChange={event => change('tipo', event.target.value)}><option value="">Todas las modalidades</option>{query.campaignType && !options.campaignTypes.includes(query.campaignType) && <option value={query.campaignType}>{query.campaignType} (no disponible)</option>}{options.campaignTypes.map(value => <option key={value} value={value}>{campaignTypeLabels[value]}</option>)}</FormField>
      </div>
    </section>}
    {active.length > 0 && <div className={styles.chips} aria-label="Filtros aplicados"><strong>Filtros aplicados:</strong>{active.map(key => {
      const value = params.get(key)!
      const label = key === 'tipo' && Object.hasOwn(campaignTypeLabels, value) ? campaignTypeLabels[value as CampaignType] : value
      return <button key={key} type="button" aria-label={`Quitar filtro ${label}`} onClick={() => change(key, '')}>{label} <span aria-hidden="true">×</span></button>
    })}<button type="button" onClick={clear}>Limpiar filtros</button></div>}
    <section ref={resultsRef} tabIndex={-1} className={styles.results} aria-label="Resultados de proyectos">
      <div className={styles.resultsBar}><div><h2>Proyectos para descubrir</h2><p role="status">{loading ? 'Cargando proyectos…' : resource.status === 'error' ? 'Listado no disponible' : `${result.total} ${result.total === 1 ? 'proyecto encontrado' : 'proyectos encontrados'}`}</p></div>
        <FormField as="select" label="Ordenar por" value={query.sort} onChange={event => change('orden', event.target.value)}><option value="featured">Destacados primero</option><option value="newest">Más recientes</option><option value="progress">Mayor avance</option><option value="ending-soon">Próximos a finalizar</option></FormField>
      </div>
      {loading ? <div className={shared.grid}>{[1,2,3].map(id => <ProjectCardSkeleton key={id} />)}</div>
        : resource.status === 'error' ? <ErrorState action={<Button onClick={resource.retry}>Reintentar</Button>} />
        : <>{issues.length > 0 && <Message tone="warning" title="Revisa los filtros">{issues.join(' ')}</Message>}
          {result.total === 0 ? <EmptyState title={active.length ? 'No se encontraron proyectos' : 'Todavía no hay campañas disponibles'} description={active.length ? `No hay coincidencias para ${active.map(key => params.get(key)).join(', ')}. Prueba otros criterios.` : 'Puedes volver al inicio o restablecer la muestra para seguir explorando.'} action={active.length ? <Button onClick={clear}>Limpiar filtros</Button> : <div className={shared.actions}><Button onClick={resource.retry}>Restablecer muestra</Button><ButtonLink variant="secondary" to="/">Volver al inicio</ButtonLink></div>} />
            : <><div className={shared.grid}>{result.items.map(project => <ProjectCard key={project.id} project={project} />)}</div><nav className={styles.pagination} aria-label="Paginación de proyectos"><Button variant="secondary" disabled={result.page <= 1} onClick={() => page(result.page - 1)}>Anterior</Button><span>Página {result.page} de {result.totalPages}</span><Button variant="secondary" disabled={!result.hasMore} onClick={() => page(result.page + 1)}>Siguiente</Button></nav></>}
        </>}
    </section>
    <DemoStates />
  </>
}
