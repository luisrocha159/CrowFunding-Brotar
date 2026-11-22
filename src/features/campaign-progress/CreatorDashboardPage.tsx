import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { EmptyState, Message } from '../../shared/components/Feedback'
import { usePublicSession } from '../access/session/useHeaderSession'
import { SessionError } from '../../shared/api/sessionError'
import { failureText } from './progressClient'
import { creatorActions, readCreatorDashboard, type CreatorScope, type DashboardItem, type DashboardPage } from './creatorDashboardClient'
import { projectStatusNames } from '../campaigns/projectsClient'
import { DashboardMetrics } from './DashboardMetrics'
import styles from './dashboard.module.css'

const percent = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 })

function money(value: string, currency: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return 'Importe no disponible'
  const [whole, fraction = '00'] = value.split('.')
  return `${BigInt(whole!).toLocaleString('es-BO')},${fraction.padEnd(2, '0')} ${currency}`
}

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
  return <div className={styles.page}>
    <header className={styles.header}>
      <div><h1>Panel del creador</h1><p>Consulta tus campañas y las de las organizaciones que representas.</p></div>
      <ButtonLink to="/crear-campana">Preparar campaña</ButtonLink>
    </header>
    <nav className={styles.quickLinks} aria-label="Accesos del creador">
      <Link to="/mis-proyectos">Revisión y observaciones</Link>
      <Link to="/mi-verificacion">Mi verificación</Link>
      <Link to="/mis-organizaciones">Mis organizaciones</Link>
      <Link to="/mi-cuenta">Correo y notificaciones</Link>
    </nav>
    <div className={styles.scope}>
      <h2>Mis campañas</h2>
      <label>Mostrar campañas de
        <select value={scope} onChange={e => { setScope(e.target.value as CreatorScope); setPage(1) }}>
          <option value="all">Todas mis iniciativas</option><option value="personal">Iniciativas personales</option>
          <option value="institutional">Organizaciones que represento</option>
        </select>
      </label>
    </div>
    <CreatorResults key={`${scope}:${page}`} scope={scope} page={page} onPage={setPage} />
  </div>
}

export function CreatorCampaignCard({ item }: { item: DashboardItem }) {
  const hasGoal = item.goalAmount !== null && Number(item.goalAmount) > 0
  const demoPercent = Number(item.demoFundingPercent)
  return <article className={styles.card}>
    <header className={styles.cardHeader}>
      <div><p className={styles.muted}>{item.organizationName ?? 'Iniciativa personal'}</p><h3>{item.title}</h3></div>
      <span className={styles.badge}>{projectStatusNames[item.status] ?? 'Otro estado'}</span>
    </header>
    {item.currencyCode ? <div className={styles.funding}>
      <span>Aportes simulados</span><strong>{money(item.demoAmountRaised, item.currencyCode)}</strong>
      {hasGoal && item.goalAmount !== null ? <>
        <progress aria-label={`Financiamiento simulado de ${item.title}`} max={100} value={Math.min(demoPercent, 100)}
          aria-valuetext={`${percent.format(demoPercent)} % de la meta`} />
        <span>{percent.format(demoPercent)} % de la meta de {money(item.goalAmount, item.currencyCode)}</span>
      </> : <span>Meta pendiente de definir</span>}
      <small>Recaudación real · {money(item.amountRaised, item.currencyCode)}
        {hasGoal && ` (${percent.format(Number(item.fundingPercent))} % de la meta)`}</small>
    </div> : <p className={styles.muted}>Moneda y meta pendientes de definir.</p>}
    <div className={styles.meta}>
      <span>{item.activityProgress === null ? 'Sin actividades planificadas' : `Avance medio de actividades: ${percent.format(Number(item.activityProgress))} %`}</span>
      <span>{item.updateCount} {item.updateCount === 1 ? 'novedad publicada' : 'novedades publicadas'}</span>
    </div>
    <DashboardMetrics items={[
      { label: 'Actividades o hitos pendientes', value: item.pendingActivities },
      { label: 'Recompensas pendientes', value: item.pendingRewards },
      { label: 'Incidencias abiertas', value: item.pendingCases, attention: item.pendingCases > 0 },
    ]} />
    <nav className={styles.actions} aria-label={`Acciones de ${item.title}`}>
      {creatorActions(item).map(action => <Link key={action.href} to={action.href}>{action.label}</Link>)}
    </nav>
  </article>
}

function CreatorResults({ scope, page, onPage }: { scope: CreatorScope; page: number; onPage: (page: number) => void }) {
  const [data, setData] = useState<DashboardPage | null>(null)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    readCreatorDashboard(page, scope, c.signal).then(value => { if (!c.signal.aborted) setData(value) }).catch(e => {
      if (!c.signal.aborted) {
        if (e instanceof SessionError && e.status === 401) setExpired(true)
        else setError(failureText(e))
      }
    })
    return () => c.abort()
  }, [page, scope, retry])
  if (expired) return <Navigate replace to="/iniciar-sesion?continuar=%2Fpanel-creador" />
  if (error) return <><Message tone="error" title="No se pudo cargar el panel">{error}</Message>
    <div><Button onClick={() => { setError(''); setRetry(v => v + 1) }}>Reintentar panel</Button></div></>
  if (!data) return <p role="status">Cargando indicadores y pendientes…</p>
  if (!data.total) return <EmptyState title="Sin campañas en esta selección" description="Puedes cambiar el filtro para consultar otras iniciativas que administras."
    action={page > 1 && <Button variant="secondary" onClick={() => onPage(1)}>Volver a la primera página</Button>} />
  return <>
    <section className={styles.section} aria-label="Indicadores de todas las campañas del ámbito">
      <h2>Resumen de {data.total} {data.total === 1 ? 'campaña' : 'campañas'}</h2>
      <DashboardMetrics items={data.states.map(row => ({ id: row.status, label: projectStatusNames[row.status] ?? 'Otro estado', value: row.count }))} />
      {data.funding.length > 0 && <div className={styles.grid}>{data.funding.map(f => <section key={f.currencyCode} className={styles.card}>
        <h3>Recaudación neta en {f.currencyCode}</h3>
        <DashboardMetrics items={[
          { label: 'Aportes simulados', value: money(f.demoAmountRaised, f.currencyCode) },
          { label: 'Fondos reales', value: money(f.amountRaised, f.currencyCode) },
        ]} />
        <p className={styles.muted}>Los importes descuentan las devoluciones completadas.</p>
      </section>)}</div>}
    </section>
    {data.items.length ? <section className={styles.section} aria-label="Detalle de campañas">
      <h2>Detalle por campaña</h2>
      <div className={styles.grid}>{data.items.map(item => <CreatorCampaignCard key={item.id} item={item} />)}</div>
    </section> : <EmptyState title="Sin campañas en esta página" description="Vuelve a la página anterior para consultar tus campañas." />}
    <nav className={styles.actions} aria-label="Paginación de campañas">
      <Button variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>Anterior</Button>
      <span>Página {page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
      <Button variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => onPage(page + 1)}>Siguiente</Button>
    </nav>
  </>
}
