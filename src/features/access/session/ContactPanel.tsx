import {useEffect,useState} from 'react'
import {Button,ButtonLink} from '../../../shared/components/Button'
import {Message} from '../../../shared/components/Feedback'
import {contactStatus,noticeBody,contactNotices,requestEmail,mailPreference,readNotice,confirmEmail,contactError,deliveryLabel,type ContactStatus,type ContactNotice} from './contactClient'
import {myPermissions} from './accessPermissions'
import {AccessShell} from '../AccessComponents'

export function ContactPanel(){
 const [data,setData]=useState<{contact:ContactStatus;notices:ContactNotice[];readOnly:boolean}|null>(null)
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{const c=new AbortController();void Promise.all([contactStatus(c.signal),contactNotices(c.signal),myPermissions(c.signal)]).then(([contact,notices,permissions])=>{if(!c.signal.aborted){setData({contact,notices,readOnly:permissions.readOnly});setError('')}}).catch(e=>{if(!c.signal.aborted){setData(null);setError(contactError(e))}});return()=>c.abort()},[retry])
 async function act(operation:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setNotice('');try{await operation();setRetry(n=>n+1)}catch(e){setError(contactError(e))}finally{setBusy(false)}}
 return <section aria-labelledby="contact-title"><h2 id="contact-title">Correo y notificaciones</h2>
  {error&&<><Message tone="error" title="No se pudo completar">{error}</Message><Button variant="secondary" onClick={()=>setRetry(n=>n+1)}>Actualizar estado del correo</Button></>}
  {!data&&!error&&<p role="status">Cargando el estado del correo…</p>}
  {notice&&<p role="status">{notice}</p>}
  {data&&<>
   <p><strong>{data.contact.verifiedAt?'Correo verificado':'Correo pendiente de verificar'}</strong> · {data.contact.email}</p>
   <p>Solo comprueba que tienes acceso a esta dirección. La identidad, la organización y los permisos se revisan por separado. Teléfono: sin canal de verificación SMS habilitado.</p>
   {!data.contact.channelAvailable&&<Message tone="info" title="Correo real sin configurar">El buzón de ensayo local no verifica la posesión del correo. Configura SMTP según el README.</Message>}
   {!data.contact.verifiedAt&&<Button loading={busy} disabled={data.readOnly||!data.contact.channelAvailable} onClick={()=>void act(async()=>{const status=await requestEmail();setNotice(status==='already_verified'?'El correo ya estaba verificado.':'El servidor de correo aceptó el mensaje. Revisa la bandeja de entrada y spam. El enlace vence en 30 minutos; inicia sesión con esta misma cuenta y pulsa Confirmar correo. Puedes solicitar otro tras un minuto. Los enlaces anteriores quedan anulados.')})}>Solicitar enlace para verificar correo</Button>}
   <p><label><input type="checkbox" checked={data.contact.emailNotifications} disabled={busy||data.readOnly||!data.contact.verifiedAt} onChange={e=>{const enabled=e.target.checked;void act(async()=>{await mailPreference(enabled);setNotice(enabled?'Avisos de estado activados para los próximos cambios.':'Avisos de estado por correo desactivados.')})}}/> Recibir por correo avisos de mis cambios de estado</label></p>
   <p>Estos avisos son opcionales. La recuperación y la verificación son mensajes de seguridad solicitados por ti. Las condiciones provisionales y su aceptación se consultan en esta cuenta; estos avisos no son publicidad.</p>
   <h3>Últimos avisos</h3><Button variant="secondary" disabled={busy} onClick={()=>setRetry(n=>n+1)}>Actualizar notificaciones</Button>
   {data.notices.length===0?<p>Todavía no tienes avisos de cambios de estado.</p>:<ul>{data.notices.map(n=><li key={n.id}><h4>{n.title}</h4><p>{noticeBody(n.body)}</p><p>{new Date(n.createdAt).toLocaleString('es-BO')} · {deliveryLabel[n.delivery]}{n.readAt?' · Leído':''}</p>{!n.readAt&&<Button variant="secondary" disabled={busy||data.readOnly} onClick={()=>void act(async()=>{await readNotice(n.id)})}>Marcar aviso como leído</Button>}</li>)}</ul>}
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
