import { PaymentReceipt } from './PaymentReceipt'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { SessionError } from '../../shared/api/sessionError'
import { usePublicSession } from '../access/session/useHeaderSession'
import { readFollowedUpdates } from '../bookmarks/bookmarksClient'
import { contributionStatuses, readContribution, readContributions, readReceipt, readSponsorSummary, type ContributionDetail, type ContributionFilters, type Receipt } from './contributionsClient'
import { SponsorOverview } from './SponsorOverview'
import { ContributionRecord } from './ContributionRecord'
import { dateLabel, stateLabels, paymentMethodLabel } from './labels'
import styles from './contributions.module.css'

export function ContributionSession({ children }: { children: ReactNode }) {
  const session = usePublicSession(), location = useLocation()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar tu sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) {
    const destination = location.pathname + location.search
    return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(destination)}`} />
  }
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
    <nav className={styles.actions} aria-label="Devoluciones del aporte"><Link to="/mis-devoluciones">Consultar mis devoluciones</Link>{data.payments.filter(p=>p.demo && p.status==='CONFIRMED').map(p=><Link key={p.id} to={`/mis-devoluciones/nueva?pago=${p.id}`}>Solicitar devolución de {p.amount} {p.currency}</Link>)}</nav>
    {data.reward && <section className={styles.card}><h2>Recompensa seleccionada</h2><p>{data.reward.title}</p><p>Esta referencia no acredita entrega ni representa seguimiento de transporte.</p></section>}
    <section className={styles.card}><h2>Intentos de pago</h2>{data.payments.length ? data.payments.map(payment => <div key={payment.id}><h3>{stateLabels[payment.status] ?? 'Estado sin clasificar'}</h3><dl className={styles.details}><dt>Identificador</dt><dd>{payment.id}</dd><dt>Importe</dt><dd>{payment.amount} {payment.currency}</dd><dt>Método</dt><dd>{paymentMethodLabel(payment.method)}</dd><dt>Creado</dt><dd>{dateLabel(payment.createdAt)}</dd><dt>Confirmación</dt><dd>{payment.confirmedAt ? dateLabel(payment.confirmedAt) : 'Sin confirmar'}</dd><dt>Entorno</dt><dd>{payment.sandbox ? 'Pago de práctica · Sin dinero real' : 'Operación registrada'}</dd></dl></div>) : <p>Todavía no hay intentos de pago.</p>}</section>
    <section className={styles.card}><h2>Devoluciones</h2>{data.refunds.length ? data.refunds.map(refund => <p key={refund.id}>{refund.amount} {refund.currency} · {stateLabels[refund.status] ?? refund.status} · {dateLabel(refund.requestedAt)}{refund.completedAt ? ` · Completada: ${dateLabel(refund.completedAt)}` : ''}</p>) : <p>No hay devoluciones registradas para este aporte.</p>}<p>Las solicitudes y decisiones de devolución dependen del procedimiento financiero aprobado.</p></section>
    <section className={styles.card}><h2>Disputas</h2>{data.disputes.length ? data.disputes.map(dispute => <p key={dispute.id}>{dispute.reference} · {stateLabels[dispute.status] ?? dispute.status} · {dateLabel(dispute.createdAt)}</p>) : <p>No hay disputas registradas para este aporte.</p>}</section>
    <section className={styles.card}><h2>Tus incidencias de esta campaña</h2><p>Esta lista reúne tus casos de la campaña; no implica que todos correspondan a este aporte.</p>{data.supportCases.length ? data.supportCases.map(support => <p key={support.id}>{support.reference} · {support.subject} · {stateLabels[support.status] ?? support.status}</p>) : <p>No hay casos registrados.</p>}<Link to="/mis-incidencias">Consultar mis incidencias</Link></section>
  </section>
}
export function ContributionReceiptPage() { const { id = '' } = useParams(); return <ContributionSession><ReceiptDetail key={id} id={id} /></ContributionSession> }
type ReceiptPageData = { receipt: Receipt; detail: null } | { receipt: null; detail: ContributionDetail }
function unavailableReceiptMessage(status: string) {
  switch (status) {
    case 'INITIATED': return 'El intento se inició, pero aún no hay confirmación de pago. No se emite comprobante.'
    case 'PENDING': return 'El pago está pendiente de confirmación verificable. Este intento no acredita un pago confirmado.'
    case 'FAILED': return 'El intento falló. No se emite comprobante de pago.'
    case 'EXPIRED': return 'El intento expiró sin confirmación. No se emite comprobante de pago.'
    case 'REFUNDED': return 'El pago figura reembolsado. Se muestra como reembolso y no como pago vigente.'
    case 'DISPUTED': return 'El pago está en disputa. El comprobante está bloqueado mientras se consulta el estado.'
    default: return 'El pago figura confirmado, pero no coincide con la referencia, importe, moneda y fecha necesarios para verificar esta constancia.'
  }
}
function ReceiptDetail({ id }: { id: string }) {
  const resource = useRemote(useCallback(async (signal: AbortSignal): Promise<ReceiptPageData> => {
    try { return { receipt: await readReceipt(id, signal), detail: null } }
    catch (error) {
      if (!(error instanceof SessionError) || error.status !== 409) throw error
      return { receipt: null, detail: await readContribution(id, signal) }
    }
  }, [id]))
  const receipt = resource.data?.receipt
  const detail = resource.data?.detail
  if (receipt && !resource.error) return <section className={styles.layout}><Navigation /><PaymentReceipt receipt={receipt} refresh={resource.retry} /></section>
  return <section className={styles.layout}><Navigation /><h1>Comprobante informativo</h1>{!resource.data || resource.error ? <LoadState error={resource.error} retry={resource.retry} /> : <section className={styles.card}><p role="status">No se puede emitir una constancia para este aporte. Los estados siguientes son del registro actual; solo un pago confirmado y verificable permite obtener el comprobante informativo.</p><h2>Estado del aporte</h2><p>{stateLabels[detail!.status] ?? detail!.status} · {detail!.amount} {detail!.currency}</p><h2>Intentos de pago</h2>{detail!.payments.length ? detail!.payments.map(payment => <div key={payment.id}><h3>{stateLabels[payment.status] ?? 'Estado sin clasificar'}</h3><p>{unavailableReceiptMessage(payment.status)}</p><p>{payment.amount} {payment.currency} · {dateLabel(payment.createdAt)} · {payment.sandbox ? 'Pago de práctica · Sin dinero real' : 'Registro de pago'}</p></div>) : <p>Aún no hay intentos de pago registrados.</p>}{detail!.refunds.length > 0 && <><h2>Devoluciones</h2>{detail!.refunds.map(refund => <p key={refund.id}>{refund.amount} {refund.currency} · {stateLabels[refund.status] ?? refund.status} · {dateLabel(refund.requestedAt)}</p>)}</>}{detail!.disputes.length > 0 && <><h2>Disputas</h2>{detail!.disputes.map(dispute => <p key={dispute.id}>{dispute.reference} · {stateLabels[dispute.status] ?? dispute.status} · {dateLabel(dispute.createdAt)}</p>)}</>}<nav className={styles.actions}><Button variant="secondary" onClick={resource.retry}>Consultar de nuevo</Button><Link to={`/mis-aportes/${id}`}>Volver al detalle del aporte</Link></nav></section>}</section>
}
export function SponsorDashboardPage() { return <ContributionSession><SponsorDashboard /></ContributionSession> }
function SponsorDashboard() {
  const resource = useRemote(readSponsorSummary)
  return <section className={styles.layout}><Navigation />
    {resource.data && !resource.error ? <SponsorOverview summary={resource.data} /> :
      <><h1>Mi panel de patrocinador</h1><LoadState error={resource.error} retry={resource.retry} /></>}
    <FollowedNews />
  </section>
}
function FollowedNews() {
  const resource = useRemote(useCallback((signal: AbortSignal) => readFollowedUpdates(1, signal), []))
  return <section className={styles.card}><h2>Novedades de las campañas que sigues</h2>{!resource.data || resource.error ? <LoadState error={resource.error} retry={resource.retry} /> : <>{resource.data.items.length ? resource.data.items.slice(0, 3).map(update => <article key={update.id}><p>{update.campaignTitle}</p><h3>{update.title}</h3><p>{update.body}</p><time dateTime={update.publishedAt}>{dateLabel(update.publishedAt)}</time></article>) : <p>Todavía no hay novedades públicas para tus campañas seguidas.</p>}<p><Link to="/mis-guardados?vista=UPDATES">Ver todas las novedades</Link></p></>}</section>
}
