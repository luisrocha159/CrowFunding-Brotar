import { NavLink } from 'react-router-dom'
import styles from './projects.module.css'

export function AdministrativeNavigation() {
  return <aside className={styles.sidebar}><h2>Administración</h2>
    <NavLink to="/administracion/campanas">Panel de revisión</NavLink>
    <NavLink to="/administracion/usuarios">Usuarios · habilitación provisional</NavLink>
    <NavLink to="/mi-cuenta">Mi cuenta y perfil</NavLink>
    <p>Habilitar CREATOR no acredita identidad ni KYC. No incluye operaciones financieras.</p>
  </aside>
}
