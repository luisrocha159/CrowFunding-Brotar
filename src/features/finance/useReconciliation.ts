import { useEffect, useRef, useState } from 'react'
import { SessionError } from '../../shared/api/sessionError'
import { closeReconciliation, createReconciliation, expireDemoPayments, pendingPayments, reconciliationCurrencies, reconciliationDetail, reconciliationList,
  resolveReconciliation, type Page, type PendingPayment, type ReconciliationBatch, type ReconciliationDetail, type ReconciliationFilters, type ResolutionAction } from './reconciliationClient'

interface Overview {batches: Page<ReconciliationBatch>;pending: Page<PendingPayment>;currencies: {code: string;name: string}[]}
export function useReconciliation(id?: string) {
  const today=new Date().toISOString().slice(0,10)
  const [filters,setFilters]=useState<ReconciliationFilters>({from:today,to:today,currencyCode:'BOB'})
  const [batchCursors,setBatchCursors]=useState<(string|undefined)[]>([undefined])
  const [pendingCursors,setPendingCursors]=useState<(string|undefined)[]>([undefined])
  const [retry,setRetry]=useState(0)
  const [result,setResult]=useState<{key: string;overview: Overview|null;detail: ReconciliationDetail|null;error: unknown}>()
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [mutationError,setMutationError]=useState<unknown>(null)
  const operation=useRef<AbortController|null>(null)
  const creation=useRef<{fingerprint: string;key: string}|null>(null)
  const batchCursor=batchCursors.at(-1),pendingCursor=pendingCursors.at(-1)
  const key=JSON.stringify([id,filters,batchCursor,pendingCursor,retry])
  useEffect(()=>{
    const controller=new AbortController()
    const load=async()=>{
      try {
        if (id) {
          const detail=await reconciliationDetail(id,controller.signal)
          if(!controller.signal.aborted)setResult({key,detail,overview:null,error:null})
        } else {
          const [batches,pending,currencies]=await Promise.all([reconciliationList(batchCursor,controller.signal),pendingPayments(filters,pendingCursor,controller.signal),reconciliationCurrencies(controller.signal)])
          if(!controller.signal.aborted)setResult({key,overview:{batches,pending,currencies},detail:null,error:null})
        }
      } catch(error) {if(!controller.signal.aborted)setResult({key,overview:null,detail:null,error})}
    }
    void load()
    return ()=>controller.abort()
  },[id,filters,batchCursor,pendingCursor,retry,key])
  useEffect(()=>()=>operation.current?.abort(),[])
  const current=result?.key===key?result:null
  const error=mutationError ?? current?.error
  const restricted=error instanceof SessionError && [401,403].includes(error.status)
  const state=restricted ? error.status===401?'anonymous':'forbidden' : !current?'loading':current.error?'error':'ready'
  async function mutate(action: (signal: AbortSignal)=>Promise<ReconciliationDetail|number>) {
    if(operation.current)return null
    const controller=new AbortController();operation.current=controller;setBusy(true);setMessage('');setMutationError(null)
    try {
      const value=await action(controller.signal)
      if(controller.signal.aborted)return null
      setMessage(typeof value==='number'?`Expiración completada: ${value} intentos DEMO vencidos. No se confirmó ni devolvió dinero.`:'Operación confirmada por el servidor. Se conserva el historial del lote.')
      setRetry(n=>n+1)
      return value
    } catch(error) {
      if(!controller.signal.aborted)setMutationError(error)
      return null
    } finally {if(operation.current===controller){operation.current=null;setBusy(false)}}
  }
  function refresh() {setMutationError(null);setRetry(n=>n+1)}
  function apply(value: ReconciliationFilters) {if(busy)return;setFilters({...value});setPendingCursors([undefined]);refresh()}
  async function create(value: ReconciliationFilters) {
    const fingerprint=JSON.stringify(value)
    if(creation.current?.fingerprint!==fingerprint)creation.current={fingerprint,key:crypto.randomUUID()}
    const requestKey=creation.current.key
    const response=await mutate(signal=>createReconciliation(value,requestKey,signal))
    if(response && typeof response!=='number')creation.current=null
    return response
  }
  return {state,overview:restricted?null:current?.overview,detail:restricted?null:current?.detail,error,mutationError,busy,message,filters,refresh,apply,create,
    resolve:(itemId: string,action: ResolutionAction,reason: string)=>id?mutate(signal=>resolveReconciliation(id,itemId,action,reason,signal)):Promise.resolve(null),
    close:()=>id?mutate(signal=>closeReconciliation(id,signal)):Promise.resolve(null),expire:()=>mutate(expireDemoPayments),
    batchPrevious:batchCursors.length>1,pendingPrevious:pendingCursors.length>1,
    batchNext:()=>{if(!busy && current?.overview?.batches.nextCursor)setBatchCursors(x=>[...x,current.overview!.batches.nextCursor!])},
    pendingNext:()=>{if(!busy && current?.overview?.pending.nextCursor)setPendingCursors(x=>[...x,current.overview!.pending.nextCursor!])},
    batchBack:()=>{if(!busy)setBatchCursors(x=>x.length>1?x.slice(0,-1):x)},pendingBack:()=>{if(!busy)setPendingCursors(x=>x.length>1?x.slice(0,-1):x)}}
}
