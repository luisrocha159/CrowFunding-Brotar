import {useEffect,useRef,useState} from 'react'
import {SessionError} from '../../shared/api/sessionError'
import {readSimulation,type SupportSimulation} from './simulationClient'
import {demoCheckout,demoFailure,demoRetry,demoTicket,type DemoTicket} from './demoClient'

export function useDemoCheckout(selectionId:string|null,paymentId:string|null) {
  const [selection,setSelection]=useState<SupportSimulation|null>(null),[ticket,setTicket]=useState<DemoTicket|null>(null)
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[anonymous,setAnonymous]=useState(false)
  const [revision,setRevision]=useState(0)
  const active=useRef<AbortController|null>(null),read=useRef<AbortController|null>(null)
  function report(reason:unknown) {
    if(reason instanceof SessionError && reason.status===401)setAnonymous(true)
    if(reason instanceof SessionError && (reason.status===403||reason.status===404)){setTicket(null);setSelection(null)}
    setError(demoFailure(reason))
  }
  useEffect(()=>{
    const controller=new AbortController()
    read.current=controller
    async function load() {
      try {
        if(paymentId){
          const result=await demoTicket(paymentId,controller.signal)
          if(!controller.signal.aborted)setTicket(result)
        }else if(selectionId){
          const result=await readSimulation(selectionId,controller.signal)
          if(!controller.signal.aborted)setSelection(result)
        }
        if(!controller.signal.aborted)setError('')
      }catch(reason){if(!controller.signal.aborted)report(reason)}
      finally{if(read.current===controller)read.current=null;if(!controller.signal.aborted)setLoading(false)}
    }
    void load()
    return ()=>controller.abort()
  },[selectionId,paymentId,revision])
  useEffect(()=>()=>{active.current?.abort()},[])
  const pending=ticket?.status==='INITIATED'||ticket?.status==='PENDING'
  useEffect(()=>{
    if(!paymentId||!pending||busy)return
    const refresh=()=>{if(document.visibilityState==='visible'&&!active.current&&!read.current)setRevision(value=>value+1)}
    const interval=window.setInterval(refresh,8000)
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    return ()=>{window.clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}
  },[paymentId,pending,busy])
  async function perform(key:string,run:(key:string,signal:AbortSignal)=>Promise<DemoTicket>) {
    if(active.current)return null
    read.current?.abort()
    const controller=new AbortController()
    active.current=controller;setBusy(true);setError('')
    try{
      const result=await run(key,controller.signal)
      if(controller.signal.aborted)return null
      setTicket(result)
      return result
    }catch(reason){if(!controller.signal.aborted)report(reason);return null}
    finally{if(active.current===controller)active.current=null;if(!controller.signal.aborted)setBusy(false)}
  }
  return {selection,ticket,error,loading,busy,anonymous,reload:()=>{if(!active.current)setRevision(value=>value+1)},
    create:()=>selection?perform(selection.id,(requestKey,signal)=>demoCheckout({campaignId:selection.campaignId,rewardId:selection.rewardId,amount:selection.amount,currencyCode:selection.currency,requestKey,demoConsent:true,method:selection.method},signal)):Promise.resolve(null),
    retry:()=>ticket?perform(ticket.paymentId,(key,signal)=>demoRetry(ticket.contributionId,key,signal)):Promise.resolve(null)}
}
