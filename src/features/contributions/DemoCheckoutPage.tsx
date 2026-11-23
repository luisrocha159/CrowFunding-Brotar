import {useState} from 'react'
import {Link,Navigate,useLocation,useNavigate,useSearchParams} from 'react-router-dom'
import {Button} from '../../shared/components/Button'
import {ContributionSession} from './ContributionPages'
import {useDemoCheckout} from './useDemoCheckout'
import {PaymentQr} from './PaymentQrCode'
import {stateLabels,dateLabel,paymentMethodLabel} from './labels'
import styles from './contributions.module.css'

export function DemoCheckoutPage(){
  const [params]=useSearchParams()
  return <ContributionSession><Checkout key={params.toString()} selectionId={params.get('seleccion')} paymentId={params.get('pago')}/></ContributionSession>
}
function Checkout({selectionId,paymentId}:{selectionId:string|null;paymentId:string|null}) {
  const data=useDemoCheckout(selectionId,paymentId),navigate=useNavigate(),location=useLocation()
  const [consent,setConsent]=useState(false)
  if(data.anonymous)return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(location.pathname+location.search)}`}/>
  const {selection,ticket}=data
  const pending=ticket?.status==='INITIATED'||ticket?.status==='PENDING'
  const retry=ticket?.status==='FAILED'||ticket?.status==='EXPIRED'
  const value=ticket??selection
  const currency=ticket?.currencyCode??selection?.currency
  const amount=value&&currency?`${Number(value.amount).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})} ${currency}`:''
  function viewPayment(result:{paymentId:string}|null) {
    if(result)navigate(`/apoyo-demo?pago=${result.paymentId}`,{replace:true})
  }
  return <section className={styles.layout}>
    <nav className={styles.actions} aria-label="Aportes"><Link to="/panel-patrocinador">Mi panel</Link><Link to="/mis-aportes">Mis aportes</Link></nav>
    <header><h1>{ticket?'Estado del pago':'Revisar aporte'}</h1><p>Registro de aportes en el entorno académico.</p></header>
    {data.loading&&<p role="status">Consultando el aporte…</p>}
    {data.error&&<div role="alert" className={styles.notice}>{data.error} <Button variant="secondary" disabled={data.busy} onClick={data.reload}>Volver a consultar</Button></div>}
    {!ticket&&selection&&<section className={styles.checkoutCard}>
      <h2>{selection.campaignTitle}</h2>
      <div className={styles.checkoutAmount}><span>Total de tu aporte</span><strong>{amount}</strong></div>
      <dl className={styles.checkoutFacts}><div><dt>Método de pago</dt><dd>{paymentMethodLabel(selection.method)}</dd></div><div><dt>Recompensa</dt><dd>{selection.rewardTitle??'Sin recompensa'}</dd></div></dl>
      <Link to={`/simulacion-apoyo?campaignId=${selection.campaignId}`}>Cambiar importe o recompensa</Link>
      <label className={styles.confirmation}><input type="checkbox" required disabled={data.busy} checked={consent} onChange={event=>setConsent(event.target.checked)}/>Confirmo el importe y la recompensa de mi aporte.</label>
      <div><Button disabled={!consent||data.busy} loading={data.busy} loadingLabel="Preparando pago…" onClick={()=>void data.create().then(viewPayment)}>Continuar al pago</Button></div>
    </section>}
    {ticket&&<section className={styles.checkoutCard}>
      <div className={styles.checkoutTop}><h2>Aporte {ticket.reference}</h2><strong role="status" className={styles.checkoutState}>{pending?'Pendiente de verificación':stateLabels[ticket.status]}</strong></div>
      <div className={styles.checkoutAmount}><span>{ticket.status==='CONFIRMED'?'Pago confirmado':pending?'Importe pendiente':'Importe del intento'}</span><strong>{amount}</strong></div>
      <dl className={styles.checkoutFacts}><div><dt>Método</dt><dd>{paymentMethodLabel(ticket.method)}</dd></div>{pending&&ticket.expiresAt&&<div><dt>Disponible hasta</dt><dd>{dateLabel(ticket.expiresAt)}</dd></div>}</dl>
      {pending&&<>
        {ticket.method==='TEST_QR'&&<PaymentQr key={ticket.paymentId} ticket={ticket}/>}
        <p>Finanzas revisará la referencia y el importe del aporte. Cuando confirme el pago, podrás consultar el comprobante desde Mis aportes.</p>
        <div className={styles.actions}><Button variant="secondary" disabled={data.busy} onClick={data.reload}>Actualizar estado</Button></div>
      </>}
      {retry&&<><p>{ticket.status==='EXPIRED'?'Venció el plazo para pagar.':'El pago no se completó.'} Puedes solicitar un nuevo intento para este mismo aporte, sujeto a disponibilidad.</p>
        <label className={styles.confirmation}><input type="checkbox" checked={consent} disabled={data.busy} onChange={event=>setConsent(event.target.checked)}/>Quiero reintentar el pago de este aporte.</label>
        <div><Button disabled={data.busy||!consent} loading={data.busy} loadingLabel="Preparando pago…" onClick={()=>void data.retry().then(viewPayment)}>Reintentar pago</Button></div></>}
      <div className={styles.actions}>{ticket.status==='CONFIRMED'&&<Link className={styles.checkoutCta} to={`/mis-aportes/${ticket.contributionId}/comprobante`}>Ver comprobante</Link>}<Link to={`/mis-aportes/${ticket.contributionId}`}>Ver detalle del aporte</Link></div>
    </section>}
    {!data.loading&&!selection&&!ticket&&!data.error&&<p>Elige una campaña para preparar tu aporte. <Link to="/explorar">Explorar campañas</Link></p>}
  </section>
}
