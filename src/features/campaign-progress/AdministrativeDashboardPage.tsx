import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { readJson, requestApi } from '../../shared/api/request'
import { dashboardFrom, type Dashboard } from './dashboardClient'
import { usePublicSession } from '../access/session/useHeaderSession'
import {useAccessPermissions} from '../access/session/accessPermissions'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import layout from '../campaigns/projects.module.css'
import { failureText } from './progressClient'
import { projectStatusNames } from '../campaigns/projectsClient'
import styles from './progress.module.css'
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
  useEffect(() => { const c = new AbortController(); requestApi('/api/administration/dashboard', { signal: c.signal }).then(readJson).then(dashboardFrom).then(value => { if (!c.signal.aborted) { setData(value); setError('') } }).catch(e => { if (!c.signal.aborted) { setData(null); setError(failureText(e)) } }); return () => c.abort() }, [retry])
  const refresh=()=>{setData(null);setError('');setRetry(v=>v+1)}
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={`${layout.content} ${styles.page}`}><h1>Resumen administrativo</h1><p>Instantánea de los módulos habilitados para tu responsabilidad. No es una actualización en tiempo real.</p><Button variant="secondary" onClick={refresh} disabled={!data&&!error}>Actualizar resumen</Button>{error && <><p role="alert">{error} No se sustituyen errores por contadores cero.</p><Button onClick={refresh}>Reintentar</Button></>}{!data && !error && <p role="status">Cargando resumen…</p>}{data && <DashboardCards data={data} can={can}/>}</section></div>
}
export function DashboardCards({data,can}:{data:Dashboard;can:(permission:string)=>boolean}) {
  return <><p>Consultado: <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleString('es-BO')}</time>. Los ceros indican que no hay pendientes de ese tipo.</p>
    {data.readOnly && <p>Modo auditor: solo consulta.</p>}{data.campaigns&&<section className={styles.card}><h2>Campañas por estado</h2>{!data.campaigns.length ? <p>No hay campañas registradas.</p> : <dl className={styles.summary}>{data.campaigns.map(row => <div key={row.status}><dt>{projectStatusNames[row.status] ?? row.status}</dt><dd>{row.count}</dd></div>)}</dl>}{can('campaign.review.read')?<Link to="/administracion/campanas">Revisar campañas y observaciones</Link>:can('campaign.lifecycle.read')?<Link to="/administracion/ciclo-campanas">Consultar ciclo de campañas</Link>:null}</section>}
    <div className={styles.grid}>{data.parties&&<section className={styles.card}><h2>Personas y organizaciones</h2><p>{data.parties.users} cuentas · {data.parties.organizations} organizaciones</p><Link to="/administracion/personas">Consultar registros y representaciones</Link></section>}{data.catalogs&&<section className={styles.card}><h2>Catálogos</h2><p>{data.catalogs.active} categorías activas · {data.catalogs.inactive} inactivas</p><Link to="/administracion/catalogos">Consultar categorías y parámetros</Link></section>}</div>
    {data.identityAlerts&&<section className={styles.card}><h2>Identidad y verificación</h2><p>{data.identityAlerts.awaitingReview} expedientes en revisión · {data.identityAlerts.requiresInformation} requieren información.</p><Link to="/administracion/verificaciones">Abrir bandeja de verificación</Link></section>}
    {data.financeAlerts&&<div className={styles.grid}>
      <section className={styles.card}><h2>Pagos registrados</h2><p>{data.financeAlerts.paymentsTotal} intentos totales · {data.financeAlerts.paymentsPending} iniciados o pendientes · {data.financeAlerts.paymentsOverdue} pendientes con plazo vencido.</p><p>Los intentos pendientes no son recaudación. Incluye todos los proveedores registrados; el MVP no procesa dinero real.</p><Link to="/administracion/finanzas">Consultar pagos y filtros</Link></section>
      <section className={styles.card}><h2>Conciliación DEMO</h2><p>{data.financeAlerts.reconciliationOpen} lotes abiertos · {data.financeAlerts.reconciliationUnresolved} diferencias sin resolver · {data.financeAlerts.paymentsNeedingReview} pagos con eventos DEMO por revisar.</p><Link to="/administracion/conciliacion">Consultar conciliaciones y pendientes</Link></section>
      <section className={styles.card}><h2>Desembolsos DEMO</h2><p>{data.financeAlerts.disbursementsPending} por autorizar · {data.financeAlerts.disbursementsApproved} autorizados · {data.financeAlerts.disbursementsProcessing} en proceso.</p><Link to="/administracion/desembolsos?status=PENDING">Revisar solicitudes de desembolso</Link><Link to="/administracion/desembolsos">Consultar todos los desembolsos</Link></section>
      <section className={styles.card}><h2>Devoluciones DEMO</h2><p>{data.financeAlerts.refundsRequested} solicitadas · {data.financeAlerts.refundsProcessing} en proceso.</p><Link to="/administracion/devoluciones?status=REQUESTED">Revisar solicitudes de devolución</Link><Link to="/administracion/devoluciones">Consultar todas las devoluciones</Link></section>
    </div>}
    {data.disputeAlerts&&<section className={styles.card}><h2>Disputas DEMO</h2><p>{data.disputeAlerts.open} activas · {data.disputeAlerts.awaitingResponse} esperan respuesta · {data.disputeAlerts.escalated} escaladas.</p><Link to="/administracion/disputas">Consultar bandeja de disputas</Link><Link to="/administracion/disputas?status=ESCALATED">Revisar escaladas</Link></section>}
    {data.supportAlerts&&<section className={styles.card}><h2>Atención de casos</h2><p>{data.supportAlerts.open} incidencias generales abiertas · {data.supportAlerts.firstResponseDue} sin primera respuesta fuera del objetivo · {data.supportAlerts.escalationDue} superan la meta de escalamiento.</p><p>Metas de ensayo según los parámetros actuales; no son SLA legales ni avisos de correo.</p><Link to="/administracion/soporte">Abrir bandeja de soporte</Link>{can('catalog.read')&&<Link to="/administracion/catalogos">Consultar metas operativas</Link>}</section>}
    {data.accountabilityAlerts&&<section className={styles.card}><h2>Rendiciones</h2><p>{data.accountabilityAlerts.awaitingReview} enviadas para revisión · {data.accountabilityAlerts.requiresInformation} requieren corrección.</p><Link to="/administracion/cierre-campanas">Consultar rendiciones y cierre</Link></section>}
    {data.closureAlerts&&<section className={styles.card}><h2>Cierre de campaña</h2><p>{data.closureAlerts.blocked} campañas en ejecución o canceladas tienen pendientes operativos detectados. El ciclo de cada campaña determina los bloqueos completos de cierre.</p><Link to="/administracion/cierre-campanas">Revisar obligaciones de cierre</Link></section>}
    {!data.campaigns&&!data.parties&&!data.catalogs&&!data.identityAlerts&&!data.supportAlerts&&!data.accountabilityAlerts&&!data.closureAlerts&&!data.financeAlerts&&!data.disputeAlerts&&<p>No hay bandejas o contadores disponibles para tus permisos actuales.</p>}
  </>
}
