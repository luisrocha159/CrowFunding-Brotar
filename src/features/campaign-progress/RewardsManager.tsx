import { useEffect, useRef, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { uploadFile } from '../files/fileClient'
import { validateRewardChange } from '../../../backend/src/campaign-progress/domain/progress'
import { changeReward, readRewardTracking, rewardHistory, type RewardChange, type RewardEvent, type RewardTracking, type TrackedReward } from './publicationClient'
import { failureText } from './progressClient'
import styles from './progress.module.css'
const labels:Record<string,string>={PENDING:'Pendiente',IN_PROGRESS:'En preparación',FULFILLED:'Cumplida',CANCELLED:'Cancelada'}
export function RewardsManager({id,onDirty}:{id:string;onDirty:(value:boolean)=>void}){
 const [data,setData]=useState<RewardTracking|null>(null),[page,setPage]=useState(1),[retry,setRetry]=useState(0),[selected,setSelected]=useState<TrackedReward|null>(null),[dirty,setDirty]=useState(false)
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false)},[dirty,onDirty])
 useEffect(()=>{const c=new AbortController();readRewardTracking(id,page,c.signal).then(v=>{if(!c.signal.aborted){setData(v);setError('')}}).catch(e=>{if(!c.signal.aborted)setError(failureText(e))});return()=>c.abort()},[id,page,retry])
 return <section className={styles.page}><h2>Seguimiento de recompensas</h2><p>SIMULACIÓN · SIN DINERO REAL. Compara las recompensas prometidas de aportes DEMO confirmados con su cumplimiento. Una devolución completa elimina la obligación. La evidencia del cumplimiento es privada.</p>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {!data?<Button onClick={()=>setRetry(v=>v+1)}>Cargar seguimiento</Button>:<><p>Prometidas exigibles: {data.total} · Cumplidas: {data.fulfilled} · Pendientes: {data.total-data.fulfilled}</p>{!data.editable&&<p>Solo consulta. Los cambios se registran durante la ejecución y con permiso de edición.</p>}
 {!data.items.length&&<p>No hay recompensas exigibles en esta página.</p>}{data.items.map(r=><article className={styles.card} key={r.id}><h3>{r.title}</h3><p>{r.promise}</p><p>Aporte {r.reference} · Fecha prometida: {r.promisedOn??'Sin fecha definida'}</p><p>Estado: {labels[r.status]} · Cumplida el: {r.fulfilledOn??'Sin cumplimiento'}</p>{r.notes&&<p>Última nota privada: {r.notes}</p>}{r.fileId&&<a href={`/api/me/campaign-closure/${encodeURIComponent(id)}/documents/${encodeURIComponent(r.fileId)}`} target="_blank" rel="noopener noreferrer">Descargar evidencia privada</a>}<Button variant="secondary" disabled={dirty} onClick={()=>setSelected(r)}>Ver seguimiento e historial</Button></article>)}
 {selected&&<RewardEditor key={selected.id} id={id} item={selected} editable={data.editable} onDirty={setDirty} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);setDirty(false);setRetry(v=>v+1);setNotice('Seguimiento guardado con su historial.')}} />}
 <nav className={styles.actions} aria-label="Paginación de recompensas"><Button variant="secondary" disabled={page===1||dirty} onClick={()=>{setSelected(null);setPage(v=>v-1)}}>Anterior</Button><span>Página {page}</span><Button variant="secondary" disabled={page*20>=data.total||dirty} onClick={()=>{setSelected(null);setPage(v=>v+1)}}>Siguiente</Button></nav></>}
 </section>
}
function RewardEditor({id,item,editable,onDirty,onClose,onSaved}:{id:string;item:TrackedReward;editable:boolean;onDirty:(v:boolean)=>void;onClose:()=>void;onSaved:()=>void}){
 const [status,setStatus]=useState<RewardChange['status']>(item.status==='PENDING'?'IN_PROGRESS':item.status),[reason,setReason]=useState(''),[fulfilledOn,setOn]=useState(item.fulfilledOn??''),[fileId,setFile]=useState<string|null>(null)
 const [dirty,setDirty]=useState(false),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState<RewardEvent[]|null>(null),[page,setPage]=useState(1),[total,setTotal]=useState(0),[retry,setRetry]=useState(0);const lock=useRef(false)
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false)},[dirty,onDirty])
 useEffect(()=>{const c=new AbortController();rewardHistory(id,item.id,page,c.signal).then(v=>{if(!c.signal.aborted){setHistory(v.items);setTotal(v.total)}}).catch(e=>{if(!c.signal.aborted)setError(failureText(e))});return()=>c.abort()},[id,item.id,page,retry])
 function edit(){setDirty(true);setConfirm(false)}
 async function attach(file:File){
  if(lock.current)return
  if(file.size>5*1024*1024||!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type)){setError('Usa un PDF o imagen de hasta 5 MB.');return}
  lock.current=true;setBusy(true);setError('')
  try{const contentBase64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>resolve(String(r.result).split(',')[1]!);r.readAsDataURL(file)});const saved=await uploadFile({visibility:'PRIVATE',purpose:'CLOSURE_EVIDENCE',originalName:file.name,mimeType:file.type,contentBase64});setFile(saved.id);edit()}catch(e){setError(failureText(e))}finally{lock.current=false;setBusy(false)}
 }
 async function save(){
  if(lock.current)return
  const input:RewardChange={revision:item.revision,status,reason,confirmed:true,fulfilledOn:status==='FULFILLED'?fulfilledOn:null,fileId:status==='FULFILLED'?fileId:null}
  const errors=Object.values(validateRewardChange(input));if(errors.length){setError(errors.join(' '));return}
  lock.current=true;setBusy(true);setError('')
  try{await changeReward(id,item.id,input);setDirty(false);onSaved()}catch(e){setError(failureText(e))}finally{lock.current=false;setBusy(false)}
 }
 return <section className={styles.card} aria-label="Gestionar recompensa"><h3>Seguimiento de {item.title}</h3>{error&&<p role="alert">{error}</p>}
 {editable&&!(item.status==='FULFILLED'&&item.fileId)&&<fieldset disabled={busy}><legend>Registrar cambio</legend><label>Estado<select value={status} onChange={e=>{setStatus(e.target.value as RewardChange['status']);edit()}}>{Object.entries(labels).map(([code,label])=><option key={code} value={code} disabled={item.status==='FULFILLED'&&code!=='FULFILLED'}>{label}</option>)}</select></label><label>Motivo privado<textarea maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);edit()}} /></label>
 {status==='FULFILLED'&&<><label>Fecha real de cumplimiento<input type="date" value={fulfilledOn} onChange={e=>{setOn(e.target.value);edit()}} /></label><label>Evidencia privada del cumplimiento<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void attach(file)}} /></label>{fileId&&<p role="status">Evidencia privada cargada.</p>}</>}
 <Button variant="secondary" onClick={()=>setConfirm(true)}>Revisar cambio de recompensa</Button>{confirm&&<section role="alertdialog" aria-label="Confirmar seguimiento"><p>Confirma el cambio y su motivo. Un cumplimiento con evidencia se conserva sin modificación y sirve también para el cierre de campaña.</p><Button loading={busy} onClick={()=>void save()}>Confirmar seguimiento</Button><Button variant="secondary" onClick={()=>setConfirm(false)}>Seguir revisando</Button></section>}</fieldset>}
 {item.status==='FULFILLED'&&item.fileId&&<p>El cumplimiento y su evidencia se conservan sin modificación.</p>}
 <h4>Historial privado</h4>{history===null?<Button onClick={()=>setRetry(v=>v+1)}>Cargar historial de recompensa</Button>:history.length?<ul>{history.map(e=><li key={e.id}>{new Date(e.recordedAt).toLocaleString('es-BO')} · {labels[e.snapshot.status]??e.snapshot.status} · {e.reason}</li>)}</ul>:<p>No hay cambios registrados en este historial.</p>}
 <div className={styles.actions}><Button variant="secondary" disabled={page===1||busy} onClick={()=>setPage(v=>v-1)}>Historial anterior</Button><span>Página {page}</span><Button variant="secondary" disabled={page*20>=total||busy} onClick={()=>setPage(v=>v+1)}>Más historial</Button><Button variant="tertiary" disabled={busy} onClick={onClose}>{dirty?'Descartar cambios y cerrar':'Cerrar seguimiento'}</Button></div>
 </section>
}
