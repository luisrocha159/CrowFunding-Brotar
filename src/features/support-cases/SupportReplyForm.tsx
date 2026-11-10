import {useEffect,useRef,useState} from 'react'
import {Button} from '../../shared/components/Button'
import {FormField} from '../../shared/components/FormField'
import {Message} from '../../shared/components/Feedback'
import {SessionError} from '../../shared/api/sessionError'
import {replySupportCase,replySupportAsStaff,supportError,supportFileError,uploadSupportEvidence} from './supportClient'
import {textError} from '../../../backend/src/campaigns/domain/input-policy'
import styles from './support.module.css'

interface Attachment {key:string;name:string;file:File|null;id:string|null}
export function SupportReplyForm({id,onSent,onUnauthorized,staff=false}:{id:string;onSent:()=>void;onUnauthorized:()=>void;staff?:boolean}){
  const [body,setBody]=useState(''),[requestId,setRequestId]=useState(()=>crypto.randomUUID()),[attachments,setAttachments]=useState<Attachment[]>([])
  const [busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[fieldError,setFieldError]=useState('')
  const active=useRef<AbortController|null>(null)
  useEffect(()=>()=>active.current?.abort(),[])
  async function submit(){
    if(active.current)return
    const invalid=textError(body,staff?1:20,5000);setFieldError(invalid??'');if(invalid)return
    const controller=new AbortController();active.current=controller;setBusy(true);setError('')
    let sending=false
    const uploaded=[...attachments]
    try{
      for(const [index,item] of uploaded.entries()){
        if(!item.file)continue
        const file=await uploadSupportEvidence(item.file,controller.signal)
        if(controller.signal.aborted)return
        uploaded[index]={...item,id:file.id,file:null};setAttachments([...uploaded])
      }
      sending=true
      await (staff?replySupportAsStaff:replySupportCase)(id,requestId,body,controller.signal,undefined,uploaded.map(item=>item.id!))
      if(!controller.signal.aborted){setBody('');setAttachments([]);setUncertain(false);setRequestId(crypto.randomUUID());onSent()}
    }
    catch(cause){if(controller.signal.aborted)return;if(cause instanceof SessionError&&cause.status===401)onUnauthorized();setError(supportError(cause));if(sending&&(!(cause instanceof SessionError)||cause.status===0||cause.status>=500||cause.status===409))setUncertain(true)}
    finally{if(active.current===controller)active.current=null;if(!controller.signal.aborted)setBusy(false)}
  }
  return <form className={styles.panel} noValidate onSubmit={event=>{event.preventDefault();void submit()}}>
    <h2>{staff?'Responder al titular':'Responder a soporte'}</h2><p>{staff?'El titular podrá leer el mensaje y descargar sus adjuntos desde Mis incidencias.':'El mensaje y sus adjuntos quedan compartidos con el equipo de soporte.'} No incluyas contraseñas ni datos bancarios.</p>
    {error&&<Message tone="error" title="No se confirmó la respuesta">{error}</Message>}
    {uncertain&&<Message tone="warning" title="Resultado por comprobar">Puedes reintentar el mismo mensaje con los mismos archivos; conservará su clave para evitar duplicados. Actualiza el caso para comprobar si ya aparece.</Message>}
    <fieldset className={styles.fields} disabled={busy||uncertain}>
      <FormField as="textarea" label={staff?'Mensaje compartido':'Tu respuesta'} required minLength={staff?1:20} maxLength={5000} rows={5} help={`Entre ${staff?1:20} y 5000 caracteres válidos.`} value={body} error={fieldError} onChange={event=>setBody(event.target.value)}/>
      <FormField label="Archivos adjuntos (opcional)" type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" help="Hasta 10 archivos PDF, PNG, JPG o WebP de 5 MB cada uno. Solo estarán disponibles dentro de esta conversación." onChange={event=>{
        const files=Array.from(event.target.files??[]);event.target.value=''
        if(files.length+attachments.length>10){setError('Puedes adjuntar hasta 10 archivos por respuesta.');return}
        const invalid=files.map(supportFileError).find(Boolean)
        if(invalid){setError(invalid);return}
        setError('');setAttachments(previous=>[...previous,...files.map(file=>({key:crypto.randomUUID(),name:file.name,file,id:null}))])
      }}/>
      {attachments.length>0&&<ul className={styles.attachmentList}>{attachments.map(item=><li key={item.key} className={styles.attachment}><span>{item.name} <small>{item.id?'Cargado privado':'Listo para adjuntar'}</small></span><Button variant="tertiary" onClick={()=>setAttachments(previous=>previous.filter(file=>file.key!==item.key))} aria-label={`Quitar ${item.name}`}>Quitar</Button></li>)}</ul>}
    </fieldset>
    <Button type="submit" loading={busy} loadingLabel="Enviando respuesta…">{uncertain?'Reintentar la misma respuesta':staff?'Enviar respuesta':'Enviar respuesta a soporte'}</Button>
  </form>
}
