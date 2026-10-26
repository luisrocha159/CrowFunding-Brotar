import {useEffect,useRef,useState} from 'react'
import {Button} from '../../shared/components/Button'
import {FormField} from '../../shared/components/FormField'
import {Message} from '../../shared/components/Feedback'
import {SessionError} from '../../shared/api/sessionError'
import {replySupportCase,supportError,supportReplyError} from './supportClient'
import styles from './support.module.css'

export function SupportReplyForm({id,onSent,onUnauthorized}:{id:string;onSent:()=>void;onUnauthorized:()=>void}){
  const [body,setBody]=useState(''),[requestId]=useState(()=>crypto.randomUUID())
  const [busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[fieldError,setFieldError]=useState('')
  const active=useRef<AbortController|null>(null)
  useEffect(()=>()=>active.current?.abort(),[])
  async function submit(){
    if(active.current)return
    const invalid=supportReplyError(body);setFieldError(invalid??'');if(invalid)return
    const controller=new AbortController();active.current=controller;setBusy(true);setError('')
    try{await replySupportCase(id,requestId,body,controller.signal);if(!controller.signal.aborted)onSent()}
    catch(cause){if(controller.signal.aborted)return;if(cause instanceof SessionError&&cause.status===401)onUnauthorized();setError(supportError(cause));if(!(cause instanceof SessionError)||cause.status===0||cause.status>=500)setUncertain(true)}
    finally{if(active.current===controller)active.current=null;if(!controller.signal.aborted)setBusy(false)}
  }
  return <form className={styles.panel} noValidate onSubmit={event=>{event.preventDefault();void submit()}}>
    <h2>Responder a soporte</h2><p>El mensaje queda compartido con el equipo de soporte. No incluyas contraseñas ni datos bancarios.</p>
    {error&&<Message tone="error" title="No se confirmó la respuesta">{error}</Message>}
    {uncertain&&<Message tone="warning" title="Resultado por comprobar">Puedes reintentar el mismo mensaje; conservará su clave para evitar duplicados. Actualiza el caso para comprobar si ya aparece.</Message>}
    <FormField as="textarea" label="Tu respuesta" required minLength={20} maxLength={5000} rows={5} help="Entre 20 y 5000 caracteres válidos." value={body} error={fieldError} disabled={busy||uncertain} onChange={event=>setBody(event.target.value)}/>
    <Button type="submit" loading={busy} loadingLabel="Enviando respuesta…">{uncertain?'Reintentar la misma respuesta':'Enviar respuesta a soporte'}</Button>
  </form>
}
