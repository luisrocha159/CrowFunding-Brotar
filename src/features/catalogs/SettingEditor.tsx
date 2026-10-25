import {useEffect,useRef,useState,type FormEvent} from 'react'
import {Button} from '../../shared/components/Button'
import {FormField} from '../../shared/components/FormField'
import {saveSetting,type AgreedSetting} from './catalogClient'
import styles from './catalogs.module.css'

export function SettingEditor({setting,editable,onSaved}: {setting: AgreedSetting;editable: boolean;onSaved: ()=>void}) {
  const first=setting.key==='support.first_response_hours',known=first || setting.key==='support.escalation_hours'
  const min=first?1:72,max=first?48:720
  const [value,setValue]=useState(String(setting.value ?? '')),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const active=useRef<AbortController|null>(null)
  useEffect(()=>()=>active.current?.abort(),[])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if(active.current || !editable || !known)return
    if(!/^\d+$/.test(value) || Number(value)<min || Number(value)>max || !confirmed){setError(`Confirma un entero entre ${min} y ${max} horas.`);return}
    const controller=new AbortController();active.current=controller;setBusy(true);setError('')
    try {await saveSetting(setting.key,Number(value),controller.signal);if(!controller.signal.aborted)onSaved()}
    catch {if(!controller.signal.aborted)setError('Cambio no confirmado. Actualiza el catálogo y los permisos antes de reintentar.')}
    finally {if(active.current===controller)active.current=null;if(!controller.signal.aborted)setBusy(false)}
  }
  return <form className={`${styles.confirmation} ${styles.parameter}`} onSubmit={event=>void submit(event)} aria-label={`Parámetro ${setting.key}`}><h3>{first?'Primera respuesta objetivo':'Alerta de escalamiento'}</h3>
    <p>{setting.key} · Meta operativa DEMO; no SLA legal ni envío de correo.</p>
    <FormField label="Horas corridas" type="number" required min={min} max={max} step={1} value={value} disabled={!editable || busy || !known} error={error || undefined} help={`Entero de ${min} a ${max}.`} onChange={event=>{setValue(event.target.value);setConfirmed(false);setError('')}} />
    <p>{setting.updatedAt?`Última actualización: ${new Date(setting.updatedAt).toLocaleString('es-BO')}`:'Sin valor persistido; ejecutar migraciones.'}</p>
    {editable && known && <><label className={styles.acknowledgement}><input type="checkbox" required disabled={busy} checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} />Confirmo el cambio de este parámetro de pruebas.</label><Button type="submit" loading={busy} disabled={!confirmed}>Guardar parámetro</Button></>}
  </form>
}
