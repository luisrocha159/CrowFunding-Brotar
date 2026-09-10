import { campaignTypeLabels, type CampaignType, type Project } from '../../../shared/types/project'
import { getProgressPercentage } from '../../../shared/utils/project'

export type ProjectSort = 'featured' | 'newest' | 'progress' | 'ending-soon'
export type ProjectFilters = { text?: string; category?: string; location?: string; campaignType?: CampaignType }
export type ProjectQuery = ProjectFilters & { sort?: ProjectSort; page?: number; pageSize?: number }

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ')
}

export function getProjectFilterOptions(source: readonly Project[]) {
  const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'))
  return {
    categories: unique(source.map(project => project.category)),
    locations: unique(source.map(project => project.location)),
    campaignTypes: (Object.keys(campaignTypeLabels) as CampaignType[]).filter(type => source.some(project => project.campaignType === type))
  }
}

/** Filters combine with AND. Each search word may match a different public field. */
export function queryProjects(source: readonly Project[], query: ProjectQuery = {}) {
  const words = normalizeSearch(query.text ?? '').split(' ').filter(Boolean)
  const filtered = source.filter(project => {
    const searchable = normalizeSearch([project.name, project.summary, project.description, project.creator, project.category, project.location, campaignTypeLabels[project.campaignType]].join(' '))
    return words.every(word => searchable.includes(word))
      && (!query.category || normalizeSearch(project.category) === normalizeSearch(query.category))
      && (!query.location || normalizeSearch(project.location) === normalizeSearch(query.location))
      && (!query.campaignType || project.campaignType === query.campaignType)
  })
  const sort = query.sort ?? 'featured'
  filtered.sort((a, b) => {
    let order = 0
    if (sort === 'newest') order = b.publishedAt.localeCompare(a.publishedAt)
    if (sort === 'progress') order = getProgressPercentage(b) - getProgressPercentage(a)
    if (sort === 'featured') order = Number(b.featured) - Number(a.featured)
    if (sort === 'ending-soon') {
      order = Number(b.status === 'active') - Number(a.status === 'active')
      if (!order && a.status === 'active' && b.status === 'active') order = a.daysRemaining - b.daysRemaining
    }
    return order || a.id.localeCompare(b.id)
  })
  const pageSize = Number.isFinite(query.pageSize) ? Math.min(24, Math.max(1, Math.floor(query.pageSize!))) : 6
  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const requestedPage = Number.isFinite(query.page) ? Math.max(1, Math.floor(query.page!)) : 1
  const page = Math.min(requestedPage, Math.max(1, totalPages))
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages, hasMore: page < totalPages }
}
