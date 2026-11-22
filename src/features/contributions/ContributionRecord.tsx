import { Link } from 'react-router-dom'
import type { ContributionItem } from './contributionsClient'
import styles from './contributions.module.css'
import { dateLabel, stateLabels } from './labels'
export function ContributionRecord({ item, detail = false }: { item: ContributionItem; detail?: boolean }) {
  const latest = item.payments.at(-1)
  const resume = latest?.demo && item.status === 'PENDING' && ['INITIATED', 'PENDING'].includes(latest.status)
  const revisit = latest?.demo && ['PENDING', 'EXPIRED'].includes(item.status) &&
    item.campaign.status === 'PUBLISHED' && ['FAILED', 'EXPIRED'].includes(latest.status)
  return <article className={styles.card}>
    <p className={styles.reference}>{item.reference}</p><h2>{item.campaign.title}</h2>
    <p className={styles.amount}>{item.amount} {item.currency}</p>
    <p>Aporte: {stateLabels[item.status]} · Campaña: {stateLabels[item.campaign.status] ?? 'Estado no disponible'}</p>
    <p><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></p>
    {item.payments.length === 0 ? <p>No hay intentos de pago registrados.</p> : item.payments.map(payment => <p key={payment.id}>Pago: {stateLabels[payment.status] ?? 'Estado no disponible'}{payment.sandbox ? ' · Sin dinero real' : ''}</p>)}
    <nav className={styles.actions} aria-label={`Acciones de ${item.reference}`}>
      {latest && (resume || revisit) && <Link to={`/apoyo-demo?pago=${latest.id}`}>{resume ? 'Continuar con el pago' : 'Consultar opciones del pago'}</Link>}
      {!detail && <Link to={`/mis-aportes/${item.id}`}>Ver detalle</Link>}
      {item.receiptAvailable && <Link to={`/mis-aportes/${item.id}/comprobante`}>Comprobante informativo</Link>}
      {item.campaign.slug && <Link to={`/proyectos/${encodeURIComponent(item.campaign.slug)}`}>Ver campaña</Link>}
      <Link to={`/mis-incidencias/nueva?campaignId=${item.campaign.id}&contributionId=${item.id}`}>Reportar incidencia</Link>
    </nav>
  </article>
}
