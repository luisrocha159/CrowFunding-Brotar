import { useEffect, useRef, useState } from 'react'
import { simulateAccess, type AccessOutcome } from '../../mocks/access/accessService'

export function useAccessRequest() {
  const active = useRef<AbortController | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | AccessOutcome>('idle')
  useEffect(() => () => { active.current?.abort(); active.current = null }, [])

  async function run(outcome: AccessOutcome): Promise<AccessOutcome | null> {
    if (active.current) return null
    const controller = new AbortController()
    active.current = controller
    setStatus('loading')
    try {
      const result = await simulateAccess(outcome, { signal: controller.signal })
      if (controller.signal.aborted) return null
      setStatus(result)
      return result
    } catch {
      if (controller.signal.aborted) return null
      setStatus('error')
      return 'error'
    } finally {
      if (active.current === controller) active.current = null
    }
  }
  return { status, busy: status === 'loading', run, reset: () => { if (!active.current) setStatus('idle') } }
}
