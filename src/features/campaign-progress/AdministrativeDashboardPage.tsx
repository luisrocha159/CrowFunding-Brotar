import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { usePublicSession } from '../access/session/useHeaderSession'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import layout from '../campaigns/projects.module.css'
import { failureText } from './progressClient'
import { projectStatusNames } from '../campaigns/projectsClient'
import styles from './progress.module.css'
interface Dashboard { readOnly: boolean; campaigns: { status: string; count: number }[]; catalogs: { active: number; inactive: number }; parties: { users: number; organizations: number } }
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
function from(v: unknown): Dashboard { if (!object(v) || typeof v.readOnly !== 'boolean' || !Array.isArray(v.campaigns) || !v.campaigns.every(c => object(c) && typeof c.status === 'string' && Number.isSafeInteger(c.count)) || !object(v.catalogs) || !Number.isSafeInteger(v.catalogs.active) || !Number.isSafeInteger(v.catalogs.inactive) || !object(v.parties) || !Number.isSafeInteger(v.parties.users) || !Number.isSafeInteger(v.parties.organizations)) throw new SessionError(0); return v as unknown as Dashboard }
export function AdministrativeDashboardPage() {
  const session = usePublicSession()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar la sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to="/iniciar-sesion?continuar=%2Fadministracion" />
  return <Results key={session.user.id} />
}
function Results() {
  const [data, setData] = useState<Dashboard | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0)
  useEffect(() => { const c = new AbortController(); requestApi('/api/administration/dashboard', { signal: c.signal }).then(readJson).then(from).then(value => { if (!c.signal.aborted) { setData(value); setError('') } }).catch(e => { if (!c.signal.aborted) setError(failureText(e)) }); return () => c.abort() }, [retry])
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={`${layout.content} ${styles.page}`}><h1>Resumen administrativo</h1><p>Datos actuales de los módulos habilitados para administración y auditoría.</p>{error && <><p role="alert">{error}</p><Button onClick={() => setRetry(v => v + 1)}>Reintentar</Button></>}{!data && !error && <p role="status">Cargando resumen…</p>}{data && <>
    {data.readOnly && <p>Modo auditor: solo consulta.</p>}<section className={styles.card}><h2>Campañas por estado</h2>{!data.campaigns.length ? <p>No hay campañas registradas.</p> : <dl className={styles.summary}>{data.campaigns.map(row => <div key={row.status}><dt>{projectStatusNames[row.status] ?? row.status}</dt><dd>{row.count}</dd></div>)}</dl>}<Link to="/administracion/campanas">Revisar campañas y observaciones</Link></section>
    <div className={styles.grid}><section className={styles.card}><h2>Personas y organizaciones</h2><p>{data.parties.users} cuentas · {data.parties.organizations} organizaciones</p><Link to="/administracion/personas">Consultar registros y representaciones</Link></section><section className={styles.card}><h2>Catálogos</h2><p>{data.catalogs.active} categorías activas · {data.catalogs.inactive} inactivas</p><Link to="/administracion/catalogos">Consultar categorías y parámetros</Link></section></div>
    <section className={styles.card}><h2>Módulos pendientes de habilitación</h2><p>Las decisiones de verificación, resolución de incidencias, rendición y operaciones financieras necesitan sus reglas y permisos aprobados. Este resumen no muestra alertas ni cifras de módulos que todavía no están habilitados.</p></section>
  </>}</section></div>
}
