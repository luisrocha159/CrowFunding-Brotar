import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { currentUser, SESSION_CHANGED, SessionError, type CurrentUser } from './sessionClient'

export interface HeaderSession {
  user: CurrentUser | null
  checking: boolean
  unavailable: boolean
  retry: () => void
}

/** Comparte la comprobación de la cabecera con las páginas, sin copiar tokens. */
export function usePublicSession(): HeaderSession { return useOutletContext<HeaderSession>() }

/** Estado mínimo de la cabecera; la API sigue siendo la autoridad sobre la sesión. */
export function useHeaderSession(): HeaderSession {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active: AbortController | null = null
    const refresh = () => {
      active?.abort()
      const request = new AbortController()
      active = request
      void currentUser(request.signal).then(result => {
        if (!request.signal.aborted) { setUser(result); setUnavailable(false) }
      }).catch(error => {
        if (!request.signal.aborted) {
          setUser(null)
          // Solo un 401 confirma que no hay sesión. Un fallo de red no lo confirma.
          setUnavailable(!(error instanceof SessionError && error.status === 401))
        }
      }).finally(() => {
        if (!request.signal.aborted) setChecking(false)
      })
    }
    refresh()
    const sessionChanged = () => { setUser(null); setChecking(true); refresh() }
    window.addEventListener(SESSION_CHANGED, sessionChanged)
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 60000)
    return () => {
      active?.abort()
      window.removeEventListener(SESSION_CHANGED, sessionChanged)
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [attempt])

  // Revalidar en segundo plano no desmonta un formulario que se está rellenando.
  return { user, checking, unavailable, retry: () => { setChecking(true); setAttempt(value => value + 1) } }
}
