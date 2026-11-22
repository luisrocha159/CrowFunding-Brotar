import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { readJson, requestApi } from '../../shared/api/request'
import { dashboardFrom, type Dashboard } from './dashboardClient'
import { usePublicSession } from '../access/session/useHeaderSession'
import { useAccessPermissions } from '../access/session/accessPermissions'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import { failureText } from './progressClient'
import { projectStatusNames } from '../campaigns/projectsClient'
import { DashboardMetrics, type Metric } from './DashboardMetrics'
import { EmptyState, Message } from '../../shared/components/Feedback'
import layout from '../campaigns/projects.module.css'
import styles from './dashboard.module.css'

export function AdministrativeDashboardPage() {
  const session = usePublicSession()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar la sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to="/iniciar-sesion?continuar=%2Fadministracion" />
  return <Results key={session.user.id} />
}

function Results() {
  const { can } = useAccessPermissions()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    requestApi('/api/administration/dashboard', { signal: controller.signal }).then(readJson).then(dashboardFrom)
      .then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(e => { if (!controller.signal.aborted) setError(failureText(e)) })
    return () => controller.abort()
  }, [retry])
  function refresh() { setData(null); setError(''); setRetry(v => v + 1) }

  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={`${layout.content} ${styles.page}`}>
    <header className={styles.header}><h1>Resumen administrativo</h1>
      <Button variant="secondary" onClick={refresh} disabled={!data && !error}>Actualizar resumen</Button>
    </header>
    {error && <Message tone="error" title="No se pudo cargar el resumen">{error}</Message>}
    {!data && !error && <p role="status">Cargando resumen…</p>}
    {data && <DashboardCards data={data} can={can} />}
  </section></div>
}

function ModuleCard({ title, metrics, children, detail }: {
  title: string; metrics: Metric[]; children: ReactNode; detail?: string
}) {
  return <section className={styles.card}>
    <h2>{title}</h2>
    <DashboardMetrics items={metrics} />
    {detail && <p className={styles.muted}>{detail}</p>}
    <div className={styles.actions}>{children}</div>
  </section>
}

export function DashboardCards({ data, can }: { data: Dashboard; can: (permission: string) => boolean }) {
  const { campaigns, parties, catalogs, identityAlerts, financeAlerts, disputeAlerts, supportAlerts, accountabilityAlerts, closureAlerts } = data
  return <>
    <div className={styles.meta}>
      <span>Consultado el <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleString('es-BO')}</time></span>
      {data.readOnly && <span className={styles.badge}>Modo auditor · Solo consulta</span>}
    </div>
    {campaigns && <section className={styles.card}>
      <h2>Campañas por estado</h2>
      {campaigns.length ? <DashboardMetrics items={campaigns.map(row => ({
        id: row.status, label: projectStatusNames[row.status] ?? 'Otro estado', value: row.count,
      }))} /> : <p>No hay campañas registradas.</p>}
      {can('campaign.review.read') ? <Link to="/administracion/campanas">Revisar campañas y observaciones</Link>
        : can('campaign.lifecycle.read') ? <Link to="/administracion/ciclo-campanas">Consultar ciclo de campañas</Link> : null}
    </section>}
    <div className={styles.grid}>
      {identityAlerts && <ModuleCard title="Identidad y verificación" metrics={[
        { label: 'En revisión', value: identityAlerts.awaitingReview },
        { label: 'Requieren información', value: identityAlerts.requiresInformation, attention: identityAlerts.requiresInformation > 0 },
      ]}><Link to="/administracion/verificaciones">Abrir bandeja de verificación</Link></ModuleCard>}
      {financeAlerts && <>
        <ModuleCard title="Pagos registrados" metrics={[
          { label: 'Intentos totales', value: financeAlerts.paymentsTotal },
          { label: 'Iniciados o pendientes', value: financeAlerts.paymentsPending },
          { label: 'Con plazo vencido', value: financeAlerts.paymentsOverdue, attention: financeAlerts.paymentsOverdue > 0 },
        ]} detail="Solo los pagos confirmados cuentan para la recaudación.">
          <Link to="/administracion/finanzas">Consultar pagos y filtros</Link>
        </ModuleCard>
        <ModuleCard title="Conciliación" metrics={[
          { label: 'Lotes abiertos', value: financeAlerts.reconciliationOpen },
          { label: 'Diferencias sin resolver', value: financeAlerts.reconciliationUnresolved, attention: financeAlerts.reconciliationUnresolved > 0 },
          { label: 'Pagos por revisar', value: financeAlerts.paymentsNeedingReview },
        ]}><Link to="/administracion/conciliacion">Consultar conciliaciones y pendientes</Link></ModuleCard>
        <ModuleCard title="Desembolsos" metrics={[
          { label: 'Por autorizar', value: financeAlerts.disbursementsPending },
          { label: 'Autorizados', value: financeAlerts.disbursementsApproved },
          { label: 'En proceso', value: financeAlerts.disbursementsProcessing },
        ]}>
          <Link to="/administracion/desembolsos?status=PENDING">Revisar solicitudes de desembolso</Link>
          <Link to="/administracion/desembolsos">Ver todos los desembolsos</Link>
        </ModuleCard>
        <ModuleCard title="Devoluciones" metrics={[
          { label: 'Solicitadas', value: financeAlerts.refundsRequested },
          { label: 'En proceso', value: financeAlerts.refundsProcessing },
        ]}>
          <Link to="/administracion/devoluciones?status=REQUESTED">Revisar solicitudes de devolución</Link>
          <Link to="/administracion/devoluciones">Ver todas las devoluciones</Link>
        </ModuleCard>
      </>}
      {supportAlerts && <ModuleCard title="Atención de casos" metrics={[
        { label: 'Incidencias abiertas', value: supportAlerts.open },
        { label: 'Primera respuesta vencida', value: supportAlerts.firstResponseDue, attention: supportAlerts.firstResponseDue > 0 },
        { label: 'Plazo de escalamiento superado', value: supportAlerts.escalationDue, attention: supportAlerts.escalationDue > 0 },
      ]} detail="Los plazos corresponden a los objetivos de atención configurados.">
        <Link to="/administracion/soporte">Abrir bandeja de soporte</Link>
        {can('catalog.read') && <Link to="/administracion/catalogos">Consultar metas operativas</Link>}
      </ModuleCard>}
      {disputeAlerts && <ModuleCard title="Disputas" metrics={[
        { label: 'Activas', value: disputeAlerts.open },
        { label: 'Esperan respuesta', value: disputeAlerts.awaitingResponse },
        { label: 'Escaladas', value: disputeAlerts.escalated, attention: disputeAlerts.escalated > 0 },
      ]}>
        <Link to="/administracion/disputas">Consultar bandeja de disputas</Link>
        <Link to="/administracion/disputas?status=ESCALATED">Revisar escaladas</Link>
      </ModuleCard>}
      {accountabilityAlerts && <ModuleCard title="Rendiciones" metrics={[
        { label: 'Enviadas a revisión', value: accountabilityAlerts.awaitingReview },
        { label: 'Requieren corrección', value: accountabilityAlerts.requiresInformation, attention: accountabilityAlerts.requiresInformation > 0 },
      ]}><Link to="/administracion/cierre-campanas">Consultar rendiciones y cierre</Link></ModuleCard>}
      {closureAlerts && <ModuleCard title="Cierre de campaña" metrics={[
        { label: 'Campañas con pendientes de cierre', value: closureAlerts.blocked, attention: closureAlerts.blocked > 0 },
      ]}><Link to="/administracion/cierre-campanas">Revisar obligaciones de cierre</Link></ModuleCard>}
      {parties && <ModuleCard title="Personas y organizaciones" metrics={[
        { label: 'Cuentas', value: parties.users }, { label: 'Organizaciones', value: parties.organizations },
      ]}><Link to="/administracion/personas">Consultar registros y representaciones</Link></ModuleCard>}
      {catalogs && <ModuleCard title="Catálogos" metrics={[
        { label: 'Categorías activas', value: catalogs.active }, { label: 'Categorías inactivas', value: catalogs.inactive },
      ]}><Link to="/administracion/catalogos">Consultar categorías y parámetros</Link></ModuleCard>}
    </div>
    {!campaigns && !parties && !catalogs && !identityAlerts && !supportAlerts && !accountabilityAlerts && !closureAlerts && !financeAlerts && !disputeAlerts &&
      <EmptyState title="Sin módulos disponibles" description="Tu cuenta todavía no tiene módulos administrativos habilitados." />}
  </>
}
