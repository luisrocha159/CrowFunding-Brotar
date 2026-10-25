import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { useAccessPermissions } from '../access/session/accessPermissions'
import { ContributionSession } from '../contributions/ContributionPages'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import layout from '../campaigns/projects.module.css'
import styles from './support.module.css'
import { SUPPORT_STATES } from './supportClient'
type SupportStatus = keyof typeof SUPPORT_STATES

interface Row { id: string; reference: string; category: string | null; subject: string; status: SupportStatus; createdAt: string; updatedAt: string; campaignId: string | null; contributionId: string | null }
interface Page { items: Row[]; total: number; page: number; pageSize: 20 }
interface AdminPage extends Page { items: (Row & { assignedTo: string | null })[]; assignees: { id: string; label: string }[] }
interface Detail extends Row { description: string; messages: { id: string; body: string; createdAt: string }[]; events: { previousStatus: SupportStatus; status: SupportStatus; reason: string; recordedAt: string }[]; evidence: { fileId: string; name: string; mimeType: string }[] }
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v))
function row(v: unknown): Row {
  if (!object(v) || typeof v.id !== 'string' || typeof v.reference !== 'string' || typeof v.subject !== 'string' || typeof v.status !== 'string' || !Object.hasOwn(SUPPORT_STATES, v.status) || !date(v.createdAt) || !date(v.updatedAt) || !(v.category === null || typeof v.category === 'string') || !(v.campaignId === null || typeof v.campaignId === 'string') || !(v.contributionId === null || typeof v.contributionId === 'string')) throw new SessionError(0)
  return v as unknown as Row
}
function page(v: unknown): AdminPage {
  if (!object(v) || !Array.isArray(v.items) || !Array.isArray(v.assignees) || !v.assignees.every(a=>object(a)&&typeof a.id==='string'&&typeof a.label==='string') || !Number.isSafeInteger(v.total) || Number(v.total) < 0 || !Number.isSafeInteger(v.page) || Number(v.page) < 1 || v.pageSize !== 20) throw new SessionError(0)
  const items=v.items.map(value=>{const base=row(value);if(!object(value)||!(value.assignedTo===null||typeof value.assignedTo==='string'))throw new SessionError(0);return {...base,assignedTo:value.assignedTo as string|null}})
  return { items, assignees:v.assignees as {id:string;label:string}[], total: Number(v.total), page: Number(v.page), pageSize: 20 }
}
function detail(v: unknown): Detail {
  const base = row(v)
  if (!object(v) || typeof v.description !== 'string' || !Array.isArray(v.messages) || !Array.isArray(v.events) || !Array.isArray(v.evidence)) throw new SessionError(0)
  const messages = v.messages.map(m => { if (!object(m) || typeof m.id !== 'string' || typeof m.body !== 'string' || !date(m.createdAt)) throw new SessionError(0); return { id: m.id, body: m.body, createdAt: m.createdAt } })
  const events = v.events.map(e => { if (!object(e) || typeof e.previousStatus !== 'string' || !Object.hasOwn(SUPPORT_STATES,e.previousStatus) || typeof e.status !== 'string' || !Object.hasOwn(SUPPORT_STATES,e.status) || typeof e.reason !== 'string' || !date(e.recordedAt)) throw new SessionError(0); return { previousStatus:e.previousStatus as SupportStatus,status:e.status as SupportStatus,reason:e.reason,recordedAt:e.recordedAt } })
  const evidence = v.evidence.map(f => { if (!object(f) || typeof f.fileId !== 'string' || typeof f.name !== 'string' || typeof f.mimeType !== 'string') throw new SessionError(0); return { fileId: f.fileId, name: f.name, mimeType: f.mimeType } })
  return { ...base, description: v.description, messages, events, evidence }
}
function failure(error: unknown) {
  const status = error instanceof SessionError ? error.status : 0
  return status === 403 ? 'Tu cuenta no tiene responsabilidad vigente para consultar o atender estos casos.' : status === 404 ? 'El caso o la evidencia ya no está disponible.' : 'No se pudo completar la consulta. Reintenta.'
}

export function SupportAdministrationPage() { return <ContributionSession><SupportAdministrationResults /></ContributionSession> }
function SupportAdministrationResults() {
  const { id } = useParams(), [params, setParams] = useSearchParams(), permissions = useAccessPermissions()
  const pageNumber = Math.max(1, Math.min(10000, Number(params.get('page') ?? 1) || 1))
  const canRead = permissions.can('support.read'), queryKey = `${id ?? 'list'}:${pageNumber}`
  const [loaded, setLoaded] = useState<{ key: string; value: AdminPage | Detail } | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0), [busy, setBusy] = useState(false), [reason, setReason] = useState(''), [message, setMessage] = useState(''), [nextStatus, setNextStatus] = useState('')
  const data = loaded?.key === queryKey ? loaded.value : null
  useEffect(() => {
    if (!canRead) return
    const controller = new AbortController()
    const url = id ? `/api/admin/support-cases/${encodeURIComponent(id)}` : `/api/admin/support-cases?page=${pageNumber}`
    requestApi(url, { signal: controller.signal }).then(readJson).then(value => id ? detail(value) : page(value)).then(value => { if (!controller.signal.aborted) { setLoaded({ key: queryKey, value }); setError('') } }).catch(cause => { if (!controller.signal.aborted) { setError(failure(cause)) } })
    return () => controller.abort()
  }, [id, pageNumber, queryKey, retry, canRead])
  async function refresh() { setBusy(true); setError(''); try { const value = await readJson(await requestApi(id ? `/api/admin/support-cases/${encodeURIComponent(id)}` : `/api/admin/support-cases?page=${pageNumber}`)); setLoaded({ key: queryKey, value: id ? detail(value) : page(value) }) } catch (cause) { setError(failure(cause)) } finally { setBusy(false) } }
  async function assign(caseId:string,assignedTo:string|null){if(busy)return;setBusy(true);setError('');try{await readJson(await requestApi(`/api/admin/support-cases/${encodeURIComponent(caseId)}/assignment`,{method:'POST',body:{assignedTo}}));const value=await readJson(await requestApi(`/api/admin/support-cases?page=${pageNumber}`));setLoaded({ key: queryKey, value: page(value) })}catch(cause){setError(failure(cause))}finally{setBusy(false)}}
  async function post(path: string, body: Record<string, unknown>) { if (!id || busy) return; setBusy(true); setError(''); try { await readJson(await requestApi(`/api/admin/support-cases/${encodeURIComponent(id)}/${path}`, { method: 'POST', body })); setMessage(''); setReason(''); setNextStatus(''); await refresh() } catch (cause) { setError(failure(cause)) } finally { setBusy(false) } }
  if (permissions.error) return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={layout.content}><p role="alert">No se pudieron comprobar tus permisos. Reintenta desde Mi cuenta.</p></section></div>
  if (!permissions.access) return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={layout.content}><p role="status">Comprobando permisos…</p></section></div>
  if (!canRead) return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={layout.content}><h1>Bandeja de soporte</h1><p role="alert">Acceso restringido a las responsabilidades de soporte, administración y auditoría.</p></section></div>
  const isDetail = data && 'description' in data ? data : null, list = data && 'items' in data ? data : null
  const transitions: Record<SupportStatus, SupportStatus[]> = { OPEN: ['IN_PROGRESS'], IN_PROGRESS: ['AWAITING_RESPONSE','RESOLVED'], AWAITING_RESPONSE: ['IN_PROGRESS','RESOLVED'], RESOLVED: ['CLOSED'], CLOSED: [] }
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={`${layout.content} ${styles.page}`}>
    <h1>Bandeja de soporte</h1><p>Casos no financieros. Los reportes de pago o devolución vinculados a disputas se atienden en su flujo separado. Los plazos son metas internas de ensayo, no SLA ni notificaciones externas.</p>
    <nav className={styles.actions}><Link to="/administracion">Resumen administrativo</Link><Link to="/administracion/disputas">Disputas financieras</Link><Button variant="secondary" disabled={busy} onClick={() => setRetry(v => v + 1)}>Actualizar bandeja</Button></nav>
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Consultando casos…</p>}
    {list && <><p>{list.total} casos</p>{list.items.length ? <ul className={styles.list}>{list.items.map(item => <li className={styles.panel} key={item.id}><h2><Link to={`/administracion/soporte/${item.id}`}>{item.reference} · {SUPPORT_STATES[item.status]}</Link></h2><p>{item.subject}</p><p>{item.category ?? 'Sin categoría'} · {new Date(item.createdAt).toLocaleString('es-BO')}</p><p>Asignado a: {list.assignees.find(agent=>agent.id===item.assignedTo)?.label??'Sin asignar'}</p>{permissions.can('support.resolve')&&item.status!=='RESOLVED'&&item.status!=='CLOSED'&&<FormField as="select" label={`Asignar ${item.reference}`} value={item.assignedTo??''} disabled={busy} onChange={event=>void assign(item.id,event.target.value||null)}><option value="">Sin asignar</option>{list.assignees.map(agent=><option key={agent.id} value={agent.id}>{agent.label}</option>)}</FormField>}</li>)}</ul> : <p>No hay casos en esta bandeja.</p>}<nav className={styles.actions} aria-label="Paginación de soporte"><Button disabled={pageNumber <= 1 || busy} onClick={() => setParams({ page: String(pageNumber - 1) })}>Anterior</Button><span>Página {pageNumber} · {list.total} casos</span><Button disabled={pageNumber * 20 >= list.total || busy} onClick={() => setParams({ page: String(pageNumber + 1) })}>Siguiente</Button></nav></>}
    {isDetail && <><article className={styles.panel}><h2>{isDetail.reference} · {SUPPORT_STATES[isDetail.status]}</h2><p>{isDetail.subject} · {isDetail.category ?? 'Sin categoría'}</p><p>Recibido: {new Date(isDetail.createdAt).toLocaleString('es-BO')}</p><p className={styles.prose}>{isDetail.description}</p>{isDetail.campaignId && <p>Campaña: <Link to={`/administracion/campanas/${isDetail.campaignId}`}>consultar contexto</Link></p>}
      <h3>Evidencias autorizadas</h3>{isDetail.evidence.length ? isDetail.evidence.map(file => <p key={file.fileId}><a href={`/api/admin/support-cases/${isDetail.id}/evidence/${file.fileId}`} target="_blank" rel="noreferrer">Descargar {file.name}</a></p>) : <p>El caso no tiene evidencias adjuntas.</p>}
      <h3>Historial de estados</h3>{isDetail.events.length ? <ol>{isDetail.events.map((event,index) => <li key={`${event.recordedAt}:${index}`}><time dateTime={event.recordedAt}>{new Date(event.recordedAt).toLocaleString('es-BO')}</time> · {SUPPORT_STATES[event.previousStatus]} → {SUPPORT_STATES[event.status]}<p>{event.reason}</p></li>)}</ol> : <p>No hay cambios de estado registrados.</p>}
      <h3>Mensajes compartidos</h3>{isDetail.messages.length ? isDetail.messages.map(item => <article key={item.id}><p>{new Date(item.createdAt).toLocaleString('es-BO')}</p><p className={styles.prose}>{item.body}</p></article>) : <p>No hay mensajes todavía.</p>}
    </article>
      {permissions.can('support.resolve') && !['RESOLVED','CLOSED'].includes(isDetail.status) && <form className={styles.panel} onSubmit={(event: FormEvent) => { event.preventDefault(); void post('messages', { body: message.trim() }) }}><h2>Responder al titular</h2><FormField as="textarea" label="Mensaje compartido" required minLength={1} maxLength={5000} value={message} disabled={busy} onChange={event => setMessage(event.target.value)} /><Button type="submit" loading={busy}>Enviar respuesta</Button></form>}
      {permissions.can('support.resolve') && transitions[isDetail.status].length > 0 && <form className={styles.panel} onSubmit={(event: FormEvent) => { event.preventDefault(); void post('actions', { status: nextStatus, reason: reason.trim() }) }}><h2>Actualizar estado</h2><FormField as="select" label="Siguiente estado" required value={nextStatus} disabled={busy} onChange={event => setNextStatus(event.target.value)}><option value="">Selecciona el estado</option>{transitions[isDetail.status].map(status => <option key={status} value={status}>{SUPPORT_STATES[status]}</option>)}</FormField><FormField as="textarea" label="Motivo de la transición" required minLength={10} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /><Button type="submit" loading={busy} disabled={!nextStatus}>Guardar estado</Button></form>}
      <Link to="/administracion/soporte">Volver a la bandeja</Link><Button variant="secondary" disabled={busy} onClick={() => void refresh()}>Actualizar caso</Button>
    </>}
  </section></div>
}
