import { useCallback, useEffect, useRef, useState } from 'react'
import { SessionError } from '../access/session/sessionClient'
import { campaignReviewQueue, discardProject, ownProjects, projectDetail, type ProjectDetail, type ProjectSummary } from './projectsClient'

export function useProjects(admin: boolean, id?: string) {
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'anonymous' | 'forbidden' | 'missing'>('loading')
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [retry, setRetry] = useState(0)
  const [loadedKey, setLoadedKey] = useState('')
  const key = `${admin}:${id ?? 'list'}`
  const [discarding, setDiscarding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [discardError, setDiscardError] = useState(false)
  const mutation = useRef<AbortController | null>(null)
  const refresh = useCallback(() => { setState('loading'); setRetry(value => value + 1) }, [])
  useEffect(() => {
    const controller = new AbortController()
    const request = id ? projectDetail(id, admin, controller.signal).then(result => { if (!controller.signal.aborted) setDetail(result) })
      : (admin ? campaignReviewQueue(controller.signal) : ownProjects(controller.signal)).then(result => { if (!controller.signal.aborted) setProjects(result) })
    void request.then(() => { if (!controller.signal.aborted) { setLoadedKey(key); setState('ready') } }).catch(error => {
      if (controller.signal.aborted) return
      setLoadedKey(key)
      setState(error instanceof SessionError && error.status === 401 ? 'anonymous'
        : error instanceof SessionError && error.status === 403 ? 'forbidden'
        : error instanceof SessionError && error.status === 404 ? 'missing' : 'error')
    })
    return () => controller.abort()
  }, [admin, id, retry, key])
  useEffect(() => () => mutation.current?.abort(), [])
  async function discard(project: ProjectSummary) {
    if (mutation.current) return
    const controller = new AbortController(); mutation.current = controller
    setDiscarding(true); setNotice(null); setDiscardError(false)
    try {
      await discardProject(project.id, controller.signal)
      if (!controller.signal.aborted) { setNotice(`Borrador «${project.title}» descartado.`); refresh() }
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof SessionError && error.status === 401) setState('anonymous')
      else if (error instanceof SessionError && error.status === 403) setState('forbidden')
      else {
        setDiscardError(true)
        setNotice(error instanceof SessionError && [404, 409].includes(error.status)
          ? 'El borrador ya no está disponible para descartar. Actualiza la lista.'
          : 'No pudimos confirmar el descarte. Actualiza la lista antes de intentarlo nuevamente.')
      }
    } finally {
      if (mutation.current === controller) mutation.current = null
      if (!controller.signal.aborted) setDiscarding(false)
    }
  }
  return { state: loadedKey === key ? state : 'loading' as const, projects, detail, refresh, discarding, notice, discardError, discard }
}
