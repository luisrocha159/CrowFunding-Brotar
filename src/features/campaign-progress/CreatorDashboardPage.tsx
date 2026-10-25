import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { usePublicSession } from '../access/session/useHeaderSession'
import { SessionError } from '../../shared/api/sessionError'
import { creatorDashboard, failureText, type CreatorItem } from './progressClient'
import { projectStatusNames } from '../campaigns/projectsClient'
import styles from './progress.module.css'
export function CreatorDashboardPage() {
  const session = usePublicSession()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar la sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to="/iniciar-sesion?continuar=%2Fpanel-creador" />
  return <CreatorResults key={session.user.id} />
}
function CreatorResults() {
  const [items, setItems] = useState<CreatorItem[] | null>(null); const [error, setError] = useState(''); const [expired, setExpired] = useState(false); const [retry, setRetry] = useState(0)
  useEffect(() => { const c = new AbortController(); creatorDashboard(c.signal).then(value => { if (!c.signal.aborted) { setItems(value); setError('') } }).catch(e => { if (!c.signal.aborted) { if (e instanceof SessionError && e.status === 401) setExpired(true); else setError(failureText(e)) } }); return () => c.abort() }, [retry])
  if (expired) return <Navigate replace to="/iniciar-sesion?continuar=%2Fpanel-creador" />
  const states = items ? Object.entries(items.reduce<Record<string, number>>((map, item) => ({ ...map, [item.status]: (map[item.status] ?? 0) + 1 }), {})) : []
  return <div className={styles.page}><h1>Panel del creador</h1><p>Tus últimos 100 proyectos propios y organizaciones que actualmente representas. Los montos excluyen pagos de prueba.</p><nav className={styles.actions}><Link to="/crear-campana">Preparar campaña</Link><Link to="/mis-proyectos">Revisión y observaciones</Link><Link to="/mi-verificacion">Mi verificación</Link><Link to="/mis-incidencias">Mis incidencias</Link></nav>
    {error && <><p role="alert">{error}</p><Button onClick={() => setRetry(v => v + 1)}>Reintentar</Button></>}{!items && !error && <p role="status">Cargando panel…</p>}
    {items && <><dl className={styles.summary}>{states.map(([state, count]) => <div key={state}><dt>{projectStatusNames[state] ?? state}</dt><dd>{count}</dd></div>)}</dl>{!items.length && <p>Todavía no tienes proyectos disponibles en este panel. Puedes preparar tu primera campaña.</p>}
      <div className={styles.grid}>{items.map(item => <article className={styles.card} key={item.id}><h2>{item.title}</h2><p>{item.organizationName ?? 'Iniciativa personal'} · {projectStatusNames[item.status] ?? item.status}</p><p>{item.currencyCode ? `${item.currencyCode} ${item.amountRaised} confirmados netos de reembolsos · Meta ${item.goalAmount ?? 'sin definir'}` : 'Moneda y meta aún por definir'}</p><p>Actividades: {item.activityProgress === null ? 'sin planificación' : `${item.activityProgress}% promedio`} · {item.updateCount} novedades publicadas</p><div className={styles.actions}><Link to={`/mis-proyectos/${item.id}`}>Revisar proyecto</Link><Link to={`/mis-proyectos/${item.id}/avances`}>Avances y novedades</Link><Link to={`/mis-proyectos/${item.id}/rendicion`}>Rendición registrada</Link><Link to={`/mis-incidencias/nueva?campaignId=${item.id}`}>Solicitar soporte</Link></div></article>)}</div></>}
  </div>
}
