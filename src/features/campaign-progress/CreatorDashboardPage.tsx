import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { usePublicSession } from '../access/session/useHeaderSession'
import { SessionError } from '../../shared/api/sessionError'
import { failureText } from './progressClient'
import { creatorActions, readCreatorDashboard, type CreatorScope, type DashboardPage } from './creatorDashboardClient'
import { projectStatusNames } from '../campaigns/projectsClient'
import styles from './progress.module.css'

export function CreatorDashboardPage() {
  const session = usePublicSession()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar la sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to="/iniciar-sesion?continuar=%2Fpanel-creador" />
  return <CreatorPanel key={session.user.id} />
}
function CreatorPanel() {
  const [scope, setScope] = useState<CreatorScope>('all')
  const [page, setPage] = useState(1)
  return <div className={styles.page}><h1>Panel del creador</h1>
    <p>Campañas propias y de organizaciones que representas actualmente. La recaudación real y la demostración se muestran por separado, netas de devoluciones completadas.</p>
    <nav className={styles.actions} aria-label="Accesos del creador"><Link to="/crear-campana">Preparar campaña</Link><Link to="/mis-proyectos">Revisión y observaciones</Link><Link to="/mi-verificacion">Mi verificación</Link><Link to="/mis-organizaciones">Mis organizaciones</Link><Link to="/mi-cuenta">Correo y notificaciones</Link></nav>
    <label>Ámbito de los indicadores <select value={scope} onChange={e => { setScope(e.target.value as CreatorScope); setPage(1) }}><option value="all">Todas mis campañas</option><option value="personal">Iniciativas personales</option><option value="institutional">Organizaciones que represento</option></select></label>
    <CreatorResults key={`${scope}:${page}`} scope={scope} page={page} onPage={setPage} />
  </div>
}
function CreatorResults({ scope, page, onPage }: { scope: CreatorScope; page: number; onPage: (page: number) => void }) {
  const [data, setData] = useState<DashboardPage | null>(null)
  const [error, setError] = useState(''); const [expired, setExpired] = useState(false); const [retry, setRetry] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    readCreatorDashboard(page, scope, c.signal).then(value => { if (!c.signal.aborted) { setData(value); setError('') } }).catch(e => { if (!c.signal.aborted) { if (e instanceof SessionError && e.status === 401) setExpired(true); else setError(failureText(e)) } })
    return () => c.abort()
  }, [page, scope, retry])
  if (expired) return <Navigate replace to="/iniciar-sesion?continuar=%2Fpanel-creador" />
  return <>
    {error && <><p role="alert">{error}</p><Button onClick={() => setRetry(v => v + 1)}>Reintentar panel</Button></>}
    {!data && !error && <p role="status">Cargando indicadores y pendientes…</p>}
    {data && <>
      <section aria-label="Indicadores de todas las campañas del ámbito"><h2>Resumen de {data.total} {data.total === 1 ? 'campaña' : 'campañas'}</h2>
        <dl className={styles.summary}>{data.states.map(s => <div key={s.status}><dt>{projectStatusNames[s.status] ?? s.status}</dt><dd>{s.count}</dd></div>)}</dl>
        <div className={styles.grid}>{data.funding.map(f => <div className={styles.card} key={f.currencyCode}><h3>{f.currencyCode}</h3><p>Recaudación real: {f.amountRaised}</p><p>DEMO · sin dinero real: {f.demoAmountRaised}</p></div>)}</div>
      </section>
      {!data.items.length && <p>{data.total ? 'No hay campañas en esta página.' : 'Todavía no tienes campañas disponibles en este ámbito.'}</p>}
      <div className={styles.grid}>{data.items.map(item => <article className={styles.card} key={item.id}>
        <h2>{item.title}</h2><p>{item.organizationName ?? 'Iniciativa personal'} · {projectStatusNames[item.status] ?? item.status}</p>
        {item.currencyCode ? <><p>{item.currencyCode} {item.amountRaised} reales · {item.fundingPercent}% de la meta</p><p>DEMO: {item.currencyCode} {item.demoAmountRaised} · {item.demoFundingPercent}% de la meta</p><p>Meta: {item.goalAmount ?? 'sin definir'}</p></> : <p>Moneda y meta aún por definir.</p>}
        <p>Actividades: {item.activityProgress === null ? 'sin planificación' : `${item.activityProgress}% promedio`} · {item.updateCount} novedades publicadas</p>
        <p>{item.pendingActivities} {item.pendingActivities === 1 ? 'actividad o hito pendiente' : 'actividades o hitos pendientes'} · {item.pendingRewards} {item.pendingRewards === 1 ? 'recompensa pendiente' : 'recompensas pendientes'} · {item.pendingCases} {item.pendingCases === 1 ? 'incidencia abierta' : 'incidencias abiertas'}</p>
        <nav className={styles.actions} aria-label={`Acciones de ${item.title}`}>{creatorActions(item).map(a => <Link key={a.href} to={a.href}>{a.label}</Link>)}</nav>
      </article>)}</div>
      <nav className={styles.actions} aria-label="Paginación de campañas"><Button variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => onPage(page + 1)}>Siguiente</Button></nav>
    </>}
  </>
}
