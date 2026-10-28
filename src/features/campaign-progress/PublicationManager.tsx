import { useEffect, useRef, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { uploadFile } from '../files/fileClient'
import { validatePublicationChange } from '../../../backend/src/campaign-progress/domain/progress'
import { changePublication, publicationHistory, type PublicationChange, type PublicationVersion } from './publicationClient'
import { failureText, type ProgressState, type UpdateItem } from './progressClient'
import { UpdateCards } from './UpdateCards'
import styles from './progress.module.css'
export function PublicationManager({id,item,progress,onSaved,onClose,onDirty}:{id:string;item:UpdateItem;progress:ProgressState;onSaved:()=>void;onClose:()=>void;onDirty:(value:boolean)=>void}) {
 const [title,setTitle]=useState(item.title),[body,setBody]=useState(item.body),[milestoneId,setMilestone]=useState(item.milestoneId),[images,setImages]=useState(item.images)
 const [action,setAction]=useState<'CORRECT'|'WITHDRAW'>('CORRECT'),[reason,setReason]=useState(''),[confirm,setConfirm]=useState(false),[dirty,setDirty]=useState(false)
 const [history,setHistory]=useState<PublicationVersion[]|null>(null),[page,setPage]=useState(1),[total,setTotal]=useState(0),[retry,setRetry]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false)
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false)},[dirty,onDirty])
 useEffect(()=>{const c=new AbortController();publicationHistory(id,item.id,page,c.signal).then(v=>{if(!c.signal.aborted){setHistory(v.items);setTotal(v.total)}}).catch(e=>{if(!c.signal.aborted)setError(failureText(e))});return()=>c.abort()},[id,item.id,page,retry])
 function edit(){setDirty(true);setConfirm(false)}
 async function save(){
  if(lock.current||!item.revision)return
  const common={revision:item.revision,reason,confirmed:true as const}
  const input:PublicationChange=action==='WITHDRAW'?{...common,action}:{...common,action,title,body,milestoneId,images}
  const errors=Object.values(validatePublicationChange(input));if(errors.length){setError(errors.join(' '));return}
  lock.current=true;setBusy(true);setError('')
  try{await changePublication(id,item.id,input);setDirty(false);onSaved()}catch(e){setError(failureText(e))}finally{lock.current=false;setBusy(false)}
 }
 async function attach(file:File){
  if(lock.current||images.length>=10)return
  if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Usa PNG, JPG o WebP de hasta 2 MB.');return}
  lock.current=true;setBusy(true);setError('')
  try{const contentBase64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>resolve(String(r.result).split(',')[1]!);r.readAsDataURL(file)});const saved=await uploadFile({visibility:'PUBLIC',purpose:'CAMPAIGN_PUBLIC_IMAGE',originalName:file.name,mimeType:file.type,contentBase64});setImages(v=>[...v,{fileId:saved.id,caption:file.name}]);edit()}catch(e){setError(failureText(e))}finally{lock.current=false;setBusy(false)}
 }
 return <section className={styles.card} aria-label="Gestionar publicación"><h3>{item.withdrawnAt?'Publicación retirada':'Gestionar publicación'}</h3><p>La corrección conserva el avance capturado al publicar y las versiones anteriores. El retiro oculta esta novedad del listado público y conserva el historial privado. Las imágenes cargadas siguen siendo públicas.</p>
 {error&&<p role="alert">{error}</p>}
 {progress.editable&&!item.withdrawnAt&&<fieldset disabled={busy}><legend>Corrección o retiro con motivo</legend><label>Acción<select value={action} onChange={e=>{setAction(e.target.value as typeof action);edit()}}><option value="CORRECT">Corregir publicación</option><option value="WITHDRAW">Retirar publicación</option></select></label>
 {action==='CORRECT'&&<><label>Título corregido<input maxLength={200} value={title} onChange={e=>{setTitle(e.target.value);edit()}} /></label><label>Contenido corregido<textarea maxLength={10000} value={body} onChange={e=>{setBody(e.target.value);edit()}} /></label><label>Hito relacionado<select value={milestoneId??''} onChange={e=>{setMilestone(e.target.value||null);edit()}}><option value="">Avance general</option>{progress.milestones.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 <label>Añadir evidencia pública<input type="file" accept="image/png,image/jpeg,image/webp" disabled={images.length>=10} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void attach(file)}} /></label>
 {images.map((image,index)=><div key={image.fileId}><label>Descripción de evidencia {index+1}<input maxLength={300} value={image.caption} onChange={e=>{setImages(v=>v.map((row,i)=>i===index?{...row,caption:e.target.value}:row));edit()}} /></label><Button variant="tertiary" onClick={()=>{setImages(v=>v.filter((_,i)=>i!==index));edit()}}>Quitar evidencia {index+1} de la versión actual</Button></div>)}</>}
 <label>Motivo privado<textarea maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);edit()}} /></label><Button variant="secondary" onClick={()=>setConfirm(true)}>Revisar cambio</Button>
 {confirm&&<section role="alertdialog" aria-label="Confirmar cambio de publicación"><h4>{action==='WITHDRAW'?'Retirar del listado público':'Publicar versión corregida'}</h4><p>Confirma el motivo y la versión actual. Se conservará la evidencia histórica.</p><Button loading={busy} onClick={()=>void save()}>Confirmar {action==='WITHDRAW'?'retiro':'corrección'}</Button><Button variant="secondary" onClick={()=>setConfirm(false)}>Seguir revisando</Button></section>}</fieldset>}
 <h4>Historial privado de versiones</h4>{history===null?<Button onClick={()=>setRetry(v=>v+1)}>Cargar historial</Button>:history.length?history.map(v=><details key={v.version}><summary>Versión {v.version} · {v.action==='WITHDRAWN'?'Retiro':v.action==='CORRECTED'?'Corrección':'Publicación'} · {new Date(v.recordedAt).toLocaleString('es-BO')}</summary><p>Motivo: {v.reason}</p><UpdateCards items={[v.snapshot]} /></details>):<p>Esta publicación histórica aún no tiene cambios registrados.</p>}
 <div className={styles.actions}><Button variant="secondary" disabled={page===1||busy} onClick={()=>setPage(v=>v-1)}>Versiones anteriores</Button><span>Página {page}</span><Button variant="secondary" disabled={page*20>=total||busy} onClick={()=>setPage(v=>v+1)}>Más versiones</Button><Button disabled={busy} variant="tertiary" onClick={()=>{if(!dirty)onClose();else setError('Confirma que deseas descartar los cambios con el botón correspondiente.')}}>Cerrar historial</Button>{dirty&&<Button disabled={busy} variant="secondary" onClick={onClose}>Descartar cambios y cerrar</Button>}</div>
 </section>
}
