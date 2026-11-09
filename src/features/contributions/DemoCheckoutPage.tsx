import {useState} from 'react'
import {Link,Navigate,useNavigate,useSearchParams} from 'react-router-dom'
import {Button} from '../../shared/components/Button'
import {ContributionSession} from './ContributionPages'
import {useDemoCheckout} from './useDemoCheckout'
import {PaymentQr} from './PaymentQrCode'
import {stateLabels,dateLabel,paymentMethodLabel} from './labels'
import styles from './contributions.module.css'
export function DemoCheckoutPage(){const [params]=useSearchParams();return <ContributionSession><Checkout key={params.toString()} selectionId={params.get('seleccion')} paymentId={params.get('pago')} /></ContributionSession>}
function Checkout({selectionId,paymentId}:{selectionId:string|null;paymentId:string|null}) {
 const data=useDemoCheckout(selectionId,paymentId),navigate=useNavigate(),[confirmed,setConfirmed]=useState(false)
 if(data.anonymous)return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent('/apoyo-demo'+(paymentId?`?pago=${paymentId}`:selectionId?`?seleccion=${selectionId}`:''))}`} />
 const selection=data.selection,ticket=data.ticket
 return <section className={styles.layout}><h1>Revisar aporte</h1><p>Comprueba el importe, la recompensa elegida y el estado de tu operación.</p>
  <nav className={styles.actions}><Link to="/panel-patrocinador">Mi panel</Link><Link to="/mis-aportes">Mis aportes</Link><Link to="/explorar">Explorar campañas</Link></nav>
  {data.loading && <p role="status">Consultando estado…</p>}{data.error && <p role="alert">{data.error}</p>}{data.notice && <p role="status">{data.notice}</p>}
  {!ticket && selection && <section className={styles.card}><h2>Revisar selección antes de reservar</h2><h3>{selection.campaignTitle}</h3><dl className={styles.details}><dt>Importe</dt><dd>{selection.amount} {selection.currency}</dd><dt>Método</dt><dd>{paymentMethodLabel(selection.method)}</dd><dt>Recompensa</dt><dd>{selection.rewardTitle ?? 'Sin recompensa'}</dd><dt>Comisión de ensayo</dt><dd>0,00 {selection.currency}</dd><dt>Privacidad</dt><dd>Historial y comprobante solo para tu sesión. No se publican correo ni datos de contacto del aporte.</dd><dt>Reserva</dt><dd>Hasta 30 minutos o el fin de la campaña. Crear intento no lo confirma.</dd></dl>
   <p>El servidor revalida estado, fechas, moneda, mínimos y cupos. Puedes corregir antes de confirmar; no se enviarán direcciones ni credenciales bancarias.</p><Link to={`/simulacion-apoyo?campaignId=${selection.campaignId}`}>Corregir monto o recompensa</Link>
   <label className={styles.confirmation}><input type="checkbox" required disabled={data.busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />Confirmo los datos y autorizo registrar este aporte.</label>
   <Button disabled={!confirmed} loading={data.busy} loadingLabel="Registrando intento…" onClick={()=>void data.create().then(value=>{if(value)navigate(`/apoyo-demo?pago=${value.paymentId}`,{replace:true})})}>Crear intento</Button>
  </section>}
  {ticket && <section className={styles.card}><h2>Intento de pago</h2><p className={styles.reference}>{ticket.reference}</p><dl className={styles.details}><dt>ID del intento</dt><dd>{ticket.paymentId}</dd><dt>Importe</dt><dd>{ticket.amount} {ticket.currencyCode}</dd><dt>Método</dt><dd>{paymentMethodLabel(ticket.method)}</dd><dt>Estado del intento</dt><dd>{stateLabels[ticket.status] ?? ticket.status}</dd><dt>Número de intento</dt><dd>{ticket.attempt}</dd><dt>Vencimiento</dt><dd>{ticket.expiresAt?dateLabel(ticket.expiresAt):'No registrado'}</dd></dl>
   {ticket.method!=='TEST_CARD'&&<PaymentQr key={ticket.paymentId} ticket={ticket}/>}
   {ticket.expired && <p>La reserva venció. Consultar esta fecha no equivale a un pago confirmado; un aviso tardío requiere revisión.</p>}
   <div className={styles.actions}>{['INITIATED','PENDING'].includes(ticket.status) && ['PENDING','CONFIRMED','FAILED','EXPIRED'].map(outcome=><Button key={outcome} variant="secondary" disabled={data.busy} onClick={()=>void data.simulate(outcome)}>Simular {stateLabels[outcome] ?? outcome}</Button>)}
    {['FAILED','EXPIRED'].includes(ticket.status) && <Button disabled={data.busy || !confirmed} onClick={()=>void data.retry().then(value=>{if(value)navigate(`/apoyo-demo?pago=${value.paymentId}`,{replace:true})})}>Reintentar el mismo aporte</Button>}
    <Button variant="secondary" disabled={data.busy} onClick={data.reload}>Consultar estado del intento</Button><Link to={`/mis-aportes/${ticket.contributionId}`}>Ver aporte e historial de intentos</Link>{ticket.status==='CONFIRMED' && <Link to={`/mis-aportes/${ticket.contributionId}/comprobante`}>Comprobante</Link>}</div>
   {['FAILED','EXPIRED'].includes(ticket.status) && <label className={styles.confirmation}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />Confirmo los datos y autorizo un nuevo intento.</label>}
   <p>La confirmación válida de este ensayo es el recibo registrado por el servidor, no la imagen ni el clic. Una respuesta pendiente de revisión no confirma ni duplica el ingreso.</p>
  </section>}
  {!data.loading && !selection && !ticket && !data.error && <p>Selecciona primero una campaña y un monto desde el catálogo.</p>}
 </section>
}
