import {useEffect,useRef,useState} from 'react'
import {Button} from '../../shared/components/Button'
import {FormField} from '../../shared/components/FormField'
import {uploadFile} from '../files/fileClient'
import {operationFailure} from '../campaign-lifecycle/cycleClient'
export function AccountabilityEvidence({files,onChange,documentUrl,existingFiles,onBusy}:{files:string[];onChange:(ids:string[])=>void;documentUrl?:(id:string)=>string;existingFiles?:string[];onBusy?:(busy:boolean)=>void}){
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),active=useRef<AbortController|null>(null)
 useEffect(()=>()=>active.current?.abort(),[])
 async function upload(file:File|undefined){if(!file||active.current)return;if(!file.size||file.size>5*1024*1024||!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type)){setError('Usa PDF, PNG, JPG o WebP de hasta 5 MB.');return}const c=new AbortController();active.current=c;setBusy(true);onBusy?.(true);setError('')
  try{const contentBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>typeof reader.result==='string'?resolve(reader.result.split(',')[1]??''):reject(new Error());reader.readAsDataURL(file)});if(c.signal.aborted)return;const uploaded=await uploadFile({purpose:'CLOSURE_EVIDENCE',visibility:'PRIVATE',originalName:file.name,mimeType:file.type,contentBase64},c.signal);if(!c.signal.aborted)onChange([...files,uploaded.id])}catch(e){if(!c.signal.aborted)setError(operationFailure(e))}finally{active.current=null;onBusy?.(false);if(!c.signal.aborted)setBusy(false)}
 }
 return <div><FormField label="Adjuntar evidencia privada" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={busy||files.length>=3} help="Hasta 3 documentos por gasto, 5 MB cada uno. Solo documentos de ensayo DEMO." error={error||undefined} onChange={e=>void upload(e.target.files?.[0])}/>{busy&&<p role="status">Cargando evidencia privada… Espera antes de guardar.</p>}{files.map((id,i)=><p key={id}>{documentUrl&&existingFiles?.includes(id)?<a href={documentUrl(id)} target="_blank" rel="noreferrer">Evidencia privada {i+1}</a>:`Evidencia privada ${i+1} adjunta`} · <Button disabled={busy} onClick={()=>onChange(files.filter(f=>f!==id))}>Desvincular evidencia {i+1} del borrador</Button></p>)}</div>
}
