import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { EmptyState, Message } from '../../shared/components/Feedback'
import { SessionError } from '../../shared/api/sessionError'
import { myRoles } from '../organizations/organizationsClient'
import { SupportCaseForm } from './SupportCaseForm'
import { SupportReplyForm } from './SupportReplyForm'
import { readSupportCases, readSupportCase, supportContext, supportError, SUPPORT_STATES, SUPPORT_TYPES, type SupportContext, type SupportDetail, type SupportPage } from './supportClient'
import styles from './support.module.css'
interface Loaded { key: string; editable: boolean; context: SupportContext | null; detail: SupportDetail | null; list: SupportPage | null; error: string }
export function SupportCasesPage({ create = false }: { create?: boolean }) {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const [anonymous, setAnonymous] = useState(false)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [replied,setReplied]=useState(false)
  const campaignId = params.get('campaignId'); const contributionId = params.get('contributionId')
  const page = /^\d+$/.test(params.get('page') ?? '') ? Math.min(10000, Math.max(1, Number(params.get('page')))) : 1
  const key = `${create}:${id ?? ''}:${campaignId ?? ''}:${contributionId ?? ''}:${page}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const result: Loaded = { key, editable: false, context: null, detail: null, list: null, error: '' }
      try {
        const roles = await myRoles(controller.signal)
        result.editable = roles.some(role => role.code === 'REGISTERED_USER') && !roles.some(role => role.code === 'AUDITOR')
        if (create && (campaignId || contributionId)) result.context = await supportContext(campaignId, contributionId, controller.signal)
        else if (!create && id) result.detail = await readSupportCase(id, controller.signal)
        else if (!create) result.list = await readSupportCases(page, controller.signal)
      } catch (cause) {
        if (controller.signal.aborted) return
        if (cause instanceof SessionError && cause.status === 401) setAnonymous(true)
        else result.error = supportError(cause)
      }
      if (!controller.signal.aborted) setLoaded(result)
    })()
    return () => controller.abort()
  }, [key, create, id, page, campaignId, contributionId])
  if (anonymous) {
    const continuation = create ? `/mis-incidencias/nueva${params.size ? `?${params}` : ''}` : id ? `/mis-incidencias/${id}` : '/mis-incidencias'
    return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(continuation)}`} />
  }
  const data = loaded?.key === key ? loaded : null
  const detail = data?.detail
  return <section className={styles.page}>
    <div className={styles.actions}><Link to="/mi-cuenta">Mi cuenta</Link>{(create || id) && <Link to="/mis-incidencias">Todas mis incidencias</Link>}</div>
    <h1>{create ? 'Registrar incidencia' : id ? 'Detalle de incidencia' : 'Mis incidencias'}</h1>
    {!data && <p role="status">Cargando tus incidencias y permisos…</p>}
    {data?.error && <><Message tone="error" title="No se pudo cargar la información">{data.error}</Message><div><Button onClick={() => setAttempt(value => value + 1)}>Reintentar</Button></div></>}
    {data && !data.error && <>
      {!data.editable && <Message title="Modo de consulta">La cuenta puede consultar sus casos; Auditor no registra incidencias.</Message>}
      {create && data.editable && (data.context ? <SupportCaseForm key={key} context={data.context} onUnauthorized={() => setAnonymous(true)} onCreated={receipt => navigate(`/mis-incidencias/${receipt.id}`, { replace: true })} />
        : <div className={styles.panel}><h2>Selecciona el contexto del reporte</h2><p>Abre el aporte o proyecto correspondiente y elige reportar una incidencia.</p><div className={styles.actions}><ButtonLink to="/mis-aportes">Mis aportes</ButtonLink><ButtonLink to="/panel-creador" variant="secondary">Panel del creador</ButtonLink></div></div>)}
      {!create && !id && data.list && <>
        {data.editable && <div><ButtonLink to="/mis-incidencias/nueva">Registrar incidencia</ButtonLink></div>}
        {!data.list.items.length ? <EmptyState title="No hay incidencias en esta página" description="Los casos que registres aparecerán aquí con su referencia y estado actual." />
          : <ul className={styles.list}>{data.list.items.map(item => <li key={item.id} className={styles.panel}><h2><Link to={`/mis-incidencias/${item.id}`}>{item.subject}</Link></h2><p>{item.reference} · {SUPPORT_STATES[item.status]}</p><p className={styles.meta}>{new Date(item.createdAt).toLocaleString('es')}</p></li>)}</ul>}
        <div className={styles.actions}><Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Anterior</Button><span>Página {page} · {data.list.total} casos</span><Button variant="secondary" disabled={page * data.list.pageSize >= data.list.total} onClick={() => setParams({ page: String(page + 1) })}>Siguiente</Button><Button variant="tertiary" onClick={() => setAttempt(value => value + 1)}>Actualizar</Button></div>
      </>}
      {detail && <>
        {replied&&<Message tone="success" title="Respuesta registrada">Tu mensaje se guardó. Soporte puede continuar la atención desde su bandeja.</Message>}
        <Message tone="success" title={`Reporte registrado · ${detail.reference}`}>Estado actual: {SUPPORT_STATES[detail.status]}. Esta referencia confirma la recepción del reporte.</Message>
        <article className={styles.panel}><h2>{detail.subject}</h2><p>{SUPPORT_TYPES.find(([type]) => type === detail.category)?.[1] ?? detail.category ?? 'Incidencia'}</p><p className={styles.meta}>Registrado: {new Date(detail.createdAt).toLocaleString('es')} · Actualizado: {new Date(detail.updatedAt).toLocaleString('es')}</p><p className={styles.prose}>{detail.description}</p>
          {detail.contributionId && <p><Link to={`/mis-aportes/${detail.contributionId}`}>Consultar el aporte vinculado</Link></p>}
          {detail.contributionId && data.editable && <p><Link to={`/mis-disputas/nueva?incidencia=${detail.id}`}>Abrir disputa DEMO del pago de este aporte</Link> · <Link to="/mis-disputas">Consultar disputas existentes antes de repetir</Link></p>}
          <h3>Evidencias privadas</h3>{detail.evidence.length ? <ul>{detail.evidence.map(file => <li key={file.fileId}><a href={`/api/files/${file.fileId}`} target="_blank" rel="noreferrer">{file.name}</a></li>)}</ul> : <p>Sin evidencias adjuntas.</p>}
        </article>
        <section className={styles.panel}><h2>Historial de mensajes</h2>{detail.messages.length ? <ol>{detail.messages.map(message => <li key={message.id}><p><strong>{message.from === 'you' ? 'Tú' : 'Soporte'}</strong> · {new Date(message.createdAt).toLocaleString('es')}</p><p className={styles.prose}>{message.body}</p></li>)}</ol> : <p>Todavía no hay mensajes de seguimiento.</p>}<p>No hay un plazo de atención confirmado. El registro del reporte no inicia una devolución ni resuelve una disputa.</p></section>
        {data.editable&&detail.replyAllowed?<SupportReplyForm key={detail.updatedAt} id={detail.id} onUnauthorized={()=>setAnonymous(true)} onSent={()=>{setReplied(true);setAttempt(value=>value+1)}}/>:<p>Este caso está en consulta. Si tiene una disputa vinculada, responde desde su detalle; los casos resueltos o cerrados no reciben mensajes nuevos.</p>}
        <p>Los avisos de soporte se envían por correo solo si verificaste tu dirección y activaste las notificaciones desde Mi cuenta. Tu propia respuesta no te envía un correo a ti mismo.</p>
        <div><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Actualizar estado</Button></div>
      </>}
    </>}
  </section>
}
