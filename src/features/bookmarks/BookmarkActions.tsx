import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { usePublicSession } from '../access/session/useHeaderSession'
import { readBookmarkState, setBookmark, type BookmarkKind, type BookmarkState } from './bookmarksClient'
import styles from '../public/project-detail/detail.module.css'

export function BookmarkActions({ campaignId }: { campaignId: string }) {
  const session = usePublicSession()
  const location = useLocation()
  if (session.checking) return <p role="status">Comprobando tu cuenta…</p>
  if (session.unavailable) return <Button variant="secondary" onClick={session.retry}>Comprobar sesión para guardar o seguir</Button>
  if (!session.user) return <Link to={`/iniciar-sesion?continuar=${encodeURIComponent(location.pathname)}`}>Inicia sesión para guardar o seguir novedades</Link>
  return <OwnBookmarkActions key={`${session.user.id}:${campaignId}`} campaignId={campaignId} />
}
function OwnBookmarkActions({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<BookmarkState | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const active = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    readBookmarkState(campaignId, controller.signal).then(value => { if (!controller.signal.aborted) { setState(value); setError('') } }).catch(() => { if (!controller.signal.aborted) setError('No pudimos consultar tus preferencias. Reintenta.') })
    return () => { controller.abort(); active.current?.abort() }
  }, [campaignId, attempt])
  async function change(kind: BookmarkKind, enabled: boolean) {
    if (active.current) return
    const controller = new AbortController(); active.current = controller; setBusy(true); setError('')
    try { const next = await setBookmark(campaignId, kind, enabled, controller.signal); if (!controller.signal.aborted) setState(next) }
    catch { if (!controller.signal.aborted) setError('No pudimos confirmar el cambio. Comprueba tu sesión y reintenta; no cambiamos la selección mostrada.') }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  return <section className={styles.preferences} aria-label="Guardar o seguir campaña">
    <div className={styles.preferenceHeader}><h2>Tu seguimiento</h2><Link to="/mis-guardados">Ver mis guardados</Link></div>
    {error && <p role="alert">{error}</p>}
    {!state ? error ? <Button variant="secondary" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar preferencias</Button> : <p role="status">Cargando preferencias…</p> : <div className={styles.preferenceButtons}>
      <Button variant="secondary" aria-pressed={state.favorite} disabled={busy} onClick={() => { void change('FAVORITE', !state.favorite) }}>{state.favorite ? 'Quitar de guardadas' : 'Guardar campaña'}</Button>
      <Button variant="secondary" aria-pressed={state.following} disabled={busy} onClick={() => { void change('FOLLOW', !state.following) }}>{state.following ? 'Dejar de seguir novedades' : 'Seguir novedades'}</Button>
    </div>}
  </section>
}
