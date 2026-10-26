import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { EmptyState, Message } from '../../shared/components/Feedback'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import { financeMoney, paymentLabels, type FinanceFilters, type FinanceReport } from './financeClient'
import { useFinance } from './useFinance'
import layout from '../campaigns/projects.module.css'
import styles from './finance.module.css'

export function FinanceResults({report}: {report: FinanceReport}) {
  return <>
    <section aria-labelledby="finance-totals"><h2 id="finance-totals">Totales del filtro completo</h2>
      <p>No suman monedas diferentes. Iniciados y pendientes no son dinero recaudado. Neto del intento = importe − comisión; no es saldo disponible para desembolsar.</p>
      <div className={styles.totals}>{report.totals.map(total=><article className={styles.total} key={`${total.currencyCode}:${total.status}`}>
        <h3>{total.currencyCode} · {paymentLabels[total.status]}</h3><p>{total.count} intentos de pago</p>
        <dl><dt>Importe</dt><dd>{financeMoney(total.amount,total.currencyCode)}</dd><dt>Comisión</dt><dd>{financeMoney(total.feeAmount,total.currencyCode)}</dd>
          <dt>Neto de intentos</dt><dd>{financeMoney(total.netAmount,total.currencyCode)}</dd><dt>Devoluciones completadas</dt><dd>{financeMoney(total.refundedAmount,total.currencyCode)}</dd></dl>
      </article>)}</div>
    </section>
    <h2>Pagos registrados</h2><p>Cada registro es un intento de pago, no un aporte nuevo. El identificador del patrocinador permite seguimiento sin exponer su correo o documentos. Fechas y filtros en UTC.</p>
    <div className={styles.records}>{report.items.map(item=><article className={styles.record} key={item.id}>
      <header><h3>{item.campaignTitle}</h3><strong>{paymentLabels[item.status]}</strong></header>
      <p>Tipo: Pago · {item.sandbox?'Proveedor sandbox (prueba)':'Proveedor no sandbox (no acredita un cobro por sí solo)'}</p>
      <dl><dt>Fecha UTC</dt><dd><time dateTime={item.createdAt}>{item.createdAt.replace('T',' ').replace('Z',' UTC')}</time></dd>
        <dt>Importe</dt><dd>{financeMoney(item.amount,item.currencyCode)}</dd><dt>Comisión</dt><dd>{financeMoney(item.feeAmount,item.currencyCode)}</dd>
        <dt>Neto del intento</dt><dd>{financeMoney(item.netAmount,item.currencyCode)}</dd><dt>Devoluciones completadas</dt><dd>{financeMoney(item.refundedAmount,item.currencyCode)}</dd>
        <dt>Estado del aporte</dt><dd>{({PENDING:'Pendiente',CONFIRMED:'Confirmado',CANCELLED:'Cancelado',EXPIRED:'Expirado',REFUNDED:'Reembolsado'} as Record<string,string>)[item.contributionStatus]}</dd>
        <dt>Referencia del aporte</dt><dd>{item.reference}</dd><dt>ID del pago</dt><dd>{item.id}</dd><dt>ID del aporte</dt><dd>{item.contributionId}</dd>
        <dt>ID de campaña</dt><dd>{item.campaignId}</dd><dt>ID de patrocinador</dt><dd>{item.sponsorId}</dd></dl>
    </article>)}</div>
  </>
}
export function FinancePage() {
  const data=useFinance()
  const [draft,setDraft]=useState<FinanceFilters>(data.filters)
  if (data.state==='anonymous') return <Navigate replace to="/iniciar-sesion?continuar=%2Fadministracion%2Ffinanzas" />
  function submit(event: FormEvent<HTMLFormElement>) {event.preventDefault();data.apply(draft)}
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={layout.content}>
    <header className={layout.heading}><div><h1>Operaciones financieras</h1><p>Consulta de pagos · solo lectura</p></div></header>
    <p><ButtonLink variant="tertiary" to="/mi-cuenta">Volver a mi cuenta</ButtonLink></p>
    <p>No confirma cobros, concilia ni autoriza desembolsos o devoluciones. Los estados de esas operaciones son independientes; aquí solo se lee el pago y la devolución ya completada vinculada a él.</p>
    {data.state==='forbidden' ? <Message tone="warning" title="Acceso restringido">Necesitas permiso vigente finance.read: Finanzas, ADMIN o Auditor. No puedes asignártelo aquí.</Message> : <>
      <form onSubmit={submit} className={styles.filters} aria-label="Filtros de operaciones">
        <FormField label="Campaña (UUID)" help="Opcional. Copia el identificador de la campaña, no su título." value={draft.campaignId} maxLength={36}
          pattern="[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}" onChange={event=>setDraft({...draft,campaignId:event.target.value})} />
        <FormField as="select" label="Estado del pago" value={draft.status} onChange={event=>setDraft({...draft,status:event.target.value})}>
          <option value="">Todos los estados</option>{Object.entries(paymentLabels).map(([code,label])=><option key={code} value={code}>{label}</option>)}</FormField>
        <FormField label="Desde (UTC)" type="date" min="0001-01-01" max={draft.to || '9999-12-31'} value={draft.from} onChange={event=>setDraft({...draft,from:event.target.value})} />
        <FormField label="Hasta (UTC, inclusive)" type="date" min={draft.from || '0001-01-01'} max="9999-12-31" value={draft.to} onChange={event=>setDraft({...draft,to:event.target.value})} />
        <div className={styles.actions}><Button type="submit" loading={data.state==='loading'} loadingLabel="Consultando…">Aplicar filtros</Button>
          <Button variant="secondary" onClick={()=>{const value={campaignId:'',status:'',from:'',to:''};setDraft(value);data.apply(value)}}>Limpiar filtros</Button>
          <Button variant="secondary" onClick={()=>void data.download()} loading={data.exporting} loadingLabel="Preparando CSV…" disabled={data.state!=='ready'}>Exportar filtro a CSV</Button></div>
      </form>
      <p>La exportación incluye todos los pagos del filtro aplicado, no solo esta página. Máximo 5000; acota las fechas si supera el límite. Los totales corresponden a la última consulta, no a una actualización en tiempo real.</p>
      {data.state==='loading' && <p role="status" aria-busy="true">Consultando pagos y totales…</p>}
      {(data.state==='error' || data.state==='invalid') && <><Message tone="error" title={data.state==='invalid'?'Revisa los filtros o reinicia la paginación':'No se pudieron consultar los pagos'}>Comprueba fechas, UUID, API y PostgreSQL. No se sustituyen errores por importes cero.</Message><Button onClick={()=>data.apply(draft)}>Reintentar desde la primera página</Button></>}
      {data.exportError && <Message tone="error" title="Exportación no completada">{data.exportError}</Message>}
      {data.state==='ready' && data.report && <>
        {data.report.items.length===0 ? <EmptyState title="Sin pagos en esta consulta" description="No hay registros para el filtro o la página elegida. Cambia los filtros o regresa a la página anterior." /> : <FinanceResults report={data.report} />}
        <nav aria-label="Páginas de operaciones" className={styles.actions}><Button variant="secondary" disabled={!data.hasPrevious} onClick={data.back}>Página anterior</Button><Button variant="secondary" disabled={!data.report.nextCursor} onClick={data.next}>Página siguiente</Button><Button variant="tertiary" onClick={()=>data.apply(data.filters)}>Actualizar desde el inicio</Button></nav>
      </>}
    </>}
  </section></div>
}
