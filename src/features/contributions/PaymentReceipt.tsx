import { Link } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import type { Receipt } from './contributionsClient'
import { dateLabel, paymentMethodLabel } from './labels'
import css from './receipt.module.css'

export function PaymentReceipt({ receipt, refresh }: { receipt: Receipt; refresh: () => void }) {
  const amount = new Intl.NumberFormat('es-BO', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(Number(receipt.amount))
  return <div className={css.wrap}>
    <article className={css.sheet} aria-label="Comprobante del aporte">
      <header className={css.top}><strong className={css.brand}>brotar</strong><span className={css.status}>✓ Pago confirmado</span></header>
      <h1>Comprobante de aporte</h1>
      <p className={css.ref}>Referencia <strong>{receipt.reference}</strong></p>
      <section className={css.amount}><span>Importe confirmado</span><strong>{amount} <small>{receipt.currency}</small></strong></section>
      <dl className={css.facts}>
        <div className={css.full}><dt>Campaña</dt><dd>{receipt.campaignTitle}</dd></div>
        <div><dt>Método de pago</dt><dd>{paymentMethodLabel(receipt.method)}</dd></div>
        <div><dt>Fecha de confirmación</dt><dd><time dateTime={receipt.confirmedAt}>{dateLabel(receipt.confirmedAt)}</time></dd></div>
      </dl>
      <footer className={css.note}>{receipt.sandbox ? 'Constancia de un aporte de práctica, sin movimiento de dinero real.' : 'Constancia informativa del pago registrado.'} Consulta su vigencia en Mis aportes con la referencia indicada.</footer>
    </article>
    <div className={css.controls}><Button onClick={() => window.print()}>Imprimir o guardar PDF</Button><Button variant="secondary" onClick={refresh}>Verificar de nuevo</Button><Link to={`/mis-aportes/${receipt.contributionId}`}>Volver al aporte</Link></div>
    <details className={css.technical}><summary>Referencia técnica del pago</summary><code>{receipt.paymentId}</code></details>
  </div>
}
