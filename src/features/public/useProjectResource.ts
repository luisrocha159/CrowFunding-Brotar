import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMockProject, listFeaturedMockProjects, listMockProjects } from '../../mocks/projects/projectService'
import type { Project } from '../../shared/types/project'

type Resource = { key: string; status: 'ready' | 'error'; projects: readonly Project[] }

export function useProjectResource({ featured = false, slug }: { featured?: boolean; slug?: string } = {}) {
  const [params, setParams] = useSearchParams()
  const scenario = params.get('estado') ?? 'normal'
  const [attempt, setAttempt] = useState(0)
  const [resource, setResource] = useState<Resource | null>(null)
  const key = JSON.stringify([featured, slug, scenario, attempt])

  useEffect(() => {
    const controller = new AbortController()
    const options = {
      signal: controller.signal,
      scenario: scenario === 'error' ? 'error' as const : scenario === 'vacio' ? 'empty' as const : 'success' as const,
      delayMs: scenario === 'carga' ? 1800 : 350
    }
    const request = slug !== undefined
      ? getMockProject(slug, options).then(project => project ? [project] : [])
      : featured ? listFeaturedMockProjects(options) : listMockProjects(options)
    request.then(projects => {
      if (!controller.signal.aborted) setResource({ key, status: 'ready', projects })
    }).catch(() => {
      if (!controller.signal.aborted) setResource({ key, status: 'error', projects: [] })
    })
    return () => controller.abort()
  }, [key, featured, slug, scenario])

  function retry() {
    const next = new URLSearchParams(params)
    next.delete('estado')
    setParams(next, { replace: true, preventScrollReset: true })
    setAttempt(value => value + 1)
  }

  return { status: resource?.key === key ? resource.status : 'loading' as const, projects: resource?.key === key ? resource.projects : [], retry }
}
