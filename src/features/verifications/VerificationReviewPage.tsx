import {useEffect,useRef,useState,type FormEvent} from 'react'
import {Link,Navigate,useParams,useSearchParams} from 'react-router-dom'
import {Button} from '../../shared/components/Button'
import {FormField} from '../../shared/components/FormField'
import {SessionError} from '../../shared/api/sessionError'
import {useAccessPermissions} from '../access/session/accessPermissions'
import {AdministrativeNavigation} from '../campaigns/AdministrativeNavigation'
import {verificationStatus} from './verificationsClient'
import {decideReview,listReviews,readReview,reviewDocumentUrl,reviewFailure,type ReviewDetail,type ReviewPage} from './reviewClient'
import layout from '../campaigns/projects.module.css'
import styles from './review.module.css'
export function VerificationReviewPage(){
 const{id}=useParams(),[params]=useSearchParams()
 return <VerificationReviewContent key={`${id}:${params}`}/>
}
function VerificationReviewContent(){
 const {id}=useParams(),[params,setParams]=useSearchParams(),permissions=useAccessPermissions()
 const kind=params.get('kind')==='ORGANIZATION'?'ORGANIZATION':'USER',status=params.get('status')??'PENDING',page=Number(params.get('page')??1)
 const [data,setData]=useState<ReviewDetail|ReviewPage|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[anonymous,setAnonymous]=useState(false),[retry,setRetry]=useState(0),[notice,setNotice]=useState('')
 useEffect(()=>{const c=new AbortController();void(id?readReview(id,c.signal):listReviews(kind,status,page,c.signal)).then(value=>{if(!c.signal.aborted){setData(value);setLoading(false);setError('')}}).catch(e=>{if(!c.signal.aborted){if(e instanceof SessionError && e.status===401)setAnonymous(true);setData(null);setLoading(false);setError(reviewFailure(e))}});return()=>c.abort()},[id,kind,status,page,retry])
 if(anonymous)return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent('/administracion/verificaciones'+(id?'/'+id:''))}`} />
 const detail=data && 'version'in data?data:null,queue=data && 'items'in data?data:null
 function filter(key:string,value:string){const p=new URLSearchParams(params);p.set(key,value);p.delete('page');setData(null);setLoading(true);setParams(p)}
 return <div className={layout.adminLayout}><AdministrativeNavigation/><section className={`${layout.content} ${styles.page}`}><h1>Revisión KYC y KYB DEMO</h1><p>Solo documentos sintéticos. Una decisión no acredita identidad real, cuenta destino, solvencia ni aprobación legal. No revises casos propios o de organizaciones vinculadas.</p>
 <nav className={styles.actions}><Link to="/administracion/verificaciones">Volver a la cola</Link><Button variant="secondary" onClick={()=>{setNotice('');setData(null);setLoading(true);setRetry(v=>v+1)}}>Actualizar expediente y permisos</Button></nav>
 {!id && <form className={styles.grid} onSubmit={e=>e.preventDefault()}><FormField as="select" label="Tipo de titular" value={kind} onChange={e=>filter('kind',e.target.value)}><option value="USER">Personas</option><option value="ORGANIZATION">Organizaciones</option></FormField><FormField as="select" label="Estado del expediente" value={status} onChange={e=>filter('status',e.target.value)}>{['PENDING','IN_REVIEW','REQUIRES_INFO','APPROVED','REJECTED','EXPIRED','NOT_STARTED'].map(s=><option key={s} value={s}>{verificationStatus(s)}</option>)}</FormField></form>}
 {loading && <p role="status">Consultando expedientes privados…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
 {queue && !loading && <><p>{queue.total} expedientes del filtro</p>{queue.items.length?queue.items.map(item=><article className={styles.card} key={item.id}><h2>{item.typeName}</h2><p>{item.organizationName??'Persona'} · {verificationStatus(item.status)}</p><p>ID: {item.id}</p><Link to={`/administracion/verificaciones/${item.id}`}>Abrir expediente</Link></article>):<p>No hay expedientes en esta página.</p>}<nav className={styles.actions} aria-label="Páginas de verificación"><Button disabled={page<=1} onClick={()=>setParams({kind,status,page:String(page-1)})}>Anterior</Button><span>Página {page}</span><Button disabled={page*20>=queue.total} onClick={()=>setParams({kind,status,page:String(page+1)})}>Siguiente</Button></nav></>}
 {detail && !loading && <><section className={styles.card}><h2>{detail.typeName} · {verificationStatus(detail.status)}</h2><p>Expediente: {detail.id}</p><p>{detail.policy?.treatmentNotice??'Política no disponible: no se puede aprobar.'}</p><dl>{Object.entries(detail.fields).map(([key,value])=><div key={key}><dt>{detail.policy?.fields.find(f=>f.key===key)?.label??key}</dt><dd>{value||'Sin completar'}</dd></div>)}</dl><p>Último revisor: {detail.reviewedBy??'Sin revisión'} · {detail.reviewedAt?new Date(detail.reviewedAt).toLocaleString('es-BO',{timeZone:'America/La_Paz'}):'Sin fecha'}</p>{detail.resultNotes && <p>Observaciones: {detail.resultNotes}</p>}</section>
 <section className={styles.card}><h2>Documentos actuales privados</h2>{detail.documents.map(d=><p key={d.fileId}>{d.label}: <a href={reviewDocumentUrl(detail.id,d.fileId)}>{d.originalName} · Descargar con autorización</a> · {d.isValid===null?'Sin evaluar':d.isValid?'Aceptado en la última revisión':'Observado'}{d.reviewNotes?` · ${d.reviewNotes}`:''}</p>)}</section>
 {permissions.can('verification.review') && ['PENDING','IN_REVIEW'].includes(detail.status) && <ReviewForm key={detail.version} detail={detail} onSaved={value=>{setData(value);setNotice('Decisión confirmada por el servidor y guardada en el historial.')}} />}
 <section className={styles.card}><h2>Historial de estados</h2>{detail.history.map((h,i)=><p key={i}>{verificationStatus(h.status)} · {new Date(h.at).toLocaleString('es-BO',{timeZone:'America/La_Paz'})} · {h.reason??'Sin motivo registrado'}</p>)}<h3>Revisiones conservadas</h3>{detail.revisions.map(r=><details key={r.id}><summary>{r.operation} · {new Date(r.recordedAt).toLocaleString('es-BO')}</summary><p>Política: {r.policyVersion} · {r.resultNotes??'Sin observaciones'}</p><p>{r.documents.map(d=>d.originalName).join(', ')}</p></details>)}</section></>}
 </section></div>
}
export function ReviewForm({detail,onSaved}:{detail:ReviewDetail;onSaved:(value:ReviewDetail)=>void}){
 const [decision,setDecision]=useState(detail.status==='PENDING'?'IN_REVIEW':''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[docs,setDocs]=useState(detail.documents.map(d=>({fileId:d.fileId,isValid:false,notes:''}))),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const active=useRef<AbortController|null>(null);useEffect(()=>()=>active.current?.abort(),[])
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(active.current)return
 if(!confirmed || !decision || reason.trim().length<20 || reason.trim().length>500 || /[<>]/.test(reason) || reason.includes('\u0000') || decision==='APPROVED' && docs.some(d=>!d.isValid)){setError('Confirma una decisión, un motivo de 20–500 caracteres y, para aprobar, todos los documentos actuales.');return}
 const c=new AbortController();active.current=c;setBusy(true);setError('')
 try{const value=await decideReview(detail.id,{expectedVersion:detail.version,decision,reason:reason.trim(),documents:decision==='IN_REVIEW'?[]:docs},c.signal);if(!c.signal.aborted)onSaved(value)}catch(e){if(!c.signal.aborted)setError(reviewFailure(e))}finally{active.current=null;if(!c.signal.aborted)setBusy(false)}
 }
 return <form className={styles.card} onSubmit={e=>void submit(e)} aria-label="Decidir verificación"><h2>Registrar decisión DEMO</h2>{error && <p role="alert">{error}</p>}<FormField as="select" label="Decisión" required value={decision} disabled={busy} onChange={e=>{setDecision(e.target.value);setConfirmed(false)}}><option value="">Selecciona una decisión</option>{(detail.status==='PENDING'?['IN_REVIEW']:['APPROVED','REQUIRES_INFO','REJECTED']).map(s=><option key={s} value={s}>{verificationStatus(s)}</option>)}</FormField>
 {detail.status==='IN_REVIEW' && docs.map((doc,i)=><fieldset key={doc.fileId}><legend>{detail.documents[i]!.label}</legend><label className={styles.check}><input type="checkbox" checked={doc.isValid} disabled={busy} onChange={e=>{setDocs(v=>v.map((d,j)=>j===i?{...d,isValid:e.target.checked}:d));setConfirmed(false)}}/>Revisé y acepto este documento sintético</label><FormField label="Observación del documento" as="textarea" maxLength={500} value={doc.notes} disabled={busy} onChange={e=>{setDocs(v=>v.map((d,j)=>j===i?{...d,notes:e.target.value}:d));setConfirmed(false)}}/></fieldset>)}
 <FormField label="Motivo de la decisión" as="textarea" required minLength={20} maxLength={500} value={reason} disabled={busy} help="20–500 caracteres; quedará visible al titular y en su historial." onChange={e=>{setReason(e.target.value);setConfirmed(false)}}/>
 <label className={styles.check}><input type="checkbox" required checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo esta revisión DEMO y que no es un expediente propio.</label><Button type="submit" loading={busy} disabled={!confirmed}>Registrar decisión</Button></form>
}
