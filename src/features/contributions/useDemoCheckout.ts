import {useEffect,useRef,useState} from 'react'
import {SessionError} from '../../shared/api/sessionError'
import {readSimulation,type SupportSimulation} from './simulationClient'
import {demoCheckout,demoFailure,demoResult,demoRetry,demoTicket,type DemoTicket} from './demoClient'
export function useDemoCheckout(selectionId:string|null,paymentId:string|null) {
 const [selection,setSelection]=useState<SupportSimulation|null>(null),[ticket,setTicket]=useState<DemoTicket|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[anonymous,setAnonymous]=useState(false),[refresh,setRefresh]=useState(0),[notice,setNotice]=useState('')
 const active=useRef<AbortController|null>(null),keys=useRef(new Map<string,string>())
 useEffect(()=>{const c=new AbortController();
  void (async()=>{try{const result=paymentId?await demoTicket(paymentId,c.signal):selectionId?await readSimulation(selectionId,c.signal):null
    if(!c.signal.aborted){if(result && 'mode' in result && result.mode==='DEMO')setTicket(result as DemoTicket);else setSelection(result as SupportSimulation|null);setLoading(false);setError('')}}
    catch(e){if(!c.signal.aborted){if(e instanceof SessionError && e.status===401)setAnonymous(true);setError(demoFailure(e));setLoading(false)}}})()
  return()=>{c.abort();active.current?.abort()}
 },[selectionId,paymentId,refresh])
 async function perform(action:string,run:(key:string,signal:AbortSignal)=>Promise<DemoTicket|{ticket:DemoTicket;processing:string}>) {
  if(active.current)return null
  const c=new AbortController();active.current=c;setBusy(true);setError('');setNotice('')
  const key=keys.current.get(action) ?? crypto.randomUUID();keys.current.set(action,key)
  try{const result=await run(key,c.signal);if(c.signal.aborted)return null
   const value='ticket' in result?result.ticket:result;setTicket(value)
   setNotice('ticket' in result && result.processing==='NEEDS_REVIEW'?'Aviso recibido para revisión por Finanzas. No suma recaudación ni reactiva el intento.':'Estado consultado y confirmado por el servidor DEMO; no hay dinero real.')
   keys.current.delete(action);return value
  }catch(e){if(!c.signal.aborted){if(e instanceof SessionError && e.status===401)setAnonymous(true);if(e instanceof SessionError && e.status===403){setTicket(null);setSelection(null)}setError(demoFailure(e))}return null}
  finally{if(active.current===c)active.current=null;if(!c.signal.aborted)setBusy(false)}
 }
 return {selection,ticket,error,loading,busy,anonymous,notice,reload:()=>{if(!busy){setLoading(true);setRefresh(x=>x+1)}},
  create:()=>selection?perform('checkout:'+selection.id,(requestKey,signal)=>demoCheckout({campaignId:selection.campaignId,rewardId:selection.rewardId,amount:selection.amount,currencyCode:selection.currency,requestKey,demoConsent:true},signal)):Promise.resolve(null),
  simulate:(outcome:string)=>ticket?perform(ticket.paymentId+':'+outcome,(key,signal)=>demoResult(ticket.paymentId,outcome,key,signal)):Promise.resolve(null),
  retry:()=>ticket?perform('retry:'+ticket.paymentId,(key,signal)=>demoRetry(ticket.contributionId,key,signal)):Promise.resolve(null)}
}
