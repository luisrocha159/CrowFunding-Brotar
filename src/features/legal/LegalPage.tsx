import {useEffect,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {Button} from '../../shared/components/Button'
import {Message} from '../../shared/components/Feedback'
import {readLegal,type LegalPublication} from './legalClient'
import styles from './legal.module.css'
export function LegalPage(){
 const [params]=useSearchParams(),version=params.get('version')??undefined
 return <LegalPageContent key={version??'current'} version={version}/>
}
function LegalPageContent({version}:{version?:string}){
 const [value,setValue]=useState<LegalPublication|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{const c=new AbortController();void readLegal(version,c.signal).then(v=>{if(!c.signal.aborted)setValue(v)}).catch(()=>{if(!c.signal.aborted)setError(true)});return()=>c.abort()},[version,retry])
 return <section className={styles.page} aria-labelledby="legal-page-title"><p className={styles.eyebrow}>Brotar · Proyecto de Sistemas II</p><h1 id="legal-page-title">Condiciones del MVP académico</h1><p>Acuerdo provisional del equipo para pruebas controladas. No habilita dinero real ni acredita revisión jurídica externa.</p>
  {error?<Message tone="error" title="No pudimos cargar esta versión">Comprueba la API y la instalación. No se mostrará un texto inventado.<Button onClick={()=>{setValue(null);setError(false);setRetry(n=>n+1)}}>Reintentar</Button></Message>:!value?<p role="status">Consultando los documentos publicados…</p>:<>
   <dl><dt>Versión</dt><dd>{value.version}</dd><dt>Fecha</dt><dd>{new Date(value.publishedAt).toLocaleDateString('es-BO',{timeZone:'America/La_Paz'})}</dd><dt>Huella SHA-256</dt><dd className={styles.hash}>{value.hash}</dd></dl>
   <nav aria-label="Documentos del acuerdo"><ul>{value.documents.map(d=><li key={d.code}><a href={'#'+d.code}>{d.title}</a></li>)}</ul></nav>
   {value.documents.map(d=><article id={d.code} key={d.code}><h2>{d.title}</h2>{d.sections.map(s=><section key={s.title}><h3>{s.title}</h3><p>{s.text}</p></section>)}</article>)}
  </>}
  <p><Link to="/mi-cuenta">Mi cuenta y aceptación</Link> · <Link to="/registro">Crear una cuenta</Link> · <Link to="/mis-incidencias/nueva">Solicitudes de privacidad y soporte</Link></p>
 </section>
}
