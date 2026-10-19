import { useEffect, useState } from 'react'
import { Button, ButtonLink } from '../../shared/components/Button'
import { myRoles, type AssignedRole } from './organizationsClient'
import { useAccessPermissions } from '../access/session/accessPermissions'

export function AccountRoles() {
  const permissions = useAccessPermissions()
  const [roles, setRoles] = useState<AssignedRole[] | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void myRoles(controller.signal).then(result => { if (!controller.signal.aborted) setRoles(result) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [retry])
  return <section aria-label="Roles y organizaciones">
    <h3>Permisos vigentes</h3>
    {error ? <><p role="alert">No se pudieron consultar tus roles.</p><Button variant="secondary" onClick={() => { setError(false); setRoles(null); setRetry(value=>value+1) }}>Reintentar roles</Button></>
      : roles === null ? <p role="status">Consultando roles…</p> : roles.length ? <ul>{roles.map(role=><li key={role.code}>{role.name}</li>)}</ul> : <p>No tienes roles vigentes asignados. Consulta al equipo responsable; no puedes asignártelos desde aquí.</p>}
    {!error && roles?.some(role=>role.code==='REGISTERED_USER') && <p><ButtonLink to="/mis-organizaciones">Organizaciones en borrador</ButtonLink></p>}
    {!error && roles?.some(role=>role.code==='CREATOR') && <p><ButtonLink to="/mis-proyectos">Mis proyectos</ButtonLink></p>}
    {!error && permissions.can('campaign.review.read') && <p><ButtonLink to="/administracion/campanas">Revisión de campañas</ButtonLink></p>}
    {!error && permissions.can('creator.provision') && <p><ButtonLink to="/administracion/usuarios">Habilitar creadores · provisional</ButtonLink></p>}
    {permissions.error && <p role="alert">No se pudieron consultar los permisos efectivos. Recarga para reintentar.</p>}
    {permissions.access?.readOnly && <p>Auditor: los accesos son de solo lectura, aunque tengas otros roles.</p>}
    <p>Registrar una organización es opcional y no concede permisos de administrador ni verifica a la empresa.</p>
  </section>
}
