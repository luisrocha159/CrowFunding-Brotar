import { Button, ButtonLink } from '../../../shared/components/Button'
import { useAccessPermissions } from './accessPermissions'

export function AccountAdministrationAccess() {
  const permissions = useAccessPermissions()
  if (permissions.error) return <p role="alert">No se pudo comprobar el acceso administrativo. <Button variant="secondary" onClick={permissions.refresh}>Reintentar permisos</Button></p>
  if (!permissions.can('dashboard.read')) return null
  return <p><ButtonLink to="/administracion">Administración</ButtonLink></p>
}
