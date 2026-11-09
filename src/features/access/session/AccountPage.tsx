import {LegalAcceptancePanel} from '../../legal/LegalAcceptancePanel'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { Message } from '../../../shared/components/Feedback'
import { currentUser, logout, SessionError, type CurrentUser } from './sessionClient'
import { ProfileForm } from './ProfileForm'
import {ContactPanel} from './ContactPanel'
import { AccountRoles } from '../../organizations/AccountRoles'
import { AccountAdministrationAccess } from './AccountAdministrationAccess'
import styles from './account.module.css'

const sections=[['resumen','Resumen'],['actividad','Tu actividad'],['datos','Datos personales'],['correo','Correo y notificaciones'],['privacidad','Condiciones y privacidad'],['iniciativas','Iniciativas y permisos'],['sesion','Sesión']]
const shortcuts=[
  {to:'/panel-patrocinador',title:'Mi panel de apoyos',description:'Consulta tus aportes y su historial.'},
  {to:'/mi-verificacion',title:'Mi verificación',description:'Gestiona tus documentos y el estado de revisión.'},
  {to:'/mis-guardados',title:'Campañas guardadas',description:'Retoma las iniciativas que te interesan y sus novedades.'},
  {to:'/mis-invitaciones',title:'Invitaciones',description:'Revisa las solicitudes para colaborar en organizaciones.'},
  {to:'/mis-incidencias',title:'Mis incidencias',description:'Consulta tus conversaciones con el equipo de soporte.'}
]

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
  return <div className={styles.page}><header className={styles.pageHeader}><p className={styles.eyebrow}>Tu espacio en Brotar</p><h1>Mi cuenta</h1><p>Gestiona tus datos, comunicaciones y accesos desde un solo lugar.</p></header>
    {status === 'loading' && <p role="status">Comprobando sesión…</p>}
    {status === 'error' && <><Message tone="error" title="No se pudo comprobar la sesión">Comprueba que la API y la base estén disponibles. No se mostrará información privada sin validación.</Message><Button onClick={() => { setStatus('loading'); setRetry(value => value + 1) }}>Reintentar</Button></>}
    {status === 'ready' && user && <div className={styles.layout}>
      <aside className={styles.sidebar}><nav aria-label="Secciones de mi cuenta"><p className={styles.navLabel}>En esta página</p>{sections.map(([id,label])=><a key={id} href={`#cuenta-${id}`}>{label}</a>)}</nav><p className={styles.sidebarHelp}>Tus datos personales son privados. Los permisos se comprueban por separado para cada acción.</p></aside>
      <div className={styles.content}>
      <section id="cuenta-resumen" className={`${styles.panel} ${styles.overview}`} aria-labelledby="account-welcome"><div className={styles.overviewTop}><span className={styles.avatar} aria-hidden="true">{[user.firstName,user.lastName].map(name=>Array.from(name.trim())[0]??'').join('').toLocaleUpperCase('es')}</span><div className={styles.identity}><p className={styles.eyebrow}>Tu perfil</p><h2 id="account-welcome">Hola, {user.firstName}</h2><p>{user.firstName} {user.lastName}</p><p className={styles.email}>{user.email}</p></div><AccountAdministrationAccess key={user.id}/></div>
        <div className={styles.accountState}><span className={styles.statusBadge}>{user.status==='PENDING_VERIFICATION'?'Acceso básico disponible':'Cuenta activa'}</span>{user.status==='PENDING_VERIFICATION'&&<span>La verificación de identidad y los permisos tienen su propio proceso.</span>}</div>
        <details className={styles.identifier}><summary>Identificador para invitaciones a organizaciones</summary><code>{user.id}</code><p>Compártelo con quien administre la organización para recibir una invitación. Deberás aceptarla antes de obtener acceso; compartirlo no concede permisos.</p></details>
      </section>
      <section id="cuenta-actividad" className={styles.panel} aria-labelledby="account-activity"><header className={styles.sectionHeader}><p className={styles.eyebrow}>Accesos rápidos</p><h2 id="account-activity">Tu actividad</h2><p>Vuelve a tus aportes, iniciativas y gestiones.</p></header><div className={styles.shortcutGrid}>{shortcuts.map(link=><Link className={styles.shortcut} to={link.to} key={link.to}><span><strong>{link.title}</strong><span>{link.description}</span></span><span className={styles.arrow} aria-hidden="true">→</span></Link>)}</div></section>
      <section id="cuenta-datos" className={styles.panel} aria-labelledby="account-profile"><header className={styles.sectionHeader}><p className={styles.eyebrow}>Información personal</p><h2 id="account-profile">Datos personales</h2><p>Actualiza los datos con los que te identificas en Brotar.</p></header><ProfileForm onExpired={() => { setUser(null); setStatus('anonymous') }} onSaved={profile => setUser(current => current ? { ...current, firstName: profile.firstName, lastName: profile.lastName } : null)} /></section>
      <div id="cuenta-correo" className={styles.panel}><ContactPanel /></div>
      <div id="cuenta-privacidad" className={styles.legalSection}><LegalAcceptancePanel key={user.id}/></div>
      <section id="cuenta-iniciativas" className={styles.panel} aria-labelledby="account-initiatives"><header className={styles.sectionHeader}><p className={styles.eyebrow}>Herramientas y responsabilidades</p><h2 id="account-initiatives">Iniciativas y permisos</h2><p>Consulta tus roles y los accesos para crear proyectos o colaborar con organizaciones.</p></header><details className={styles.advanced}><summary>Ver mis permisos y herramientas</summary><p>Preparar un borrador o registrar una organización no concede permisos de publicación ni acredita su verificación.</p><AccountRoles /><div className={styles.actions}><ButtonLink variant="secondary" to="/panel-creador">Panel del creador</ButtonLink><ButtonLink variant="secondary" to="/crear-campana">Ver mis borradores</ButtonLink></div></details></section>
      <section id="cuenta-sesion" className={`${styles.panel} ${styles.session}`} aria-labelledby="account-session"><div><h2 id="account-session">Sesión</h2><p>Cierra tu sesión cuando termines, especialmente si compartes este equipo.</p></div>
      {logoutError && <Message tone="error" title="No pudimos confirmar el cierre">Reintenta. No se considera cerrada la sesión hasta que el servidor la revoque.</Message>}
      <div className={styles.actions}><ButtonLink variant="tertiary" to="/explorar">Explorar proyectos</ButtonLink><Button variant="secondary" loading={closing} loadingLabel="Cerrando sesión…" onClick={async () => {
        if (closing) return
        setClosing(true); setLogoutError(false)
        try { await logout(); setUser(null); navigate('/iniciar-sesion', { replace: true }) }
        catch { setLogoutError(true) }
        finally { setClosing(false) }
      }}>Cerrar sesión</Button></div>
      </section></div></div>}
  </div>
}
