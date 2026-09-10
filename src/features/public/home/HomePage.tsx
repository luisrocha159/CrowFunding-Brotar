import { lazy, Suspense } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PhasePlaceholder } from '../../../shared/components/PhasePlaceholder'

const ComponentPreview = import.meta.env.DEV ? lazy(() => import('../../../app/dev/ComponentPreview')) : null

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
  const [params] = useSearchParams()
  if (ComponentPreview && params.get('vista') === 'componentes') {
    return <Suspense fallback={<p role="status">Cargando componentes…</p>}><ComponentPreview /></Suspense>
  }
  return <>
    <PhasePlaceholder title="Brotar comienza aquí" description="La base del frontend público está lista para construir las pantallas y conectar los datos simulados." />
    {import.meta.env.DEV && <p><Link to="/?vista=componentes">Revisar componentes de la fase 2 →</Link></p>}
    <section className="route-section" aria-labelledby="routes-title">
      <h2 id="routes-title">Recorrido público</h2>
      <p>Accesos de comprobación de las rutas. Esta página inicial es provisional.</p>
      <div className="route-grid">{pages.map(([to, number, label]) => <Link className="route-card" to={to} key={to}><span>{number}</span><strong>{label}</strong><span aria-hidden="true">→</span></Link>)}</div>
    </section>
  </>
}
