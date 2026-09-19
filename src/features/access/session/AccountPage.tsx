import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { Message } from '../../../shared/components/Feedback'
import { AccessShell } from '../AccessComponents'
import { currentUser, logout, SessionError, type CurrentUser } from './sessionClient'
import { ProfileForm } from './ProfileForm'
import { AccountRoles } from '../../organizations/AccountRoles'
import styles from '../access.module.css'

export function AccountPage() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'anonymous' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [closing, setClosing] = useState(false)
  const [logoutError, setLogoutError] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const controller = new AbortController()
    let loading = false
    const refresh = () => {
      if (loading) return
      loading = true
      void currentUser(controller.signal).then(result => {
        if (!controller.signal.aborted) { setUser(result); setStatus('ready') }
      }).catch(error => {
        if (!controller.signal.aborted) { setUser(null); setStatus(error instanceof SessionError && error.status === 401 ? 'anonymous' : 'error') }
      }).finally(() => { loading = false })
    }
    refresh()
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 60000)
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [retry])
  if (status === 'anonymous') return <Navigate to="/iniciar-sesion?continuar=%2Fmi-cuenta" replace />
  return <AccessShell title="Mi cuenta" subtitle="Tu sesión y tus datos básicos en Brotar." centered notice={<><strong>Cuenta conectada.</strong> Consulta tu perfil y tus roles vigentes. El registro de organizaciones crea un borrador; no verifica ni activa la empresa.</>}>
    {status === 'loading' && <p role="status">Comprobando sesión…</p>}
    {status === 'error' && <><Message tone="error" title="No se pudo comprobar la sesión">Comprueba que la API y la base estén disponibles. No se mostrará información privada sin validación.</Message><Button onClick={() => { setStatus('loading'); setRetry(value => value + 1) }}>Reintentar</Button></>}
    {status === 'ready' && user && <section aria-label="Información de mi cuenta">
      <h2>Hola, {user.firstName}</h2><dl><dt>Nombre</dt><dd>{user.firstName} {user.lastName}</dd><dt>Correo</dt><dd>{user.email}</dd><dt>Estado</dt><dd>{user.status === 'PENDING_VERIFICATION' ? 'Pendiente de verificación · acceso básico disponible' : 'Cuenta activa'}</dd></dl>
      {user.status === 'PENDING_VERIFICATION' && <p>Puedes gestionar tu perfil y organizaciones en borrador. Este acceso no acredita la verificación de tu correo o identidad ni autoriza la publicación de campañas o pagos.</p>}
      <ProfileForm onExpired={() => { setUser(null); setStatus('anonymous') }} onSaved={profile => setUser(current => current ? { ...current, firstName: profile.firstName, lastName: profile.lastName } : null)} />
      <AccountRoles />
      {logoutError && <Message tone="error" title="No pudimos confirmar el cierre">Reintenta. No se considera cerrada la sesión hasta que el servidor la revoque.</Message>}
      <div className={styles.actions}><ButtonLink variant="secondary" to="/mi-campana/portada">Portada del borrador</ButtonLink><Button loading={closing} loadingLabel="Cerrando sesión…" onClick={async () => {
        if (closing) return
        setClosing(true); setLogoutError(false)
        try { await logout(); setUser(null); navigate('/iniciar-sesion', { replace: true }) }
        catch { setLogoutError(true) }
        finally { setClosing(false) }
      }}>Cerrar sesión</Button></div>
    </section>}
  </AccessShell>
}
