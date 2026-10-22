import { Link } from 'react-router-dom'
import type { ContributionItem } from './contributionsClient'
import styles from './contributions.module.css'
import { dateLabel, stateLabels } from './labels'
export function ContributionRecord({ item, detail = false }: { item: ContributionItem; detail?: boolean }) {
  return <article className={styles.card}>
    <p className={styles.reference}>{item.reference}</p><h2>{item.campaign.title}</h2>
    <p className={styles.amount}>{item.amount} {item.currency}</p>
    <p>Aporte: {stateLabels[item.status] ?? item.status} · Campaña: {stateLabels[item.campaign.status] ?? item.campaign.status}</p>
    <p><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></p>
    {item.payments.length === 0 ? <p>No hay intentos de pago registrados.</p> : item.payments.map(payment => <p key={payment.id}>Pago: {stateLabels[payment.status] ?? payment.status}{payment.sandbox ? ' · SANDBOX: prueba sin dinero real' : ''}</p>)}
    <nav className={styles.actions} aria-label={`Acciones de ${item.reference}`}>
      {!detail && <Link to={`/mis-aportes/${item.id}`}>Ver detalle</Link>}
      {item.receiptAvailable && <Link to={`/mis-aportes/${item.id}/comprobante`}>Comprobante informativo</Link>}
      {item.campaign.slug && <Link to={`/proyectos/${encodeURIComponent(item.campaign.slug)}`}>Ver campaña</Link>}
      <Link to={`/mis-incidencias/nueva?campaignId=${item.campaign.id}&contributionId=${item.id}`}>Reportar incidencia</Link>
    </nav>
  </article>
}
