import {AccountIdentity} from '../../shared/components/AccountIdentity'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { EmptyState, Message } from '../../shared/components/Feedback'
import { useAccessPermissions } from '../access/session/accessPermissions'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import { financeMoney, paymentLabels } from './financeClient'
import { batchLabels, periodError, reasonError, reconciliationError, reconciliationLabels, type PendingPayment, type ReconciliationDetail, type ReconciliationFilters, type ReconciliationItem, type ResolutionAction } from './reconciliationClient'
import { useReconciliation } from './useReconciliation'
import layout from '../campaigns/projects.module.css'
import styles from './finance.module.css'

function Stamp({value}: {value: string|null}) {return <>{value?<time dateTime={value}>{value.replace('T',' ').replace('Z',' UTC')}</time>:'No registrado'}</>}
type ConfirmPayment = (id:string,reference:string,key:string,number:string)=>Promise<unknown>
function PaymentReview({item,busy,onConfirm}:{item:PendingPayment;busy:boolean;onConfirm:ConfirmPayment}) {
  const [reference,setReference]=useState(''),[checked,setChecked]=useState(false)
  const intent=useRef<{value:string;key:string}|null>(null)
  const valid=reference.trim().length>=5 && reference.trim().length<=120
  function submit(event:FormEvent){
    event.preventDefault()
    if(!valid || !checked || busy)return
    const value=reference.trim()
    if(intent.current?.value!==value)intent.current={value,key:crypto.randomUUID()}
    void onConfirm(item.id,value,intent.current.key,item.reference)
  }
  return <details className={styles.paymentReview}><summary>Revisar pago</summary>
    <form onSubmit={submit}><fieldset disabled={busy}><legend>Verificar con una constancia</legend>
      <p>Compara el importe y la referencia del aporte con la constancia disponible. Si falta respaldo, deja el pago pendiente.</p>
      <FormField label="Referencia de la constancia" required minLength={5} maxLength={120} value={reference} onChange={e=>{setReference(e.target.value);setChecked(false)}} />
      <label className={styles.confirmation}><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>Verifiqué que el importe y la referencia corresponden a este aporte.</label>
      <Button type="submit" disabled={!valid || !checked || busy}>Confirmar pago</Button>
    </fieldset></form></details>
}
export function PendingResults({items,busy=false,onConfirm}: {items: PendingPayment[];busy?:boolean;onConfirm?: ConfirmPayment}) {
  return <div className={styles.records}>{items.map(item=><article className={styles.record} key={item.id}>
    <header className={styles.paymentHeading}><div><span>{item.reference}</span><h3>{item.campaignTitle}</h3></div><strong>{financeMoney(item.amount,item.currencyCode)}</strong></header>
    <p>{item.needsReview?'Aviso que requiere revisión':item.expired?'Reserva vencida':'Pendiente de verificación'}</p>
    <dl><dt>Cuenta aportante</dt><dd><AccountIdentity contact={item.sponsorContact}/></dd><dt>Registrado (UTC)</dt><dd><Stamp value={item.createdAt} /></dd><dt>Vencimiento (UTC)</dt><dd><Stamp value={item.expiresAt} /></dd></dl>
    {item.needsReview && <p>Revisa el aviso en un lote de conciliación que incluya la fecha de la primera observación.</p>}
    {onConfirm && !item.expired && !item.needsReview && ['INITIATED','PENDING'].includes(item.status) && <PaymentReview item={item} busy={busy} onConfirm={onConfirm}/>}
  </article>)}</div>
}
export function ReconciliationSummary({batch}: {batch: ReconciliationDetail}) {
  return <section className={styles.record} aria-label="Resumen de conciliación"><h2>Lote {batch.id}</h2>
    <p><strong>{batchLabels[batch.status]}</strong> · {batch.from} a {batch.to}, inclusive UTC · {batch.currencyCode}</p>
    <dl><dt>Confirmaciones internas brutas</dt><dd>{financeMoney(batch.totalInternal,batch.currencyCode)}</dd>
      <dt>Recibos brutos</dt><dd>{financeMoney(batch.totalProvider,batch.currencyCode)}</dd><dt>Diferencia entre confirmaciones internas y recibos</dt><dd>{financeMoney(batch.difference,batch.currencyCode)}</dd>
      <dt>Instantánea (UTC)</dt><dd><Stamp value={batch.snapshotAt} /></dd><dt>Preparó el lote</dt><dd><AccountIdentity contact={batch.createdByContact}/></dd>
      <dt>Cerró el lote</dt><dd><AccountIdentity contact={batch.closedByContact} empty="Sin cierre registrado"/></dd><dt>Fecha de cierre (UTC)</dt><dd><Stamp value={batch.closedAt} /></dd></dl>
    <p>Estos totales son el corte original, no un saldo disponible para desembolsar. Una resolución no reescribe importes ni hace desaparecer la diferencia histórica.</p>
  </section>
}
function ResolutionForm({item,busy,onResolve}: {item: ReconciliationItem;busy: boolean;onResolve: (action: ResolutionAction,reason: string)=>Promise<unknown>}) {
  const [action,setAction]=useState<ResolutionAction>('RECHECK'),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid=reasonError(reason)
    if(invalid){setError(invalid);event.currentTarget.querySelector('textarea')?.focus();return}
    if(!confirmed){setError('Confirma expresamente la acción para esta referencia.');return}
    const result=await onResolve(action,reason.trim())
    if(result){setReason('');setConfirmed(false);setError('')}
  }
  return <form onSubmit={event=>void submit(event)} className={styles.resolution} aria-label={`Resolver referencia ${item.reference}`}>
    <fieldset disabled={busy}><legend>Resolución trazable</legend>
      <FormField as="select" label="Acción" required value={action} onChange={event=>{setAction(event.target.value as ResolutionAction);setConfirmed(false);setError('')}}>
        <option value="RECHECK">Contrastar evidencia actual</option>
        {item.status==='MISSING_INTERNAL' && item.paymentId && <option value="COMPENSATE_DEMO">Registrar compensación sin ingreso interno</option>}
      </FormField>
      <p>{action==='RECHECK'?'El servidor comprobará la evidencia vigente. Si sigue faltando o difiere, la referencia permanecerá abierta.':'Solo para un recibo simulado inequívoco que nunca ingresó. Otra persona de Finanzas debe resolver el aporte del interesado. No es una devolución bancaria ni de un aporte confirmado.'}</p>
      <FormField as="textarea" label="Motivo" required minLength={20} maxLength={500} value={reason} error={error || undefined} help="20–500 caracteres. Describe la evidencia; no incluyas contraseñas ni datos bancarios." onChange={event=>{setReason(event.target.value);setConfirmed(false);setError('')}} />
      <label className={styles.confirmation}><input type="checkbox" required checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} />Confirmo esta acción para la referencia indicada. No autoriza dinero real.</label>
      <Button type="submit" loading={busy} loadingLabel="Comprobando…" disabled={!confirmed}>Registrar resolución</Button>
    </fieldset>
  </form>
}
export function ReconciliationItems({batch,operate=false,busy=false,onResolve=async()=>null}: {batch: ReconciliationDetail;operate?: boolean;busy?: boolean;onResolve?: (itemId: string,action: ResolutionAction,reason: string)=>Promise<unknown>}) {
  return <div className={styles.records}>{batch.items.map(item=><article className={styles.record} key={item.id}>
    <h3>{reconciliationLabels[item.status]}</h3><dl><dt>Referencia</dt><dd>{item.reference}</dd><dt>Cuenta aportante</dt><dd><AccountIdentity contact={item.sponsorContact} empty="Sin cuenta interna vinculada"/></dd><dt>Referencia del aporte</dt><dd>{item.internalReference ?? 'Sin relación inequívoca'}</dd>
      <dt>ID de pago</dt><dd>{item.paymentId ?? 'Referencia ambigua: requiere investigación'}</dd><dt>Estado interno vigente al consultar</dt><dd>{item.internalStatus?paymentLabels[item.internalStatus]:'No disponible'}</dd>
      <dt>Importe interno del corte</dt><dd>{financeMoney(item.internalAmount,batch.currencyCode)}</dd><dt>Importe del corte</dt><dd>{financeMoney(item.providerAmount,batch.currencyCode)}</dd>
      <dt>Clasificación original</dt><dd>{reconciliationLabels[item.originalStatus]}</dd></dl>
    {item.status==='RESOLVED' && <><h4>Resolución registrada</h4><dl><dt>Acción</dt><dd>{item.resolution==='RECHECK'?'Contraste de evidencia':'Compensación sin ingreso interno'}</dd><dt>Motivo</dt><dd>{item.reason}</dd><dt>Resolvió la diferencia</dt><dd><AccountIdentity contact={item.resolvedByContact}/></dd><dt>Fecha (UTC)</dt><dd><Stamp value={item.resolvedAt} /></dd>
      <dt>Compensación</dt><dd>{item.compensationAmount?financeMoney(item.compensationAmount,batch.currencyCode):'No aplica'}</dd></dl></>}
    {operate && batch.status!=='CLOSED' && !['MATCHED','RESOLVED'].includes(item.status) && <ResolutionForm key={item.id+item.status} item={item} busy={busy} onResolve={(action,reason)=>onResolve(item.id,action,reason)} />}
  </article>)}</div>
}
function CloseForm({busy,eligible,onClose}: {busy: boolean;eligible: boolean;onClose: ()=>Promise<unknown>}) {
  const [confirmed,setConfirmed]=useState(false)
  return <form className={styles.record} onSubmit={event=>{event.preventDefault();if(confirmed && eligible)void onClose()}} aria-label="Cerrar lote">
    <h2>Cierre del lote</h2><p>Requiere todas las referencias coincidentes o resueltas. El servidor vuelve a comprobar la evidencia. No se puede forzar el cierre ni modificar un lote cerrado.</p>
    {!eligible && <p>Hay diferencias sin resolver. Revisa las referencias antes de cerrar.</p>}
    <label className={styles.confirmation}><input type="checkbox" required disabled={!eligible || busy} checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} />He revisado este lote y confirmo su cierre.</label>
    <Button type="submit" loading={busy} disabled={!confirmed || !eligible}>Cerrar lote revisado</Button>
  </form>
}
function OverviewForm({filters,currencies,busy,operate,onApply,onCreate,onExpire}: {filters: ReconciliationFilters;currencies: {code: string;name: string}[];busy: boolean;operate: boolean;onApply: (f: ReconciliationFilters)=>void;onCreate: (f: ReconciliationFilters)=>Promise<unknown>;onExpire: ()=>Promise<unknown>}) {
  const [draft,setDraft]=useState(filters),[error,setError]=useState(''),[expireConfirmed,setExpireConfirmed]=useState(false)
  function valid() {const message=periodError(draft);setError(message);return !message}
  return <>
    <form className={styles.filters} aria-label="Período de conciliación" onSubmit={event=>{event.preventDefault();if(valid())onApply(draft)}}>
      <fieldset disabled={busy} className={styles.filterFields}><legend>Período y moneda</legend>
        <FormField type="date" label="Desde (UTC)" required min="0001-01-01" max={draft.to || '9999-12-31'} value={draft.from} onChange={event=>setDraft({...draft,from:event.target.value})} />
        <FormField type="date" label="Hasta (UTC, inclusive)" required min={draft.from || '0001-01-01'} max="9999-12-31" value={draft.to} onChange={event=>setDraft({...draft,to:event.target.value})} />
        <FormField as="select" label="Moneda del catálogo" required value={draft.currencyCode} onChange={event=>setDraft({...draft,currencyCode:event.target.value})}>
          <option value="">Selecciona una moneda</option>{currencies.map(x=><option key={x.code} value={x.code}>{x.code} · {x.name}</option>)}
        </FormField>
        <p>Máximo 31 días inclusive. Pendientes: fecha de creación del intento. Lotes: fecha de confirmación interna y primera observación, en UTC. No se mezclan monedas.</p>
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}><Button type="submit">Consultar pendientes</Button>{operate && <Button variant="secondary" onClick={()=>{if(valid())void onCreate(draft)}} loading={busy} loadingLabel="Creando…">Crear lote del período</Button>}</div>
      </fieldset>
    </form>
    {operate && <section className={styles.record}><h2>Mantenimiento de reservas vencidas</h2><p>Procesa hasta 100 intentos por operación, en todas las fechas y monedas. Solo persiste expiraciones: no confirma cobros ni compensa recibos.</p>
      <label className={styles.confirmation}><input type="checkbox" checked={expireConfirmed} disabled={busy} onChange={event=>setExpireConfirmed(event.target.checked)} />Confirmo procesar reservas vencidas, no solamente las del filtro.</label>
      <Button variant="secondary" disabled={!expireConfirmed} loading={busy} onClick={()=>{setExpireConfirmed(false);void onExpire()}}>Procesar vencimientos</Button>
    </section>}
  </>
}
export function ReconciliationPage() {
  const {id}=useParams(),navigate=useNavigate(),data=useReconciliation(id),permissions=useAccessPermissions()
  const operate=permissions.can('finance.operate') && data.state==='ready'
  if(data.state==='anonymous')return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent('/administracion/conciliacion'+(id?`/${id}`:''))}`} />
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={layout.content}>
    <header className={layout.heading}><div><h1>Conciliación</h1><p>Revisión de pagos y conciliación de aportes</p></div></header>
    <p>Finanzas verifica los pagos pendientes y revisa las diferencias entre los registros de la plataforma y sus recibos.</p>
    <div className={styles.actions}>{id && <ButtonLink to="/administracion/conciliacion" variant="secondary">Volver a los lotes</ButtonLink>}<Button variant="secondary" disabled={data.busy} onClick={data.refresh}>Actualizar estado</Button></div>
    {data.state==='forbidden'?<Message tone="warning" title="Acceso restringido">Para consultar necesitas acceso al panel financiero. Solo Finanzas puede resolver conciliaciones con permisos de escritura.</Message>:<>
      {data.state==='loading' && <p role="status" aria-busy="true">Consultando conciliación…</p>}
      {data.state==='error' && <Message tone="error" title="No se pudo consultar">{reconciliationError(data.error)} Usa Actualizar estado para reintentar.</Message>}
      {data.mutationError && <Message tone="error" title="Operación no confirmada">{reconciliationError(data.mutationError)}</Message>}
      {data.message && <Message tone="success" title="Resultado del servidor">{data.message}</Message>}
      {data.state==='ready' && <>
        {permissions.error && <Message tone="warning" title="No se pudieron consultar permisos de operación">Solo se mostrará lectura. Recarga antes de intentar operar.</Message>}
        {!operate && <p>Acceso de consulta: no puedes crear, resolver, expirar ni cerrar operaciones desde este perfil.</p>}
        {data.overview && <>

          <h2 id="pagos-pendientes">Pagos pendientes de verificación</h2><p>Localiza la referencia del aporte para revisar el importe y la cuenta.</p>
          <details className={styles.queueFilters}><summary>Período, moneda y operaciones del lote</summary><OverviewForm filters={data.filters} currencies={data.overview.currencies} busy={data.busy} operate={operate} onApply={data.apply} onCreate={async filters=>{const result=await data.create(filters);if(result && typeof result!=='number')navigate(`/administracion/conciliacion/${result.id}`)}} onExpire={data.expire} /></details>
          {data.overview.pending.items.length?<PendingResults items={data.overview.pending.items} busy={data.busy} onConfirm={operate ? data.confirmPayment : undefined} />:<EmptyState title="Sin pendientes en esta página" description="No hay intentos ni avisos por revisar para el período, moneda y posición consultados." />}
          <nav className={styles.actions} aria-label="Páginas de pendientes"><Button variant="secondary" disabled={data.busy || !data.pendingPrevious} onClick={data.pendingBack}>Pendientes anteriores</Button><Button variant="secondary" disabled={data.busy || !data.overview.pending.nextCursor} onClick={data.pendingNext}>Pendientes siguientes</Button></nav>
          <h2>Lotes registrados</h2><p>Historial de todas las fechas y monedas; el filtro superior define pendientes y nuevos lotes, no oculta lotes históricos.</p>
          {data.overview.batches.items.length?<div className={styles.records}>{data.overview.batches.items.map(batch=><article className={styles.record} key={batch.id}><h3>{batch.from} a {batch.to} · {batch.currencyCode}</h3><p>{batchLabels[batch.status]}</p><p><strong>Preparó el lote:</strong> <AccountIdentity contact={batch.createdByContact}/></p><p>ID: {batch.id}</p><p>Diferencia bruta del corte: {financeMoney(batch.difference,batch.currencyCode)}</p><ButtonLink variant="secondary" to={`/administracion/conciliacion/${batch.id}`}>Revisar lote</ButtonLink></article>)}</div>:<EmptyState title="Sin lotes en esta página" description="Finanzas puede crear un lote para contrastar el período y moneda seleccionados." />}
          <nav className={styles.actions} aria-label="Páginas de lotes"><Button variant="secondary" disabled={data.busy || !data.batchPrevious} onClick={data.batchBack}>Lotes anteriores</Button><Button variant="secondary" disabled={data.busy || !data.overview.batches.nextCursor} onClick={data.batchNext}>Lotes siguientes</Button></nav>
        </>}
        {data.detail && <><ReconciliationSummary batch={data.detail} /><h2>Referencias del lote</h2>
          {data.detail.items.length?<ReconciliationItems batch={data.detail} operate={operate} busy={data.busy} onResolve={data.resolve} />:<EmptyState title="Lote sin confirmaciones" description="No hay confirmaciones internas ni recibos confirmados en este corte. No significa que no haya intentos pendientes." />}
          {operate && data.detail.status!=='CLOSED' && <CloseForm key={data.detail.id+JSON.stringify(data.detail.items.map(x=>x.status))} busy={data.busy} eligible={data.detail.items.every(x=>['MATCHED','RESOLVED'].includes(x.status))} onClose={data.close} />}
          {data.detail.status==='CLOSED' && <Message tone="info" title="Lote cerrado: solo consulta">Conserva su corte e historial. Para nuevas observaciones o correcciones, crea otro lote.</Message>}
        </>}
      </>}
    </>}
  </section></div>
}
