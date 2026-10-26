import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { usePublicSession } from '../access/session/useHeaderSession'
import {useAccessPermissions} from '../access/session/accessPermissions'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import layout from '../campaigns/projects.module.css'
import { failureText } from './progressClient'
import { projectStatusNames } from '../campaigns/projectsClient'
import styles from './progress.module.css'
interface Dashboard { readOnly: boolean; campaigns?: { status: string; count: number }[]; catalogs?: { active: number; inactive: number }; parties?: { users: number; organizations: number };supportAlerts?: {open:number;firstResponseDue:number;escalationDue:number};identityAlerts?:{awaitingReview:number;requiresInformation:number};accountabilityAlerts?:{awaitingReview:number;requiresInformation:number};closureAlerts?:{blocked:number} }
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
function from(v: unknown): Dashboard { if (!object(v) || typeof v.readOnly !== 'boolean') throw new SessionError(0);
  if(v.campaigns!==undefined && (!Array.isArray(v.campaigns)||!v.campaigns.every(c=>object(c)&&typeof c.status==='string'&&Number.isSafeInteger(c.count))))throw new SessionError(0)
  if(v.catalogs!==undefined&&(!object(v.catalogs)||!Number.isSafeInteger(v.catalogs.active)||!Number.isSafeInteger(v.catalogs.inactive)))throw new SessionError(0)
  if(v.parties!==undefined&&(!object(v.parties)||!Number.isSafeInteger(v.parties.users)||!Number.isSafeInteger(v.parties.organizations)))throw new SessionError(0)
  const fields={supportAlerts:['open','firstResponseDue','escalationDue'],identityAlerts:['awaitingReview','requiresInformation'],accountabilityAlerts:['awaitingReview','requiresInformation'],closureAlerts:['blocked']}
  for(const [key,names] of Object.entries(fields))if(v[key]!==undefined){const value=v[key];if(!object(value)||!names.every(name=>Number.isSafeInteger(value[name])&&Number(value[name])>=0))throw new SessionError(0)}
  return v as unknown as Dashboard }
export function AdministrativeDashboardPage() {
  const session = usePublicSession()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar la sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to="/iniciar-sesion?continuar=%2Fadministracion" />
  return <Results key={session.user.id} />
}
function Results() {
  const {can}=useAccessPermissions()
  const [data, setData] = useState<Dashboard | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0)
  useEffect(() => { const c = new AbortController(); requestApi('/api/administration/dashboard', { signal: c.signal }).then(readJson).then(from).then(value => { if (!c.signal.aborted) { setData(value); setError('') } }).catch(e => { if (!c.signal.aborted) setError(failureText(e)) }); return () => c.abort() }, [retry])
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={`${layout.content} ${styles.page}`}><h1>Resumen administrativo</h1><p>Datos actuales de los módulos habilitados para administración y auditoría.</p>{error && <><p role="alert">{error}</p><Button onClick={() => setRetry(v => v + 1)}>Reintentar</Button></>}{!data && !error && <p role="status">Cargando resumen…</p>}{data && <>
    {data.readOnly && <p>Modo auditor: solo consulta.</p>}{data.campaigns&&<section className={styles.card}><h2>Campañas por estado</h2>{!data.campaigns.length ? <p>No hay campañas registradas.</p> : <dl className={styles.summary}>{data.campaigns.map(row => <div key={row.status}><dt>{projectStatusNames[row.status] ?? row.status}</dt><dd>{row.count}</dd></div>)}</dl>}{can('campaign.review.read')?<Link to="/administracion/campanas">Revisar campañas y observaciones</Link>:can('campaign.lifecycle.read')?<Link to="/administracion/ciclo-campanas">Consultar ciclo de campañas</Link>:null}</section>}
    <div className={styles.grid}>{data.parties&&<section className={styles.card}><h2>Personas y organizaciones</h2><p>{data.parties.users} cuentas · {data.parties.organizations} organizaciones</p><Link to="/administracion/personas">Consultar registros y representaciones</Link></section>}{data.catalogs&&<section className={styles.card}><h2>Catálogos</h2><p>{data.catalogs.active} categorías activas · {data.catalogs.inactive} inactivas</p><Link to="/administracion/catalogos">Consultar categorías y parámetros</Link></section>}</div>
    {data.identityAlerts&&<section className={styles.card}><h2>Identidad y verificación</h2><p>{data.identityAlerts.awaitingReview} expedientes en revisión · {data.identityAlerts.requiresInformation} requieren información.</p><Link to="/administracion/verificaciones">Abrir bandeja de verificación</Link></section>}
    {data.supportAlerts&&<section className={styles.card}><h2>Atención de casos</h2><p>{data.supportAlerts.open} incidencias generales abiertas · {data.supportAlerts.firstResponseDue} sin primera respuesta fuera del objetivo · {data.supportAlerts.escalationDue} superan la meta de escalamiento.</p><p>Metas de ensayo según los parámetros actuales; no son SLA legales ni avisos de correo.</p><Link to="/administracion/soporte">Abrir bandeja de soporte</Link> · {can('catalog.read')&&<Link to="/administracion/catalogos">Consultar metas operativas</Link>}</section>}
    {data.accountabilityAlerts&&<section className={styles.card}><h2>Rendiciones</h2><p>{data.accountabilityAlerts.awaitingReview} enviadas para revisión · {data.accountabilityAlerts.requiresInformation} requieren corrección.</p><Link to="/administracion/cierre-campanas">Consultar rendiciones y cierre</Link></section>}
    {data.closureAlerts&&<section className={styles.card}><h2>Cierre de campaña</h2><p>{data.closureAlerts.blocked} campañas en ejecución o canceladas tienen pendientes operativos detectados. El ciclo de cada campaña determina los bloqueos completos de cierre.</p><Link to="/administracion/cierre-campanas">Revisar obligaciones de cierre</Link></section>}
    {!data.campaigns&&!data.parties&&!data.catalogs&&!data.identityAlerts&&!data.supportAlerts&&!data.accountabilityAlerts&&!data.closureAlerts&&<p>No hay bandejas o contadores disponibles para tus permisos actuales.</p>}
  </>}</section></div>
}
