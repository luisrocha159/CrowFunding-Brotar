import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPublicCampaign, listPublicCampaigns } from './campaignsApi'
import type { Project } from '../../shared/types/project'

type Resource = { key: string; status: 'ready' | 'error'; projects: readonly Project[] }

export function useProjectResource({ featured = false, slug }: { featured?: boolean; slug?: string } = {}) {
  const [params, setParams] = useSearchParams()
  const [attempt, setAttempt] = useState(0)
  const [resource, setResource] = useState<Resource | null>(null)
  const key = JSON.stringify([featured, slug, attempt])

  useEffect(() => {
    const controller = new AbortController()
    const request = slug !== undefined ? getPublicCampaign(slug, controller.signal).then(project => project ? [project] : []) : listPublicCampaigns(controller.signal).then(projects => featured ? projects.slice(0, 3) : projects)
    request.then(projects => {
      if (!controller.signal.aborted) setResource({ key, status: 'ready', projects })
    }).catch(() => {
      if (!controller.signal.aborted) setResource({ key, status: 'error', projects: [] })
    })
    return () => controller.abort()
  }, [key, featured, slug])

  function retry() {
    const next = new URLSearchParams(params)
    setParams(next, { replace: true, preventScrollReset: true })
    setAttempt(value => value + 1)
  }

  return { status: resource?.key === key ? resource.status : 'loading' as const, projects: resource?.key === key ? resource.projects : [], retry }
}
