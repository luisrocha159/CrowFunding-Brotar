import { useEffect, useState } from 'react'
import { readJson, requestApi } from '../../../shared/api/request'
import { SessionError } from './sessionClient'

export interface AccessPermissions { permissions: string[]; readOnly: boolean }
export function permissionsFrom(value: unknown): AccessPermissions {
  if (!value || typeof value !== 'object' || !('permissions' in value) || !('readOnly' in value)
    || !Array.isArray(value.permissions) || !value.permissions.every(code => typeof code === 'string')
    || typeof value.readOnly !== 'boolean') throw new SessionError(0)
  return { permissions: [...new Set(value.permissions as string[])], readOnly: value.readOnly }
}
export async function myPermissions(signal?: AbortSignal): Promise<AccessPermissions> {
  return permissionsFrom(await readJson(await requestApi('/api/access/permissions', { signal })))
}
export function canAccess(access: AccessPermissions | null, permission: string): boolean {
  return access?.permissions.includes(permission) === true && (!access.readOnly ||
    permission.endsWith('.read') || permission.endsWith('.read.own'))
}
export function useAccessPermissions() {
  const [access,setAccess] = useState<AccessPermissions | null>(null)
  const [error,setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void myPermissions(controller.signal).then(result => { if (!controller.signal.aborted) setAccess(result) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  },[])
  return { access,error,can: (permission: string) => canAccess(access,permission) }
}
