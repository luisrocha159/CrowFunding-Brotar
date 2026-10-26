import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { SessionError } from '../../shared/api/sessionError'
import { usePublicSession } from '../access/session/useHeaderSession'
import { readFollowedUpdates } from '../bookmarks/bookmarksClient'
import { contributionStatuses, readContribution, readContributions, readReceipt, readSponsorSummary, type ContributionFilters } from './contributionsClient'
import { ContributionRecord } from './ContributionRecord'
import { dateLabel, stateLabels } from './labels'
import styles from './contributions.module.css'

export function ContributionSession({ children }: { children: ReactNode }) {
  const session = usePublicSession(), location = useLocation()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar tu sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(location.pathname + location.search)}`} />
  return <div key={session.user.id}>{children}</div>
}
function useRemote<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState<SessionError | null>(null), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(value => { if (!controller.signal.aborted) { setData(value); setError(null) } }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof SessionError ? reason : new SessionError(0)) })
    return () => controller.abort()
  }, [load, attempt])
  return { data, error, retry: () => { setError(null); setAttempt(value => value + 1) } }
}
function LoadState({ error, retry }: { error: SessionError | null; retry: () => void }) {
  const location = useLocation()
  if (error?.status === 401) return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(location.pathname + location.search)}`} />
  if (error) return <div role="alert"><p>{error.status === 404 ? 'No encontramos este registro en tu cuenta.' : error.status === 409 ? 'No hay un pago confirmado verificable para este comprobante.' : error.status === 400 ? 'Revisa las fechas, el estado y la página del filtro.' : 'No pudimos consultar los datos. Reintenta.'}</p><Button onClick={retry}>Reintentar</Button></div>
  return <p role="status">Consultando registros…</p>
}
function Navigation() { return <nav className={styles.actions} aria-label="Mi actividad"><Link to="/panel-patrocinador">Mi panel</Link><Link to="/mis-aportes">Mis aportes</Link><Link to="/mis-guardados">Guardadas y seguimiento</Link><Link to="/mis-incidencias">Mis incidencias</Link></nav> }
export function ContributionsPage() {
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('page') ?? '1')
  const filters: ContributionFilters = { page: Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1, status: params.get('status') || undefined, from: params.get('from') || undefined, to: params.get('to') || undefined }
  return <ContributionSession><section className={styles.layout}><Navigation /><header><h1>Mis aportes</h1><p>Consulta tus registros y sus pagos, incluso cuando la campaña ya terminó. Las fechas se interpretan en Bolivia.</p></header>
    <form className={styles.filters} key={`filters:${params.toString()}`} onSubmit={event => {
      event.preventDefault(); const fields = new FormData(event.currentTarget), next = new URLSearchParams()
      for (const name of ['status', 'from', 'to']) { const value = String(fields.get(name) ?? ''); if (value) next.set(name, value) }
      setParams(next)
    }}><label>Estado del aporte<select name="status" defaultValue={filters.status ?? ''}><option value="">Todos</option>{contributionStatuses.map(status => <option key={status} value={status}>{stateLabels[status]}</option>)}</select></label>
      <label>Desde<input name="from" type="date" defaultValue={filters.from ?? ''} /></label><label>Hasta<input name="to" type="date" defaultValue={filters.to ?? ''} /></label><Button type="submit">Filtrar</Button><Link to="/mis-aportes">Limpiar filtros</Link></form>
    <ContributionList key={`results:${params.toString()}`} filters={filters} changePage={page => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next) }} />
  </section></ContributionSession>
}
function ContributionList({ filters, changePage }: { filters: ContributionFilters; changePage: (page: number) => void }) {
  const { page, status, from, to } = filters
  const resource = useRemote(useCallback((signal: AbortSignal) => readContributions({ page, status, from, to }, signal), [page, status, from, to]))
  if (!resource.data || resource.error) return <LoadState error={resource.error} retry={resource.retry} />
  const data = resource.data
  return <><p>{data.total} aportes encontrados</p>{data.items.length ? <div className={styles.cards}>{data.items.map(item => <ContributionRecord key={item.id} item={item} />)}</div> : <p>No hay aportes en esta consulta. Puedes cambiar los filtros o <Link to="/explorar">explorar campañas</Link>.</p>}
    <nav className={styles.actions} aria-label="Paginación de aportes"><Button variant="secondary" disabled={page === 1} onClick={() => changePage(page - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => changePage(page + 1)}>Siguiente</Button></nav></>
}
export function ContributionDetailPage() { const { id = '' } = useParams(); return <ContributionSession><ContributionDetail key={id} id={id} /></ContributionSession> }
function ContributionDetail({ id }: { id: string }) {
  const resource = useRemote(useCallback((signal: AbortSignal) => readContribution(id, signal), [id]))
  if (!resource.data || resource.error) return <section className={styles.layout}><Navigation /><h1>Detalle del aporte</h1><LoadState error={resource.error} retry={resource.retry} /></section>
  const data = resource.data
  return <section className={styles.layout}><Navigation /><h1>Detalle del aporte</h1><ContributionRecord item={data} detail />
    <nav className={styles.actions} aria-label="Devoluciones del aporte"><Link to="/mis-devoluciones">Consultar mis devoluciones DEMO</Link>{data.payments.filter(p=>p.demo && p.status==='CONFIRMED').map(p=><Link key={p.id} to={`/mis-devoluciones/nueva?pago=${p.id}`}>Solicitar devolución DEMO del pago {p.id}</Link>)}</nav>
    {data.reward && <section className={styles.card}><h2>Recompensa seleccionada</h2><p>{data.reward.title}</p><p>Esta referencia no acredita entrega ni representa seguimiento de transporte.</p></section>}
    <section className={styles.card}><h2>Intentos de pago</h2>{data.payments.length ? data.payments.map(payment => <div key={payment.id}><h3>{stateLabels[payment.status] ?? payment.status}</h3><dl className={styles.details}><dt>Identificador</dt><dd>{payment.id}</dd><dt>Importe</dt><dd>{payment.amount} {payment.currency}</dd><dt>Método</dt><dd>{payment.method ?? 'No registrado'}</dd><dt>Creado</dt><dd>{dateLabel(payment.createdAt)}</dd><dt>Confirmación</dt><dd>{payment.confirmedAt ? dateLabel(payment.confirmedAt) : 'Sin confirmar'}</dd><dt>Entorno</dt><dd>{payment.sandbox ? 'SANDBOX: prueba sin dinero real' : 'Operación registrada'}</dd></dl></div>) : <p>Todavía no hay intentos de pago.</p>}</section>
    <section className={styles.card}><h2>Devoluciones</h2>{data.refunds.length ? data.refunds.map(refund => <p key={refund.id}>{refund.amount} {refund.currency} · {stateLabels[refund.status] ?? refund.status} · {dateLabel(refund.requestedAt)}{refund.completedAt ? ` · Completada: ${dateLabel(refund.completedAt)}` : ''}</p>) : <p>No hay devoluciones registradas para este aporte.</p>}<p>Las solicitudes y decisiones de devolución dependen del procedimiento financiero aprobado.</p></section>
    <section className={styles.card}><h2>Disputas</h2>{data.disputes.length ? data.disputes.map(dispute => <p key={dispute.id}>{dispute.reference} · {stateLabels[dispute.status] ?? dispute.status} · {dateLabel(dispute.createdAt)}</p>) : <p>No hay disputas registradas para este aporte.</p>}</section>
    <section className={styles.card}><h2>Tus incidencias de esta campaña</h2><p>Esta lista reúne tus casos de la campaña; no implica que todos correspondan a este aporte.</p>{data.supportCases.length ? data.supportCases.map(support => <p key={support.id}>{support.reference} · {support.subject} · {stateLabels[support.status] ?? support.status}</p>) : <p>No hay casos registrados.</p>}<Link to="/mis-incidencias">Consultar mis incidencias</Link></section>
  </section>
}
export function ContributionReceiptPage() { const { id = '' } = useParams(); return <ContributionSession><ReceiptDetail key={id} id={id} /></ContributionSession> }
function ReceiptDetail({ id }: { id: string }) {
  const resource = useRemote(useCallback((signal: AbortSignal) => readReceipt(id, signal), [id]))
  return <section className={styles.layout}><Navigation /><h1>Comprobante informativo</h1>{!resource.data || resource.error ? <LoadState error={resource.error} retry={resource.retry} /> : <section className={styles.card}><p className={styles.notice}>{resource.data.sandbox ? 'SANDBOX · Comprobante de prueba. No acredita dinero real.' : 'Constancia informativa de un pago registrado. No es una factura ni un documento fiscal.'} No acredita entrega de recompensas ni transporte.</p><h2>{resource.data.campaignTitle}</h2><p className={styles.amount}>{resource.data.amount} {resource.data.currency}</p><dl className={styles.details}><dt>Aporte</dt><dd>{resource.data.reference}</dd><dt>Pago</dt><dd>{resource.data.paymentId}</dd><dt>Método</dt><dd>{resource.data.method ?? 'No registrado'}</dd><dt>Confirmado</dt><dd>{dateLabel(resource.data.confirmedAt)}</dd></dl><p>La referencia se verifica con tu sesión al consultar nuevamente este comprobante. El estado puede cambiar si existe una devolución o disputa.</p><nav className={styles.actions}><Button onClick={() => window.print()}>Imprimir o guardar PDF</Button><Button variant="secondary" onClick={resource.retry}>Verificar de nuevo</Button><Link to={`/mis-aportes/${id}`}>Volver al aporte</Link></nav></section>}</section>
}
export function SponsorDashboardPage() { return <ContributionSession><SponsorDashboard /></ContributionSession> }
function SponsorDashboard() {
  const resource = useRemote(readSponsorSummary)
  return <section className={styles.layout}><Navigation /><header><h1>Mi panel de patrocinador</h1><p>Tu actividad, los pagos registrados y las novedades de las campañas que sigues.</p></header>{!resource.data || resource.error ? <LoadState error={resource.error} retry={resource.retry} /> : <>
    <div className={styles.cards}><section className={styles.card}><h2>Mis aportes</h2><p className={styles.amount}>{resource.data.contributionCount}</p><p>{resource.data.campaignsSupported} campañas vinculadas a tus aportes</p>{resource.data.statusCounts.map(row => <p key={row.status}>{stateLabels[row.status]}: {row.count}</p>)}{!resource.data.contributionCount && <p>Todavía no tienes aportes registrados.</p>}<Link to="/mis-aportes">Consultar historial</Link></section>
      <section className={styles.card}><h2>Campañas y seguimiento</h2><p>{resource.data.favorites} guardadas · {resource.data.following} seguidas</p><Link to="/mis-guardados">Ver mis listas</Link></section>
      <section className={styles.card}><h2>Casos y devoluciones</h2><p>{resource.data.openSupportCases} incidencias abiertas</p><p>{resource.data.openDisputes} disputas sin cerrar</p><p>{resource.data.pendingRefunds} devoluciones pendientes</p><Link to="/mis-incidencias">Consultar incidencias</Link><p><Link to="/mis-aportes">Ver devoluciones y disputas en cada aporte</Link></p></section></div>
    <section className={styles.card}><h2>Pagos registrados por moneda</h2><p>Importes históricos de pagos que fueron confirmados. Las devoluciones y los importes actualmente disputados se muestran separados; no representan saldo disponible.</p>{resource.data.totals.length ? resource.data.totals.map(total => <dl className={styles.details} key={total.currency}><dt>Confirmados ({total.currency})</dt><dd>{total.grossConfirmed}</dd><dt>Devueltos ({total.currency})</dt><dd>{total.refunded}</dd><dt>En disputa ({total.currency})</dt><dd>{total.disputed}</dd></dl>) : <p>No hay pagos confirmados fuera de sandbox.</p>}<p>{resource.data.sandboxPaymentCount} intentos de proveedores sandbox excluidos de estos importes.</p></section>
    {resource.data.demoTotals && <section className={styles.card}><h2>Aportes DEMO integrados · sin dinero real</h2><p>Solo registros del simulador interno confirmados por el servidor. Los ensayos aislados y otros proveedores sandbox no se suman aquí.</p>{resource.data.demoTotals.length ? resource.data.demoTotals.map(total=><dl className={styles.details} key={total.currency}><dt>Confirmados DEMO ({total.currency})</dt><dd>{total.grossConfirmed}</dd><dt>Devueltos DEMO ({total.currency})</dt><dd>{total.refunded}</dd><dt>En disputa DEMO ({total.currency})</dt><dd>{total.disputed}</dd></dl>):<p>Aún no hay aportes DEMO confirmados.</p>}</section>}</>}
    <FollowedNews /><p className={styles.notice}><Link to="/simulacion-apoyo">Probar la simulación de apoyo</Link>. La simulación no mueve dinero, no reserva cupos ni crea aportes reales.</p>
  </section>
}
function FollowedNews() {
  const resource = useRemote(useCallback((signal: AbortSignal) => readFollowedUpdates(1, signal), []))
  return <section className={styles.card}><h2>Novedades de las campañas que sigues</h2>{!resource.data || resource.error ? <LoadState error={resource.error} retry={resource.retry} /> : <>{resource.data.items.length ? resource.data.items.slice(0, 3).map(update => <article key={update.id}><p>{update.campaignTitle}</p><h3>{update.title}</h3><p>{update.body}</p><time dateTime={update.publishedAt}>{dateLabel(update.publishedAt)}</time></article>) : <p>Todavía no hay novedades públicas para tus campañas seguidas.</p>}<p><Link to="/mis-guardados?vista=UPDATES">Ver todas las novedades</Link></p></>}</section>
}
