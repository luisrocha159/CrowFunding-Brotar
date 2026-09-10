import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/explorar', label: 'Explorar' },
  { to: '/como-funciona', label: 'Cómo funciona' },
  { to: '/para-creadores', label: 'Para creadores' },
  { to: '/iniciar-sesion', label: 'Iniciar sesión' }
]

export function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label="Brotar, inicio">Brotar</NavLink>
        <nav aria-label="Navegación principal">
          {navigation.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        </nav>
      </header>
      <main id="contenido" className="page-container"><Outlet /></main>
      <footer className="site-footer">Brotar · Impacto social, ambiental y productivo</footer>
    </>
  )
}
