import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import styles from './projects.module.css'
import { useAccessPermissions } from '../access/session/accessPermissions'

export function AdministrativeNavigation() {
  const { can,error,access } = useAccessPermissions()
  const menu = useRef<HTMLDetailsElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    const media = window.matchMedia('(min-width: 761px)')
    const adapt = () => { if (menu.current) menu.current.open = media.matches }
    adapt()
    media.addEventListener('change', adapt)
    return () => media.removeEventListener('change', adapt)
  }, [pathname])
  return <aside className={styles.sidebar}><details ref={menu} open className={styles.adminMenu} onKeyDown={event => {
    if (event.key === 'Escape' && menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus() }
  }}><summary><h2>Administración</h2><span>Ver secciones</span></summary><nav aria-label="Secciones de administración">
    {can('dashboard.read') && <NavLink end to="/administracion">Resumen administrativo</NavLink>}
    {can('catalog.read') && <NavLink to="/administracion/catalogos">Catálogos</NavLink>}
    {can('parties.read') && <NavLink to="/administracion/personas">Personas y organizaciones</NavLink>}
    {can('campaign.review.read') && <NavLink to="/administracion/publicaciones">Novedades publicadas</NavLink>}
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
  </nav></details></aside>
}
