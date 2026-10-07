import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { Message } from '../../shared/components/Feedback'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import styles from '../campaigns/projects.module.css'
import { useCreatorAdministration } from './useCreatorAdministration'

export function CreatorAdministrationPage() {
  const data = useCreatorAdministration()
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  if (data.anonymous) return <Navigate replace to="/iniciar-sesion?continuar=%2Fadministracion%2Fusuarios" />
  const user = data.user
  return <div className={styles.adminLayout}><AdministrativeNavigation /><section className={styles.content}>
    <header className={styles.heading}><div><h1>Habilitar creadores</h1><p>Asignación manual provisional por un administrador.</p></div></header>
    <Message tone="warning" title="Mecanismo provisional · KYC pendiente">Esta acción permite enviar campañas a revisión. No verifica correo, identidad o empresa, no publica campañas y no concede ADMIN. Se revisará cuando los líderes definan las reglas de KYC y acceso.</Message>
    {data.access === 'checking' && <p role="status">Comprobando permisos administrativos…</p>}
    {data.access === 'forbidden' && <Message tone="warning" title="Acceso restringido">Solo ADMIN vigente puede habilitar creadores. Auditor se mantiene en lectura.</Message>}
    {data.access === 'error' && <><Message tone="error" title="No se pudieron comprobar los permisos">Comprueba la API e inténtalo de nuevo.</Message><Button onClick={data.retryAccess}>Reintentar</Button></>}
    {data.access === 'ready' && <form onSubmit={event => { event.preventDefault(); setConfirmed(false); setReason(''); void data.find(email) }}>
      <label className={styles.search}>Correo de la cuenta registrada<input type="email" required maxLength={254} autoComplete="off" value={email} disabled={data.busy} onChange={event => setEmail(event.target.value)} /></label>
      <Button type="submit" loading={data.busy} loadingLabel="Procesando…">Buscar cuenta</Button>
    </form>}
    {data.error && <Message tone="error" title="Operación no completada">{data.error}</Message>}
    {data.notice && <Message tone="success" title="Permiso comprobado">{data.notice}</Message>}
    {user && <section className={styles.panel} aria-label="Cuenta encontrada"><h2>{user.name || 'Cuenta registrada'}</h2>
      <p>{user.email}</p><p>Estado: {user.status === 'PENDING_VERIFICATION' ? 'Pendiente de verificación' : user.status}{user.locked ? ' · Acceso bloqueado' : ''}</p>
      <p>Roles vigentes: {user.roles.join(', ') || 'Sin roles'}</p>
      {user.roles.includes('CREATOR') ? <p role="status">Ya tiene CREATOR. Puede volver a su cuenta y enviar el borrador completo a revisión.</p>
        : !user.canEnableCreator ? <p role="status">No admite la habilitación. No se activan, desbloquean ni verifican cuentas desde aquí.</p>
        : <form onSubmit={event => { event.preventDefault(); if (confirmed) void data.grant(reason) }}>
          <fieldset className={styles.reviewForm} disabled={data.busy}><legend>Confirmación de habilitación</legend>
            <label>Motivo obligatorio<textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Indica por qué habilitas esta cuenta para el ensayo." /></label>
            <label><span><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Confirmo habilitar CREATOR para {user.email}, sin aprobar KYC ni verificar identidad.</span></label>
            <Button type="submit" disabled={!confirmed || !reason.trim()} loading={data.busy} loadingLabel="Habilitando…">Habilitar como creador · provisional</Button>
          </fieldset>
        </form>}
    </section>}
    <p><ButtonLink variant="tertiary" to="/administracion/campanas">Volver a revisión de campañas</ButtonLink></p>
  </section></div>
}
