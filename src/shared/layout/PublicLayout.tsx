import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { ButtonLink } from '../components/Button'
import styles from './layout.module.css'

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/explorar', label: 'Explorar proyectos' },
  { to: '/como-funciona', label: 'Cómo funciona' },
  { to: '/para-creadores', label: 'Para creadores' }
]

function PublicNavigation() {
  return <>{navigation.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</>
}

export function PublicLayout() {
  const menu = useRef<HTMLDetailsElement>(null)
  const main = useRef<HTMLElement>(null)
  const previousLocation = useRef('')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (menu.current) menu.current.open = false
    if (previousLocation.current && previousLocation.current !== location.key) {
      main.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
    previousLocation.current = location.key
    const heading = main.current?.querySelector('h1')?.textContent
    document.title = heading ? `${heading} | Brotar` : 'Brotar'
  }, [location.key])

  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="Navegación principal"><PublicNavigation /></nav>
        <div className={styles.actions}>
          <form className={styles.search} role="search" onSubmit={(event) => {
            event.preventDefault()
            const query = new FormData(event.currentTarget).get('q')?.toString().trim() ?? ''
            navigate(`/explorar/buscar${query ? `?q=${encodeURIComponent(query)}` : ''}`)
          }}>
            <label className={styles.srOnly} htmlFor="header-search">Buscar proyectos</label>
            <input id="header-search" name="q" type="search" placeholder="Buscar proyectos" />
            <button type="submit" aria-label="Enviar búsqueda">→</button>
          </form>
          <Link className={styles.login} to="/iniciar-sesion">Iniciar sesión</Link>
          <ButtonLink to="/registro?perfil=creador">Crear proyecto</ButtonLink>
        </div>
        <details className={styles.mobileMenu} ref={menu} onKeyDown={(event) => {
          if (event.key === 'Escape' && menu.current) {
            menu.current.open = false
            menu.current.querySelector('summary')?.focus()
          }
        }}>
          <summary>Menú</summary>
          <nav aria-label="Navegación móvil"><PublicNavigation /><Link to="/explorar/buscar">Buscar proyectos</Link><Link to="/iniciar-sesion">Iniciar sesión</Link><ButtonLink to="/registro?perfil=creador">Crear proyecto</ButtonLink></nav>
        </details>
      </div>
    </header>
    <main id="contenido" className="page-container" tabIndex={-1} ref={main}><Outlet /></main>
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div><Brand inverse /><p className={styles.footerIntro}>Plataforma boliviana de crowdfunding para proyectos con impacto social, ambiental y productivo.</p></div>
        <nav aria-label="Plataforma"><h2>Plataforma</h2><Link to="/explorar">Explorar proyectos</Link><Link to="/como-funciona">Cómo funciona</Link><Link to="/para-creadores">Para creadores</Link></nav>
        <nav aria-label="Cuenta"><h2>Tu cuenta</h2><Link to="/iniciar-sesion">Iniciar sesión</Link><Link to="/registro">Crear una cuenta</Link><Link to="/recuperar-contrasena">Recuperar acceso</Link></nav>
        <div><h2>Crezcamos juntos</h2><p>Cada iniciativa es una oportunidad para transformar nuestro entorno.</p><Link to="/para-creadores">Conoce cómo empezar →</Link></div>
      </div>
      <div className={styles.footerBottom}>© {new Date().getFullYear()} Brotar. Todos los derechos reservados.</div>
    </footer>
  </>
}
