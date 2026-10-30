import {useEffect,useState} from 'react'
import {readJson,requestApi} from '../../shared/api/request'
export function VerificationBadges({campaignId}:{campaignId:string}){
 const [labels,setLabels]=useState<string[]>([]),[error,setError]=useState(false)
 useEffect(()=>{const c=new AbortController();requestApi(`/api/verification-badges/campaigns/${encodeURIComponent(campaignId)}`,{signal:c.signal}).then(readJson).then(v=>{
 if(!v || typeof v!=='object' || !('mode'in v) || v.mode!=='DEMO' || !('items'in v) || !Array.isArray(v.items) || !v.items.every(i=>i && typeof i==='object' && typeof i.label==='string'))throw new Error('Invalid badge response')
 if(!c.signal.aborted){setLabels(v.items.map(i=>i.label as string));setError(false)}
 }).catch(()=>{if(!c.signal.aborted)setError(true)});return()=>c.abort()},[campaignId])
 if(error)return <p>No se pudieron consultar los distintivos de revisión DEMO.</p>
 if(!labels.length)return null
 return <section aria-label="Revisión documental DEMO"><h2>Revisión documental de prueba</h2><ul>{labels.map(label=><li key={label}>{label}</li>)}</ul><p>Documentos sintéticos revisados; no acreditan identidad real, solvencia ni garantizan el proyecto.</p></section>
}
