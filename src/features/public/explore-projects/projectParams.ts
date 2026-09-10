import type { CampaignType, Project } from '../../../shared/types/project'
import { getProjectFilterOptions, type ProjectQuery, type ProjectSort } from './projectQuery'

export const filterParamKeys = ['q', 'categoria', 'ubicacion', 'tipo'] as const
export function readProjectParams(params: URLSearchParams, projects: readonly Project[]) {
  const options = getProjectFilterOptions(projects)
  const type = params.get('tipo') ?? ''
  const category = params.get('categoria') ?? ''
  const location = params.get('ubicacion') ?? ''
  const sort = params.get('orden') ?? 'featured'
  const issues: string[] = []
  if (type && !options.campaignTypes.includes(type as CampaignType)) issues.push('El tipo de campaña seleccionado no está disponible.')
  if (category && !options.categories.includes(category)) issues.push('La categoría seleccionada no está disponible.')
  if (location && !options.locations.includes(location)) issues.push('La ubicación seleccionada no está disponible.')
  const sorts: ProjectSort[] = ['featured', 'newest', 'progress', 'ending-soon']
  const query: ProjectQuery = {
    text: params.get('q') ?? '', category, location,
    campaignType: type ? type as CampaignType : undefined,
    sort: sorts.includes(sort as ProjectSort) ? sort as ProjectSort : 'featured',
    page: Number(params.get('pagina') ?? '1'), pageSize: 3
  }
  return { query, issues, options }
}

export function changeProjectParams(params: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value)
  else next.delete(key)
  if (key !== 'pagina') next.delete('pagina')
  return next
}

export function clearProjectFilters(params: URLSearchParams) {
  const next = new URLSearchParams(params)
  for (const key of [...filterParamKeys, 'pagina']) next.delete(key)
  return next
}
