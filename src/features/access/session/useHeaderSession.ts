import { useEffect, useState } from 'react'
import { currentUser, SESSION_CHANGED, type CurrentUser } from './sessionClient'

/** Estado mínimo de la cabecera; la API sigue siendo la autoridad sobre la sesión. */
export function useHeaderSession(): { user: CurrentUser | null; checking: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active: AbortController | null = null
    const refresh = () => {
      active?.abort()
      const request = new AbortController()
      active = request
      void currentUser(request.signal).then(result => {
        if (!request.signal.aborted) setUser(result)
      }).catch(() => {
        if (!request.signal.aborted) setUser(null)
      }).finally(() => {
        if (!request.signal.aborted) setChecking(false)
      })
    }
    refresh()
    window.addEventListener(SESSION_CHANGED, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      active?.abort()
      window.removeEventListener(SESSION_CHANGED, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return { user, checking }
}
