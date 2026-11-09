import {useEffect,useState} from 'react'
import {Button} from '../../shared/components/Button'
import type {DemoTicket} from './demoClient'
import {paymentQrPayload,paymentQrOptions} from './paymentQrPayload'
import styles from './contributions.module.css'

export function PaymentQr({ticket}:{ticket:DemoTicket}){
  const payload=paymentQrPayload(ticket),[retry,setRetry]=useState(0)
  const [result,setResult]=useState<{payload:string;retry:number;src:string|null}|null>(null)
  useEffect(()=>{
    let current=true
    void import('qrcode').then(qr=>qr.default.toDataURL(payload,paymentQrOptions)).then(src=>{
      if(current)setResult({payload,retry,src})
    }).catch(()=>{if(current)setResult({payload,retry,src:null})})
    return()=>{current=false}
  },[payload,retry])
  const ready=result?.payload===payload&&result.retry===retry
  return <figure className={styles.paymentQr}>
    {ready&&result.src?<img src={result.src} width={288} height={288} alt={`Código QR del aporte ${ticket.reference}`} decoding="async"/>:<div className={styles.qrPlaceholder}>{ready?<p role="alert">No se pudo generar el código QR. <Button variant="secondary" onClick={()=>setRetry(n=>n+1)}>Reintentar QR</Button></p>:<p role="status">Generando código QR…</p>}</div>}
    <figcaption><h3>QR del aporte</h3><p>Escanea con un lector QR para ver la referencia y el importe de esta operación.</p><p className={styles.reference}>Referencia: {ticket.reference}</p>{ready&&result.src&&<a className={styles.qrDownload} href={result.src} download={`Brotar-QR-${ticket.reference.replace(/[^a-z0-9_-]/gi,'')}.png`}>Descargar QR</a>}</figcaption>
  </figure>
}
