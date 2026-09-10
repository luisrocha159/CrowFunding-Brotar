import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LandingPage } from './LandingPage'

const ComponentPreview = import.meta.env.DEV ? lazy(() => import('../../../app/dev/ComponentPreview')) : null

export function HomePage() {
  const [params] = useSearchParams()
  if (ComponentPreview && params.get('vista') === 'componentes') {
    return <Suspense fallback={<p role="status">Cargando componentes…</p>}><ComponentPreview /></Suspense>
  }
  return <LandingPage />
}
