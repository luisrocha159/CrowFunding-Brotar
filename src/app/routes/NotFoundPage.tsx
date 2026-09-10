import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <section><p className="eyebrow">404</p><h1>Página no encontrada</h1><p>La dirección que buscas no está disponible.</p><Link to="/">Volver al inicio</Link></section>
}
