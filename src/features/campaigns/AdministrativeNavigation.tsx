import { NavLink } from 'react-router-dom'
import styles from './projects.module.css'
import { useAccessPermissions } from '../access/session/accessPermissions'

export function AdministrativeNavigation() {
  const { can,error,access } = useAccessPermissions()
  return <aside className={styles.sidebar}><h2>Administración</h2>
    {can('campaign.review.read') && <NavLink to="/administracion/campanas">Panel de revisión</NavLink>}
    {can('creator.provision') && <NavLink to="/administracion/usuarios">Usuarios · habilitación provisional</NavLink>}
    {error && <p role="alert">No se pudieron consultar tus permisos. Recarga para reintentar.</p>}
    {access?.readOnly && <p>Auditoría: acceso de solo lectura.</p>}
    <NavLink to="/mi-cuenta">Mi cuenta y perfil</NavLink>
    <p>Habilitar CREATOR no acredita identidad ni KYC. No incluye operaciones financieras.</p>
  </aside>
}
