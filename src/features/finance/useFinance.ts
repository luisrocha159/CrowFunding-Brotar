import { useEffect, useRef, useState } from 'react'
import { SessionError } from '../../shared/api/sessionError'
import { emptyFinanceFilters, exportFinance, financeReport, type FinanceFilters, type FinanceReport } from './financeClient'

export function useFinance() {
  const [filters,setFilters]=useState<FinanceFilters>(emptyFinanceFilters)
  const [cursor,setCursor]=useState<string>()
  const [previous,setPrevious]=useState<(string | undefined)[]>([])
  const [retry,setRetry]=useState(0)
  const [state,setState]=useState<'loading'|'ready'|'error'|'anonymous'|'forbidden'|'invalid'>('loading')
  const [report,setReport]=useState<FinanceReport | null>(null)
  const [exporting,setExporting]=useState(false)
  const [exportError,setExportError]=useState('')
  const exportController=useRef<AbortController | null>(null)
  useEffect(()=>{
    const controller=new AbortController()
    void financeReport(filters,cursor,controller.signal).then(value=>{
      if (!controller.signal.aborted) { setReport(value);setState('ready') }
    }).catch(error=>{
      if (!controller.signal.aborted) { setReport(null); setState(error instanceof SessionError ?
        error.status===401?'anonymous':error.status===403?'forbidden':error.status===400?'invalid':'error':'error') }
    })
    return ()=>controller.abort()
  },[filters,cursor,retry])
  useEffect(()=>()=>exportController.current?.abort(),[])
  function apply(value: FinanceFilters) {
    exportController.current?.abort();exportController.current=null;setExporting(false);setExportError('')
    setState('loading');setReport(null);setFilters({...value});setCursor(undefined);setPrevious([]);setRetry(value=>value+1)
  }
  function next() {
    if (state!=='ready' || !report?.nextCursor) return
    setState('loading');setPrevious(value=>[...value,cursor]);setCursor(report.nextCursor);setReport(null)
  }
  function back() {
    if (!previous.length || state!=='ready') return
    setState('loading');setCursor(previous.at(-1));setPrevious(value=>value.slice(0,-1));setReport(null)
  }
  async function download() {
    if (exportController.current || state!=='ready') return
    const controller=new AbortController();exportController.current=controller;setExporting(true);setExportError('')
    try {
      const blob=await exportFinance(filters,controller.signal)
      if (!controller.signal.aborted) {
        const url=URL.createObjectURL(blob),link=document.createElement('a')
        link.href=url;link.download='brotar-pagos.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof SessionError && [401,403].includes(error.status)) {setReport(null);setState(error.status===401?'anonymous':'forbidden')}
        setExportError(error instanceof SessionError && error.status===413 ? 'Hay más de 5000 pagos. Acota los filtros; no se descargó un reporte incompleto.' : 'No se pudo descargar el CSV. Comprueba el acceso y reintenta.')
      }
    } finally { if (exportController.current===controller) {exportController.current=null;setExporting(false)} }
  }
  return {state,report,filters,apply,next,back,hasPrevious:previous.length>0,download,exporting,exportError}
}
