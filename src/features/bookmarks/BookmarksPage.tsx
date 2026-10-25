import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { usePublicSession } from '../access/session/useHeaderSession'
import { SessionError } from '../../shared/api/sessionError'
import { readBookmarks, readFollowedUpdates, setBookmark, type BookmarkItem, type BookmarkPage, type FollowedUpdate, type BookmarkKind } from './bookmarksClient'
import styles from '../public/public.module.css'

type Tab = BookmarkKind | 'UPDATES'
const labels: Record<Tab, string> = { FAVORITE: 'Guardadas', FOLLOW: 'Siguiendo', UPDATES: 'Novedades' }
const states: Record<string, string> = { PUBLISHED: 'Publicada', FUNDING_ENDED: 'Financiación finalizada', IN_EXECUTION: 'En ejecución', CLOSED: 'Cerrada', CANCELLED: 'Cancelada', UNAVAILABLE: 'No disponible' }
export function BookmarksPage() {
  const session = usePublicSession()
  const [params, setParams] = useSearchParams()
  const kind = params.get('vista')
  const tab: Tab = kind === 'FOLLOW' || kind === 'UPDATES' ? kind : 'FAVORITE'
  const rawPage = Number(params.get('pagina') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><h1>Mis campañas y novedades</h1><p role="alert">No pudimos comprobar tu sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate to={`/iniciar-sesion?continuar=${encodeURIComponent(`/mis-guardados?${params}`)}`} replace />
  return <><h1>Mis campañas y novedades</h1><p>Tu lista de guardadas es independiente de las campañas cuyas novedades sigues.</p>
    <nav className={styles.actions} aria-label="Mis listas">{(['FAVORITE', 'FOLLOW', 'UPDATES'] as const).map(value => <Link key={value} to={`?vista=${value}`} aria-current={tab === value ? 'page' : undefined}>{labels[value]}</Link>)}</nav>
    <BookmarkResults key={`${session.user.id}:${tab}:${page}`} tab={tab} page={page} goPage={next => setParams({ vista: tab, pagina: String(next) })} />
  </>
}
function BookmarkResults({ tab, page, goPage }: { tab: Tab; page: number; goPage: (page: number) => void }) {
  const [data, setData] = useState<BookmarkPage<BookmarkItem | FollowedUpdate> | null>(null)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const active = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const promise = tab === 'UPDATES' ? readFollowedUpdates(page, controller.signal) : readBookmarks(tab, page, controller.signal)
    promise.then(value => { if (!controller.signal.aborted) { setData(value); setError('') } }).catch(error => { if (!controller.signal.aborted) {
      if (error instanceof SessionError && error.status === 401) setExpired(true)
      else setError('No pudimos cargar esta lista. Reintenta.')
    } })
    return () => { controller.abort(); active.current?.abort() }
  }, [tab, page, attempt])
  if (expired) return <Navigate replace to="/iniciar-sesion?continuar=%2Fmis-guardados" />
  async function remove(id: string) {
    if (active.current || tab === 'UPDATES') return
    const controller = new AbortController(); active.current = controller; setBusy(id); setError('')
    try {
      await setBookmark(id, tab, false, controller.signal)
      if (!controller.signal.aborted) { setData(null); setAttempt(value => value + 1) }
    } catch { if (!controller.signal.aborted) setError('No pudimos confirmar el cambio. Reintenta.') }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(null) }
  }
  return <section aria-label={labels[tab]}><h2>{labels[tab]}</h2>
    {error && <><p role="alert">{error}</p><Button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar lista</Button></>}
    {!data && !error && <p role="status">Cargando {labels[tab].toLowerCase()}…</p>}
    {data && <>
      <p>{data.total} {tab === 'UPDATES' ? 'novedades públicas' : 'campañas'}</p>
      {!data.items.length && <p>{page > 1 ? 'Esta página está vacía. Vuelve a la anterior.' : tab === 'UPDATES' ? 'Todavía no hay novedades públicas de las campañas que sigues.' : 'Tu lista está vacía. Puedes añadir campañas desde su detalle.'} <Link to="/explorar">Explorar campañas</Link></p>}
      <div className={styles.projectGrid}>{data.items.map(item => <article className={styles.panel} key={'id' in item ? item.id : item.campaignId}>
        {'body' in item ? <><p>{item.campaignTitle}</p><h3>{item.title}</h3><p>{item.body}</p><time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleDateString('es-BO')}</time></> : <><h3>{item.title}</h3><p>{states[item.status] ?? item.status}</p></>}
        {item.slug && <p><Link to={`/proyectos/${encodeURIComponent(item.slug)}`}>Ver campaña</Link></p>}
        {!('body' in item) && <Button variant="secondary" disabled={busy !== null} onClick={() => { void remove(item.campaignId) }}>{busy === item.campaignId ? 'Actualizando…' : tab === 'FAVORITE' ? 'Quitar de guardadas' : 'Dejar de seguir'}</Button>}
      </article>)}</div>
      <nav className={styles.actions} aria-label="Paginación"><Button variant="secondary" disabled={page === 1 || busy !== null} onClick={() => goPage(page - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, Math.ceil(data.total / 20))}</span><Button variant="secondary" disabled={page * 20 >= data.total || busy !== null} onClick={() => goPage(page + 1)}>Siguiente</Button></nav>
    </>}
  </section>
}
