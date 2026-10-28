import { NavLink } from 'react-router-dom'
import styles from './projects.module.css'
import { useAccessPermissions } from '../access/session/accessPermissions'

export function AdministrativeNavigation() {
  const { can,error,access } = useAccessPermissions()
  return <aside className={styles.sidebar}><h2>Administración</h2>
    {can('dashboard.read') && <NavLink to="/administracion">Resumen administrativo</NavLink>}
    {can('catalog.read') && <NavLink to="/administracion/catalogos">Catálogos</NavLink>}
    {can('parties.read') && <NavLink to="/administracion/personas">Personas y organizaciones</NavLink>}
    {can('campaign.review.read') && <NavLink to="/administracion/campanas">Panel de revisión</NavLink>}
    {can('verification.read') && <NavLink to="/administracion/verificaciones">Verificación KYC/KYB DEMO</NavLink>}
    {can('creator.provision') && <NavLink to="/administracion/usuarios">Creadores y responsabilidades</NavLink>}
    {can('finance.read') && <NavLink to="/administracion/finanzas">Operaciones financieras</NavLink>}
    {can('finance.read') && <NavLink to="/administracion/conciliacion">Conciliación DEMO</NavLink>}
    {can('finance.read') && <NavLink to="/administracion/devoluciones">Devoluciones DEMO</NavLink>}
    {can('campaign.lifecycle.read') && <NavLink to="/administracion/ciclo-campanas">Ciclo de campañas DEMO</NavLink>}
    {can('campaign.closure.read') && <NavLink to="/administracion/cierre-campanas">Preparar cierres DEMO</NavLink>}
    {can('campaign.lifecycle.read') && <NavLink to="/administracion/rendicion">Rendición y remanentes DEMO</NavLink>}
    {can('finance.read') && <NavLink to="/administracion/desembolsos">Desembolsos DEMO</NavLink>}
    {can('support.read') && <NavLink to="/administracion/disputas">Disputas DEMO</NavLink>}
    {can('support.read') && <NavLink to="/administracion/soporte">Bandeja de soporte</NavLink>}
    {can('audit.read') && <NavLink to="/administracion/auditoria">Auditoría del sistema</NavLink>}
    {error && <p role="alert">No se pudieron consultar tus permisos. Recarga para reintentar.</p>}
    {access?.readOnly && <p>Auditoría: acceso de solo lectura.</p>}
    <NavLink to="/mi-cuenta">Mi cuenta y perfil</NavLink>
    <p>Habilitar CREATOR no acredita identidad ni KYC, ni concede permisos para mover dinero.</p>
  </aside>
}
