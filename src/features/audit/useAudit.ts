import { useEffect, useState } from 'react'
import { SessionError } from '../../shared/api/sessionError'
import { auditPage, emptyAuditFilters, type AuditFilters, type AuditPage } from './auditClient'

export function useAudit() {
  const [filters,setFilters]=useState(emptyAuditFilters)
  const [cursor,setCursor]=useState<string>()
  const [previous,setPrevious]=useState<(string | undefined)[]>([])
  const [page,setPage]=useState<AuditPage | null>(null)
  const [state,setState]=useState<'loading'|'ready'|'anonymous'|'forbidden'|'invalid'|'error'>('loading')
  const [retry,setRetry]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    void auditPage(filters,cursor,controller.signal).then(value=>{if (!controller.signal.aborted) {setPage(value);setState('ready')}})
      .catch(error=>{if (!controller.signal.aborted) {setPage(null);setState(error instanceof SessionError ? error.status===401?'anonymous':error.status===403?'forbidden':error.status===400?'invalid':'error':'error')}})
    return ()=>controller.abort()
  },[filters,cursor,retry])
  function apply(value:AuditFilters) {setState('loading');setPage(null);setFilters({...value});setCursor(undefined);setPrevious([]);setRetry(value=>value+1)}
  function next() {if (state==='ready' && page?.nextCursor) {setPrevious(value=>[...value,cursor]);setCursor(page.nextCursor);setState('loading');setPage(null)}}
  function back() {if (state==='ready' && previous.length) {setCursor(previous.at(-1));setPrevious(value=>value.slice(0,-1));setState('loading');setPage(null)}}
  return {filters,page,state,apply,next,back,hasPrevious:previous.length>0}
}
