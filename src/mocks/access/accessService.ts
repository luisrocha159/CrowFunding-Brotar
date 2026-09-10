export type AccessOutcome = 'success' | 'incorrect' | 'exists' | 'error'

/** Deliberately receives NO credentials or personal data. No network or storage. */
export function simulateAccess(outcome: AccessOutcome = 'success', { signal, delayMs = 1000 }: { signal?: AbortSignal; delayMs?: number } = {}): Promise<AccessOutcome> {
  return new Promise((resolve, reject) => {
    const delay = Number.isFinite(delayMs) ? Math.min(5000, Math.max(0, delayMs)) : 1000
    const abort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('Solicitud cancelada', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve(outcome)
    }, delay)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
}
