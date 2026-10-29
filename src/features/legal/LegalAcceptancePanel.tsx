import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {Button} from '../../shared/components/Button'
import {Message} from '../../shared/components/Feedback'
import {useAccessPermissions} from '../access/session/accessPermissions'
import {acceptLegal,myLegal,type LegalStatus} from './legalClient'
import styles from './legal.module.css'
export function LegalAcceptancePanel(){
 const [value,setValue]=useState<LegalStatus|null>(null),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),lock=useRef(false)
 const {access,error:permissionsError,refresh}=useAccessPermissions()
 useEffect(()=>{const c=new AbortController();void myLegal(c.signal).then(v=>{if(!c.signal.aborted)setValue(v)}).catch(()=>{if(!c.signal.aborted)setError('No se pudo consultar tu aceptación. Reintenta; no se presume que hayas aceptado.')});return()=>c.abort()},[retry])
 return <section className={styles.panel} aria-label="Condiciones y privacidad"><h2>Condiciones y privacidad del ensayo</h2><p><Link to={'/condiciones'+(value?'?version='+encodeURIComponent(value.version):'')}>Leer términos, aviso de privacidad y reglas KYC/KYB</Link></p>
  {permissionsError&&<Message tone="error" title="No se pudieron consultar tus permisos">No se habilitará una escritura sin comprobarlos.<Button onClick={refresh}>Reintentar permisos</Button></Message>}
  {error&&<Message tone="error" title="Aceptación sin confirmar">{error}<Button onClick={()=>{setValue(null);setError('');setAccepted(false);setRetry(n=>n+1)}}>Actualizar estado</Button></Message>}
  {!value&&!error&&<p role="status">Consultando tu aceptación…</p>}
  {value?.accepted?<><p role="status">Aceptación registrada · {value.version}</p><details><summary>Consultar mi recibo</summary><ul>{value.history.map(r=><li key={r.version}>{r.version} · {new Date(r.acceptedAt).toLocaleString('es-BO')}<br/><span className={styles.hash}>SHA-256: {r.hash}</span></li>)}</ul></details><p>Esta aceptación no verifica identidad ni concede permisos.</p></>:value&&<>
   <p>Tu cuenta anterior no recibió una aceptación automática. Debes confirmarla para enviar nuevos expedientes KYC/KYB.</p>
   <label className={styles.check}><input type="checkbox" checked={accepted} disabled={busy||!access||access.readOnly} onChange={e=>setAccepted(e.target.checked)}/><span>He leído y acepto los términos y el tratamiento básico descrito en el aviso de privacidad de esta versión. Declaro tener 18 años o más y participar voluntariamente en el ensayo. *</span></label>
   {access?.readOnly?<p>Tu perfil AUDITOR conserva acceso de lectura. No se registrará una aceptación por ti.</p>:<Button disabled={!accepted||!access||busy} loading={busy} loadingLabel="Guardando aceptación…" onClick={async()=>{if(lock.current||!accepted)return;lock.current=true;setBusy(true);setError('');try{setValue(await acceptLegal(value.version,accepted));setAccepted(false)}catch{setError('El servidor no confirmó tu aceptación. Consulta el estado antes de repetir.')}finally{lock.current=false;setBusy(false)}}}>Registrar mi aceptación</Button>}
  </>}
 </section>
}
