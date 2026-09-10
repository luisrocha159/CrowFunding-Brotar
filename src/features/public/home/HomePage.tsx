import { Link } from 'react-router-dom'
import { PhasePlaceholder } from '../../../shared/components/PhasePlaceholder'

const pages = [
  ['/como-funciona', '02', 'Cómo funciona'],
  ['/para-creadores', '03', 'Para creadores'],
  ['/explorar', '04', 'Explorar proyectos'],
  ['/explorar/buscar', '05', 'Búsqueda y filtros'],
  ['/proyectos/proyecto-demo', '06', 'Detalle público del proyecto'],
  ['/iniciar-sesion', '07', 'Iniciar sesión'],
  ['/registro', '08', 'Crear cuenta'],
  ['/recuperar-contrasena', '09', 'Recuperar contraseña']
] as const

export function HomePage() {
  return <>
    <PhasePlaceholder title="Brotar comienza aquí" description="La base del frontend público está lista para construir las pantallas y conectar los datos simulados." />
    <section className="route-section" aria-labelledby="routes-title">
      <h2 id="routes-title">Recorrido público</h2>
      <p>Accesos de comprobación de las rutas. Esta página inicial es provisional.</p>
      <div className="route-grid">{pages.map(([to, number, label]) => <Link className="route-card" to={to} key={to}><span>{number}</span><strong>{label}</strong><span aria-hidden="true">→</span></Link>)}</div>
    </section>
  </>
}
