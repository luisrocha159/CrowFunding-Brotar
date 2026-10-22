import { useCallback, useEffect, useRef, useState } from 'react'
import { myRoles } from '../organizations/organizationsClient'
import { SessionError } from '../../shared/api/sessionError'
import { catalogAccess, catalogError } from './catalogForm'
import { listCategories, listSettings, saveCategory, setCategoryActive, type AgreedSetting, type Category, type CategoryInput } from './catalogClient'

type Access = 'checking' | 'edit' | 'read' | 'forbidden' | 'error'
export function useCatalogs() {
  const [access, setAccess] = useState<Access>('checking')
  const [anonymous, setAnonymous] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<AgreedSetting[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const operation = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.current?.abort() } }, [])
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const roles = await myRoles(controller.signal)
        const permission = catalogAccess(roles.map(role => role.code))
        if (controller.signal.aborted) return
        setAccess(permission)
        if (permission === 'forbidden') return
        const [rows, parameters] = await Promise.all([listCategories(controller.signal), listSettings(controller.signal)])
        if (controller.signal.aborted) return
        setCategories(rows); setSettings(parameters); setLoaded(true)
      } catch (cause) {
        if (controller.signal.aborted) return
        if (cause instanceof SessionError && cause.status === 401) setAnonymous(true)
        else if (cause instanceof SessionError && cause.status === 403) setAccess('forbidden')
        else { setError(catalogError(cause, 'load')); setAccess('error') }
      }
    })()
    return () => controller.abort()
  }, [refresh])
  const reload = useCallback(() => {
    if (operation.current) return
    setAccess('checking'); setLoaded(false); setError(''); setNotice(''); setRefresh(value => value + 1)
  }, [])
  async function mutate(kind: 'save' | 'state', action: (signal: AbortSignal) => Promise<Category>): Promise<boolean> {
    if (operation.current || access !== 'edit' || !loaded) return false
    const controller = new AbortController(); operation.current = controller
    setBusy(true); setError(''); setNotice('')
    try {
      const category = await action(controller.signal)
      if (controller.signal.aborted || !mounted.current) return false
      setCategories(previous => [...previous.filter(row => row.id !== category.id), category].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)))
      setNotice(kind === 'save' ? 'Categoría guardada. El cambio quedó registrado.' : `Categoría ${category.isActive ? 'activada' : 'desactivada'}. El cambio quedó registrado.`)
      return true
    } catch (cause) {
      if (controller.signal.aborted || !mounted.current) return false
      if (cause instanceof SessionError && cause.status === 401) setAnonymous(true)
      setError(catalogError(cause, kind))
      if (cause instanceof SessionError && cause.status === 403) { setAccess('forbidden'); setLoaded(false) }
      // Resultado desconocido: exigir nueva consulta antes de permitir otra escritura.
      if (!(cause instanceof SessionError) || cause.status === 0 || cause.status >= 500) setLoaded(false)
      return false
    } finally {
      if (operation.current === controller) operation.current = null
      if (!controller.signal.aborted && mounted.current) setBusy(false)
    }
  }
  return { access, anonymous, categories, settings, loaded, busy, error, notice, reload,
    save: (id: string | null, input: CategoryInput) => mutate('save', signal => saveCategory(id, input, signal)),
    state: (category: Category) => mutate('state', signal => setCategoryActive(category.id, !category.isActive, signal)) }
}
