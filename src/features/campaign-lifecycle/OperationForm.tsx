import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react'
import {Button} from '../../shared/components/Button'
import {FormField} from '../../shared/components/FormField'
import {operationFailure,operationReasonError} from './cycleClient'
import styles from '../verifications/review.module.css'
/** One stable idempotency key per intent, including ambiguous network failures. */
export function OperationForm({title,options,onSave,children,intent=''}:{title:string;options:Record<string,string>;onSave:(input:{action:string;reason:string;requestKey:string;demoConsent:true},signal:AbortSignal)=>Promise<void>;children?:ReactNode;intent?:string}){
 const[action,setAction]=useState(''),[reason,setReason]=useState(''),[confirmedIntent,setConfirmedIntent]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false)
 const currentIntent=JSON.stringify([action,reason,options,intent]),confirmed=confirmedIntent===currentIntent
 const active=useRef<AbortController|null>(null),attempt=useRef<{payload:string;key:string}|null>(null)
 useEffect(()=>()=>active.current?.abort(),[])
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(active.current||!confirmed||!Object.hasOwn(options,action))return;const error=operationReasonError(reason);if(error){setError(error);return}const c=new AbortController();active.current=c;setBusy(true);setError('');setSent(false);const payload=currentIntent;if(attempt.current?.payload!==payload)attempt.current={payload,key:crypto.randomUUID()}
 try{await onSave({action,reason:reason.trim(),requestKey:attempt.current.key,demoConsent:true},c.signal);if(!c.signal.aborted){setSent(true);setConfirmedIntent(null)}}catch(e){if(!c.signal.aborted)setError(operationFailure(e))}finally{active.current=null;if(!c.signal.aborted)setBusy(false)}}
 return <form className={styles.card} aria-label={title} onSubmit={e=>void submit(e)}><h2>{title}</h2><fieldset disabled={busy}>{children}</fieldset>{error&&<p role="alert">{error}</p>}{sent&&<p role="status">Operación registrada. Consulta el estado y su historial.</p>}<FormField as="select" label="Acción" required value={action} disabled={busy} onChange={e=>setAction(e.target.value)}><option value="">Selecciona una acción</option>{Object.entries(options).map(([code,label])=><option key={code} value={code}>{label}</option>)}</FormField><FormField as="textarea" label="Motivo" required minLength={20} maxLength={500} value={reason} disabled={busy} error={reason?operationReasonError(reason)??undefined:undefined} onChange={e=>setReason(e.target.value)}/><label className={styles.check}><input type="checkbox" required checked={confirmed} disabled={busy} onChange={e=>setConfirmedIntent(e.target.checked?currentIntent:null)}/>Confirmo esta acción DEMO · sin dinero real.</label><Button type="submit" loading={busy} disabled={!confirmed||Boolean(operationReasonError(reason))||!action}>Registrar acción DEMO</Button></form>
}
