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

export function AuditResults({page}:{page:Page}) {
  return <section aria-label={page.source==='AUDIT'?'Registros de auditoría':'Cambios de estado'} className={styles.records}>{page.items.map(item=><article className={styles.record} key={item.id}>
    <header><h2>{auditActions[item.action]}</h2><span>Registro {item.id}</span></header>
    <dl><dt>Origen</dt><dd>{page.source==='AUDIT'?'audit_log · Auditoría':'status_history · Estados'}</dd><dt>Fecha UTC</dt><dd><time dateTime={item.occurredAt}>{item.occurredAt.replace('T',' ').replace('Z',' UTC')}</time></dd>
      <dt>Actor (UUID)</dt><dd>{item.actorId ?? 'No registrado; no se atribuye a una persona'}</dd><dt>Rol registrado</dt><dd>{item.actorRole ?? 'No registrado en este origen'}</dd>
      <dt>Entidad</dt><dd>{item.entity}</dd><dt>Objeto (UUID)</dt><dd>{item.entityId ?? 'No registrado'}</dd>
      <dt>Resultado registrado</dt><dd>{item.result==='APPLIED'?'Acción aplicada':item.result==='RECORDED'?'Cambio registrado':'No especificado en el registro original'}</dd>
      {page.source==='STATUS' && <><dt>Estado anterior</dt><dd>{item.fromStatus ?? 'Sin estado anterior registrado'}</dd><dt>Estado siguiente</dt><dd>{item.toStatus ?? 'No disponible'}</dd></>}
    </dl>
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
    <p>Auditoría y cambios de estado son registros distintos. No se muestran documentos, motivos libres, contraseñas, tokens, payloads ni datos completos de tarjeta. Un actor antiguo ausente no se inventa ni se atribuye automáticamente al sistema.</p>
    {data.state==='forbidden'?<Message tone="warning" title="Acceso restringido">Se requiere audit.read vigente: ADMIN o AUDITOR según la matriz provisional.</Message>:<>
      <form onSubmit={submit} className={styles.filters} aria-label="Filtros de auditoría">
        <FormField as="select" label="Origen" value={draft.source} onChange={event=>setDraft({...draft,source:event.target.value as AuditFilters['source'],action:''})}>
          <option value="AUDIT">Auditoría (audit_log)</option><option value="STATUS">Cambios de estado (status_history)</option></FormField>
        <FormField as="select" label="Acción" value={draft.action} onChange={event=>setDraft({...draft,action:event.target.value})}>
          <option value="">Todas las acciones</option>{Object.entries(auditActions).filter(([code])=>draft.source==='AUDIT' || code==='STATUS_CHANGE').map(([code,label])=><option key={code} value={code}>{label}</option>)}</FormField>
        <FormField label="Actor (UUID, opcional)" value={draft.actorId} maxLength={36} pattern={idPattern} onChange={event=>setDraft({...draft,actorId:event.target.value})} />
        <FormField label="Objeto (UUID, opcional)" value={draft.entityId} maxLength={36} pattern={idPattern} onChange={event=>setDraft({...draft,entityId:event.target.value})} />
        <FormField as="select" label="Entidad" value={draft.entity} onChange={event=>setDraft({...draft,entity:event.target.value})}><option value="">Todas las entidades</option>
          {['campaign','contribution','payment','verification','refund','dispute','disbursement','reward_fulfillment','user_role'].map(code=><option key={code} value={code}>{code}</option>)}</FormField>
        <FormField label="Desde (UTC)" type="date" min="0001-01-01" max={draft.to || '9999-12-31'} value={draft.from} onChange={event=>setDraft({...draft,from:event.target.value})} />
        <FormField label="Hasta (UTC, inclusive)" type="date" min={draft.from || '0001-01-01'} max="9999-12-31" value={draft.to} onChange={event=>setDraft({...draft,to:event.target.value})} />
        <div className={styles.actions}><Button type="submit" loading={data.state==='loading'} loadingLabel="Consultando…">Aplicar filtros</Button><Button variant="secondary" onClick={()=>{const value={...draft,actorId:'',entityId:'',entity:'',action:'',from:'',to:''};setDraft(value);data.apply(value)}}>Limpiar filtros</Button></div>
      </form>
      <p>Orden por identificador descendente del origen seleccionado. Cambiar filtros reinicia las páginas. Sin exportación ni borrado de historial; retención definitiva pendiente.</p>
      {data.state==='loading' && <p role="status" aria-busy="true">Consultando historial…</p>}
      {(data.state==='error'||data.state==='invalid') && <><Message tone="error" title={data.state==='invalid'?'Revisa los filtros':'No se pudo consultar el historial'}>Comprueba fechas, identificadores, API y PostgreSQL. El fallo no se muestra como historial vacío.</Message><Button onClick={()=>data.apply(draft)}>Reintentar desde el inicio</Button></>}
      {data.state==='ready' && data.page && <>{data.page.items.length?<AuditResults page={data.page} />:<EmptyState title="Sin registros en esta consulta" description="No hay coincidencias para los filtros o la página. Cambia los filtros o vuelve a la página anterior." />}
        <nav aria-label="Páginas de auditoría" className={styles.actions}><Button variant="secondary" disabled={!data.hasPrevious} onClick={data.back}>Página anterior</Button><Button variant="secondary" disabled={!data.page.nextCursor} onClick={data.next}>Página siguiente</Button><Button variant="tertiary" onClick={()=>data.apply(data.filters)}>Actualizar desde el inicio</Button></nav></>}
    </>}
  </section></div>
}
