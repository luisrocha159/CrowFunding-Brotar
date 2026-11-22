import { Link } from 'react-router-dom'
import { ButtonLink } from '../../shared/components/Button'
import { financeMoney } from '../finance/financeClient'
import type { SponsorSummary } from './contributionsClient'
import { stateLabels } from './labels'
import styles from './sponsor-overview.module.css'

function Amounts({ title, rows }: { title: string; rows: SponsorSummary['totals'] }) {
  return <section className={styles.block}>
    <h2>{title}</h2>
    {rows.length ? rows.map(row => <dl className={styles.amounts} key={row.currency}>
      <div><dt>Total confirmado</dt><dd>{financeMoney(row.grossConfirmed, row.currency)}</dd></div>
      <div><dt>Devuelto</dt><dd>{financeMoney(row.refunded, row.currency)}</dd></div>
      <div><dt>En disputa</dt><dd>{financeMoney(row.disputed, row.currency)}</dd></div>
    </dl>) : <p>Tus importes aparecerán aquí al confirmarse el primer pago.</p>}
    {rows.length > 0 && <small>El total confirmado incluye los pagos que después tuvieron una devolución o una disputa.</small>}
  </section>
}

export function SponsorOverview({ summary }: { summary: SponsorSummary }) {
  const pending = summary.statusCounts.find(row => row.status === 'PENDING')?.count ?? 0
  return <>
    <header className={styles.hero}>
      <div><h1>Mi panel de patrocinador</h1><p>Consulta tus aportes, comprobantes y campañas seguidas.</p></div>
      <ButtonLink to="/explorar">Explorar campañas</ButtonLink>
    </header>
    <section className={styles.overview} aria-label="Resumen de actividad">
      <div><span>Aportes registrados</span><strong>{summary.contributionCount}</strong><Link to="/mis-aportes">Ver historial</Link></div>
      <div><span>Campañas apoyadas</span><strong>{summary.campaignsSupported}</strong></div>
      <div><span>Aportes pendientes</span><strong>{pending}</strong>{pending > 0 && <Link to="/mis-aportes?status=PENDING">Revisar pendientes</Link>}</div>
    </section>
    {summary.statusCounts.length > 0 && <nav className={styles.states} aria-label="Filtrar mis aportes por estado">
      {summary.statusCounts.map(row => <Link key={row.status} to={`/mis-aportes?status=${row.status}`}>{stateLabels[row.status]} <b>{row.count}</b></Link>)}
    </nav>}
    {summary.demoTotals !== undefined && <Amounts title="Mis pagos de práctica" rows={summary.demoTotals} />}
    {(summary.totals.length > 0 || summary.demoTotals === undefined) && <Amounts title="Pagos registrados por moneda" rows={summary.totals} />}
    <div className={styles.columns}>
      <section className={styles.block}><h2>Campañas y seguimiento</h2>
        <ul className={styles.links}>
          <li><Link to="/mis-guardados?vista=FAVORITE">Guardadas <b>{summary.favorites}</b></Link></li>
          <li><Link to="/mis-guardados?vista=FOLLOW">Seguidas <b>{summary.following}</b></Link></li>
        </ul>
      </section>
      <section className={styles.block}><h2>Solicitudes y ayuda</h2>
        <ul className={styles.links}>
          <li><Link to="/mis-incidencias">Incidencias abiertas <b>{summary.openSupportCases}</b></Link></li>
          <li><Link to="/mis-devoluciones">Devoluciones pendientes <b>{summary.pendingRefunds}</b></Link></li>
          <li><Link to="/mis-disputas">Disputas abiertas <b>{summary.openDisputes}</b></Link></li>
        </ul>
      </section>
    </div>
  </>
}
