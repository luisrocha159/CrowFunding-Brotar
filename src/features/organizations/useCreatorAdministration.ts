import { useEffect, useRef, useState } from 'react'
import { SessionError } from '../../shared/api/sessionError'
import { changeResponsibility, enableCreator, findManagedUser, type ManagedUser, type StaffRole } from './creatorAdministrationClient'
import { myRoles } from './organizationsClient'

export function useCreatorAdministration() {
  const [user, setUser] = useState<ManagedUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [access, setAccess] = useState<'checking' | 'ready' | 'forbidden' | 'error'>('checking')
  const [retry, setRetry] = useState(0)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    void myRoles(controller.signal).then(roles => {
      if (!controller.signal.aborted) setAccess(roles.some(role => role.code === 'ADMIN') && !roles.some(role => role.code === 'AUDITOR') ? 'ready' : 'forbidden')
    }).catch(cause => {
      if (controller.signal.aborted) return
      if (cause instanceof SessionError && cause.status === 401) setAnonymous(true)
      else setAccess('error')
    })
    return () => controller.abort()
  }, [retry])
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (request.current || access !== 'ready') return
    const controller = new AbortController(); request.current = controller
    setBusy(true); setError(''); setNotice('')
    try { await action(controller.signal) }
    catch (cause) {
      if (controller.signal.aborted) return
      if (cause instanceof SessionError && cause.status === 401) setAnonymous(true)
      setError(cause instanceof SessionError && cause.status === 403 ? 'Se requiere ADMIN vigente sin AUDITOR y no puedes modificar tus propias responsabilidades.'
        : cause instanceof SessionError && cause.status === 404 ? 'No se encontró la cuenta. Comprueba el correo y que ya esté registrada.'
        : cause instanceof SessionError && cause.status === 409 ? 'La cuenta no admite el cambio. Comprueba su estado, motivo y roles; revoca expresamente concesiones futuras o vencidas antes de volver a conceder.'
        : cause instanceof SessionError && cause.status === 400 ? 'Revisa el correo, el motivo y la confirmación.'
        : 'No se confirmó la operación. Busca de nuevo la cuenta para comprobar sus roles antes de repetir. Verifica la API y las migraciones.')
    } finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  async function find(email: string) {
    setUser(null)
    await run(async signal => { const result = await findManagedUser(email, signal); if (!signal.aborted) setUser(result) })
  }
  async function grant(reason: string) {
    if (!user) return
    const target = user
    await run(async signal => {
      const result = await enableCreator(target.id, reason, signal)
      if (signal.aborted) return
      setUser({ ...target, roles: [...new Set([...target.roles, 'CREATOR'])] })
      setNotice(result.created ? 'CREATOR habilitado provisionalmente. La acción quedó registrada; no se verificó identidad ni KYC.' : 'La cuenta ya tenía CREATOR vigente; no se duplicó la concesión.')
    })
  }
  async function changeStaff(role: StaffRole, operation: 'GRANT' | 'REVOKE', reason: string) {
    if (!user) return
    const target = user
    await run(async signal => {
      const result = await changeResponsibility(target.id, role, operation, reason, signal)
      const refreshed = await findManagedUser(target.email, signal)
      if (!signal.aborted) {
        setUser(refreshed)
        setNotice(result.changed ? `Responsabilidad ${role} ${operation === 'GRANT' ? 'concedida' : 'revocada'} y auditada.` : 'El estado solicitado ya estaba aplicado. No se duplicó la operación.')
      }
    })
  }
  return { user, busy, error, notice, anonymous, access, retryAccess: () => { setAccess('checking'); setRetry(value => value + 1) }, find, grant, changeStaff }
}
