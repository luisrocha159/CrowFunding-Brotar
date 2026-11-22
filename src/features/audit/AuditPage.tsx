import { projectStatusNames } from '../campaigns/projectsClient'
import { stateLabels } from '../contributions/labels'
import { verificationStatus } from '../verifications/verificationsClient'
import { refundStatus } from '../refunds/refundClient'
import { disputeStatus } from '../disputes/disputeClient'
import { disbursementLabels } from '../disbursements/disbursementClient'
import { accountRoleLabel, accountStatusLabel } from '../../shared/utils/accountLabels'
import {AccountIdentity} from '../../shared/components/AccountIdentity'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { EmptyState, Message } from '../../shared/components/Feedback'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import { auditActions, type AuditFilters, type AuditPage as Page } from './auditClient'
import { useAudit } from './useAudit'
import layout from '../campaigns/projects.module.css'
import styles from '../finance/finance.module.css'

const entities: Record<string, string> = {
  campaign: 'Campaña',
  contribution: 'Aporte',
  payment: 'Pago',
  verification: 'Verificación',
  refund: 'Devolución',
  dispute: 'Disputa',
  disbursement: 'Desembolso',
  reward_fulfillment: 'Entrega de recompensa',
  user_role: 'Rol de cuenta',
  accountability_report: 'Rendición de cuentas',
  app_user: 'Cuenta de usuario',
  campaign_bookmark: 'Campaña guardada',
  campaign_progress: 'Avance de campaña',
  campaign_update: 'Novedad de campaña',
  demo_event: 'Evento de pago simulado',
  file_asset: 'Archivo',
  legal_acceptance: 'Aceptación de condiciones',
  organization: 'Organización',
  organization_member: 'Miembro de organización',
  payout_account: 'Cuenta de destino',
  reconciliation_item: 'Detalle de conciliación',
  reconciliation: 'Conciliación',
  support_case: 'Incidencia de soporte',
  support_simulation: 'Selección de aporte',
  user_profile: 'Perfil de usuario'
}

const filterEntities = ['campaign', 'contribution', 'payment', 'verification', 'refund', 'dispute', 'disbursement', 'reward_fulfillment', 'user_role']

const historyStates: Record<string, (status: string) => string | undefined> = {
  campaign: status => projectStatusNames[status],
  contribution: status => stateLabels[status],
  payment: status => stateLabels[status],
  refund: status => refundStatus[status],
  verification: verificationStatus,
  dispute: status => disputeStatus[status],
  disbursement: status => disbursementLabels[status],
  reward_fulfillment: status => rewardStates[status],
  user: accountStatusLabel,
  app_user: accountStatusLabel,
  organization: accountStatusLabel
}

const rewardStates: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En preparación',
  FULFILLED: 'Cumplida',
  CANCELLED: 'Cancelada'
}

function historyState(entity: string, status: string | null, empty: string) {
  if (!status) return empty
  return historyStates[entity]?.(status) ?? stateLabels[status] ?? 'Otro estado registrado'
}

export function AuditResults({page}:{page:Page}) {
  return <section aria-label={page.source==='AUDIT'?'Registros de auditoría':'Cambios de estado'} className={styles.records}>{page.items.map(item=><article className={styles.record} key={item.id}>
    <header><h2>{auditActions[item.action]}</h2><span>Registro {item.id}</span></header>
    <dl><dt>Origen</dt><dd>{page.source==='AUDIT'?'Auditoría':'Historial de estados'}</dd><dt>Fecha UTC</dt><dd><time dateTime={item.occurredAt}>{item.occurredAt.replace('T',' ').replace('Z',' UTC')}</time></dd>
      <dt>Cuenta responsable</dt><dd><AccountIdentity contact={item.actorContact} empty={item.actorId?'Cuenta no disponible':'No registrado; no se atribuye a una persona'}/></dd><dt>Referencia técnica de cuenta</dt><dd>{item.actorId??'Sin identificador'}</dd><dt>Rol registrado</dt><dd>{item.actorRole ? accountRoleLabel(item.actorRole, item.actorRole) : 'No registrado en este origen'}</dd>
      <dt>Entidad</dt><dd>{entities[item.entity] ?? 'Otra entidad'}</dd><dt>Objeto (UUID)</dt><dd>{item.entityId ?? 'No registrado'}</dd>
      <dt>Resultado registrado</dt><dd>{item.result==='APPLIED'?'Acción aplicada':item.result==='RECORDED'?'Cambio registrado':'No especificado en el registro original'}</dd>
      {page.source==='STATUS' && <><dt>Estado anterior</dt><dd>{historyState(item.entity, item.fromStatus, 'Sin estado anterior registrado')}</dd><dt>Estado siguiente</dt><dd>{historyState(item.entity, item.toStatus, 'No disponible')}</dd></>}
    </dl>
    <details><summary>Referencias técnicas del registro</summary>
      <p>Origen: <code>{page.source === 'AUDIT' ? 'audit_log' : 'status_history'}</code> · Entidad: <code>{item.entity}</code></p>
      {page.source === 'STATUS' && <p>Estados registrados: <code>{item.fromStatus ?? 'Sin estado anterior'}</code> → <code>{item.toStatus ?? 'Sin estado siguiente'}</code></p>}
    </details>
  </article>)}</section>
}
export function AuditPage() {
  const data=useAudit(),[draft,setDraft]=useState<AuditFilters>(data.filters)
  if (data.state==='anonymous') return <Navigate replace to="/iniciar-sesion?continuar=%2Fadministracion%2Fauditoria" />
  const idPattern='[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}'
  function submit(event:FormEvent<HTMLFormElement>) {event.preventDefault();data.apply(draft)}
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={layout.content}>
    <header className={layout.heading}><div><h1>Auditoría del sistema</h1><p>Consulta restringida · solo lectura</p></div></header>
    <ButtonLink to="/mi-cuenta" variant="tertiary">Volver a mi cuenta</ButtonLink>
    <p>Auditoría y cambios de estado son registros distintos. No se muestran documentos, motivos libres, contraseñas, credenciales de acceso, contenido de las solicitudes ni datos completos de tarjeta. Un actor antiguo ausente no se inventa ni se atribuye automáticamente al sistema.</p>
    {data.state==='forbidden'?<Message tone="warning" title="Acceso restringido">Este historial está disponible para Administración y Auditoría.</Message>:<>
      <form onSubmit={submit} className={styles.filters} aria-label="Filtros de auditoría">
        <FormField as="select" label="Origen" value={draft.source} onChange={event=>setDraft({...draft,source:event.target.value as AuditFilters['source'],action:''})}>
          <option value="AUDIT">Auditoría</option><option value="STATUS">Historial de estados</option></FormField>
        <FormField as="select" label="Acción" value={draft.action} onChange={event=>setDraft({...draft,action:event.target.value})}>
          <option value="">Todas las acciones</option>{Object.entries(auditActions).filter(([code])=>draft.source==='AUDIT' || code==='STATUS_CHANGE').map(([code,label])=><option key={code} value={code}>{label}</option>)}</FormField>
        <FormField label="Actor (UUID, opcional)" value={draft.actorId} maxLength={36} pattern={idPattern} onChange={event=>setDraft({...draft,actorId:event.target.value})} />
        <FormField label="Objeto (UUID, opcional)" value={draft.entityId} maxLength={36} pattern={idPattern} onChange={event=>setDraft({...draft,entityId:event.target.value})} />
        <FormField as="select" label="Entidad" value={draft.entity} onChange={event=>setDraft({...draft,entity:event.target.value})}><option value="">Todas las entidades</option>
          {filterEntities.map(code=><option key={code} value={code}>{entities[code]}</option>)}</FormField>
        <FormField label="Desde (UTC)" type="date" min="0001-01-01" max={draft.to || '9999-12-31'} value={draft.from} onChange={event=>setDraft({...draft,from:event.target.value})} />
        <FormField label="Hasta (UTC, inclusive)" type="date" min={draft.from || '0001-01-01'} max="9999-12-31" value={draft.to} onChange={event=>setDraft({...draft,to:event.target.value})} />
        <div className={styles.actions}><Button type="submit" loading={data.state==='loading'} loadingLabel="Consultando…">Aplicar filtros</Button><Button variant="secondary" onClick={()=>{const value={...draft,actorId:'',entityId:'',entity:'',action:'',from:'',to:''};setDraft(value);data.apply(value)}}>Limpiar filtros</Button></div>
      </form>
      <p>Orden por identificador descendente del origen seleccionado. Cambiar filtros reinicia las páginas. Sin exportación ni borrado de historial; retención definitiva pendiente.</p>
      {data.state==='loading' && <p role="status" aria-busy="true">Consultando historial…</p>}
      {(data.state==='error'||data.state==='invalid') && <><Message tone="error" title={data.state==='invalid'?'Revisa los filtros':'No se pudo consultar el historial'}>Comprueba las fechas y los identificadores de los filtros y vuelve a intentarlo.</Message><Button onClick={()=>data.apply(draft)}>Reintentar desde el inicio</Button></>}
      {data.state==='ready' && data.page && <>{data.page.items.length?<AuditResults page={data.page} />:<EmptyState title="Sin registros en esta consulta" description="No hay coincidencias para los filtros o la página. Cambia los filtros o vuelve a la página anterior." />}
        <nav aria-label="Páginas de auditoría" className={styles.actions}><Button variant="secondary" disabled={!data.hasPrevious} onClick={data.back}>Página anterior</Button><Button variant="secondary" disabled={!data.page.nextCursor} onClick={data.next}>Página siguiente</Button><Button variant="tertiary" onClick={()=>data.apply(data.filters)}>Actualizar desde el inicio</Button></nav></>}
    </>}
  </section></div>
}
