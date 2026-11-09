import {useEffect,useState} from 'react'
import {Button,ButtonLink} from '../../../shared/components/Button'
import {Message} from '../../../shared/components/Feedback'
import {contactStatus,noticeBody,contactNotices,requestEmail,mailPreference,readNotice,confirmEmail,contactError,deliveryLabel,type ContactStatus,type ContactNotice} from './contactClient'
import {myPermissions} from './accessPermissions'
import {AccessShell} from '../AccessComponents'
import styles from './contact.module.css'

export function ContactPanel(){
 const [data,setData]=useState<{contact:ContactStatus;notices:ContactNotice[];readOnly:boolean}|null>(null)
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{const c=new AbortController();void Promise.all([contactStatus(c.signal),contactNotices(c.signal),myPermissions(c.signal)]).then(([contact,notices,permissions])=>{if(!c.signal.aborted){setData({contact,notices,readOnly:permissions.readOnly});setError('')}}).catch(e=>{if(!c.signal.aborted){setData(null);setError(contactError(e))}});return()=>c.abort()},[retry])
 async function act(operation:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setNotice('');try{await operation();setRetry(n=>n+1)}catch(e){setError(contactError(e))}finally{setBusy(false)}}
 return <section aria-labelledby="contact-title"><header className={styles.header}><p className={styles.eyebrow}>Comunicación</p><h2 id="contact-title">Correo y notificaciones</h2><p>Gestiona tu dirección de contacto y elige qué avisos quieres recibir.</p></header>
  {error&&<><Message tone="error" title="No se pudo completar">{error}</Message><Button variant="secondary" onClick={()=>setRetry(n=>n+1)}>Actualizar estado del correo</Button></>}
  {!data&&!error&&<p role="status">Cargando el estado del correo…</p>}
  {notice&&<p role="status">{notice}</p>}
  {data&&<>
   <div className={styles.emailCard}><div><span className={styles.fieldLabel}>Dirección de correo</span><strong className={styles.email}>{data.contact.email}</strong><span className={`${styles.badge} ${data.contact.verifiedAt?styles.verified:styles.pending}`}>{data.contact.verifiedAt?'Correo verificado':'Pendiente de verificación'}</span></div><p className={styles.help}>La verificación confirma que tienes acceso a esta dirección. La identidad y los permisos se revisan por separado.</p>
   {!data.contact.channelAvailable&&<Message tone="info" title="Correo real sin configurar">El buzón de ensayo local no verifica la posesión del correo. Configura SMTP según el README.</Message>}
   {!data.contact.verifiedAt&&<Button loading={busy} disabled={data.readOnly||!data.contact.channelAvailable} onClick={()=>void act(async()=>{const status=await requestEmail();setNotice(status==='already_verified'?'El correo ya estaba verificado.':'El servidor de correo aceptó el mensaje. Revisa la bandeja de entrada y spam. El enlace vence en 30 minutos; inicia sesión con esta misma cuenta y pulsa Confirmar correo. Puedes solicitar otro tras un minuto. Los enlaces anteriores quedan anulados.')})}>Verificar mi correo</Button>}</div>
   <div className={styles.preferences}><label className={styles.preferenceLabel}><input type="checkbox" checked={data.contact.emailNotifications} disabled={busy||data.readOnly||!data.contact.verifiedAt} onChange={e=>{const enabled=e.target.checked;void act(async()=>{await mailPreference(enabled);setNotice(enabled?'Avisos de estado activados para los próximos cambios.':'Avisos de estado por correo desactivados.')})}}/><span><strong>Avisos de estado por correo</strong><span>Recibir notificaciones sobre los cambios de estado de mis gestiones.</span></span></label>{!data.contact.verifiedAt&&<p className={styles.preferenceHelp}>Verifica tu correo para activar esta preferencia.</p>}<p className={styles.help}>Son opcionales y no son publicidad. Los mensajes de recuperación y verificación se envían cuando los solicitas.</p></div>
   <div className={styles.inbox}><header className={styles.inboxHeader}><div><h3>Últimos avisos</h3><p>El seguimiento de tus gestiones, en un solo lugar.</p></div><Button variant="secondary" disabled={busy} onClick={()=>setRetry(n=>n+1)}>Actualizar avisos</Button></header>
   {data.notices.length===0?<div className={styles.empty}><strong>No tienes avisos todavía</strong><p>Cuando recibas novedades sobre tus gestiones, aparecerán aquí.</p></div>:<ul className={styles.notices}>{data.notices.map(n=><li key={n.id}><div className={styles.noticeHeading}><h4>{n.title}</h4><span className={styles.readStatus}>{n.readAt?'Leído':'Sin leer'}</span></div><p>{noticeBody(n.body)}</p><p className={styles.help}><time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString('es-BO',{timeZone:'America/La_Paz'})}</time> · {deliveryLabel[n.delivery]}</p>{!n.readAt&&<Button variant="secondary" disabled={busy||data.readOnly} onClick={()=>void act(async()=>{await readNotice(n.id)})}>Marcar aviso como leído</Button>}</li>)}</ul>}</div>
   <p className={styles.phoneNote}>La verificación del teléfono por SMS todavía no está habilitada.</p>
  </>}
 </section>
}

export function ConfirmEmailPage(){
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')??'')
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('')
 useEffect(()=>{window.history.replaceState(window.history.state,'',window.location.pathname)},[])
 return <AccessShell title="Confirmar correo" subtitle="Comprueba que esta dirección te pertenece." centered notice={<><strong>Verificación conectada.</strong> Se confirma únicamente la posesión de tu correo mediante un enlace temporal. No concede roles ni sustituye la revisión de identidad.</>}>
  {done?<><Message tone="success" title="Correo verificado">Se confirmó la posesión de tu correo. Tu rol y la verificación de identidad permanecen bajo sus reglas propias.</Message><ButtonLink to="/mi-cuenta">Volver a Mi cuenta</ButtonLink></>:<>
   <p>Inicia sesión con la cuenta que solicitó este enlace. La confirmación requiere pulsar el botón; abrir el correo no verifica automáticamente la cuenta.</p>
   {error&&<Message tone="error" title="No se pudo verificar">{error}</Message>}
   {!/^[a-f0-9]{64}$/.test(token)?<Message tone="error" title="Falta un enlace válido">Solicita un nuevo enlace desde Mi cuenta y ábrelo completo.</Message>:<Button loading={busy} onClick={async()=>{if(busy)return;setBusy(true);setError('');try{await confirmEmail(token);setDone(true)}catch(e){setError(contactError(e))}finally{setBusy(false)}}}>Confirmar correo</Button>}
   <p><ButtonLink variant="secondary" to="/iniciar-sesion?continuar=%2Fmi-cuenta" target="_blank" rel="noopener noreferrer">Iniciar sesión en otra pestaña</ButtonLink></p><ButtonLink variant="secondary" to="/mi-cuenta">Ir a Mi cuenta</ButtonLink>
  </>}
 </AccessShell>
}
