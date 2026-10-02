// Ensayo visual independiente, no se importa desde la aplicación ni se empaqueta en dist.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom'
import { ProjectsPage } from '../src/features/campaigns/ProjectsPage'
import '../src/shared/styles/global.css'
import type { ProjectSummary } from '../src/features/campaigns/projectsClient'

const draft: ProjectSummary = { id: '11111111-1111-4111-8111-111111111111', title: 'Reforestación del bosque seco chiquitano', summary: 'Recuperar áreas afectadas y apoyar a la comunidad.', status: 'DRAFT', categoryName: 'Conservación', goalAmount: '150000.00', currencyCode: 'BOB', creatorName: 'Creador de prueba', updatedAt: '2026-10-01T12:00:00Z', submittedAt: null }
let discarded = false
const parameters = new URLSearchParams(window.location.search)
const mode = parameters.get('case') ?? 'normal'
globalThis.fetch = async (url, options) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (mode === 'error') return new Response('', { status: 503 })
  if (mode === 'forbidden') return new Response('', { status: 403 })
  const path = String(url)
  if (path.endsWith('/discard')) { discarded = true; return new Response(null, { status: 204 }) }
  const inReview = { ...draft, status: 'IN_REVIEW', submittedAt: draft.updatedAt }
  if (path.endsWith(draft.id)) return Response.json({ ...(path.includes('/admin/') ? inReview : draft), location: { locality: 'Chiquitanía', countryCode: 'BO' }, story: { problem: 'Bosque afectado', solution: 'Restauración participativa', beneficiaries: 'Comunidades locales', expectedResults: 'Recuperación de áreas' }, history: [{ fromStatus: null, toStatus: 'DRAFT', changedAt: draft.updatedAt, reason: null }] })
  if (mode === 'empty') return Response.json([])
  const own = [draft, { ...draft, id: '22222222-2222-4222-8222-222222222222', title: 'Educación comunitaria con un título largo que permite comprobar la adaptación del contenido en pantallas pequeñas', status: 'APPROVED', categoryName: 'Educación', goalAmount: null, currencyCode: null }]
  return Response.json(path.includes('/admin/') ? [inReview] : discarded ? own.filter(item => item.id !== draft.id) : own)
}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[parameters.get('view') === 'admin' ? '/tests/visual-projects.html/admin' : '/tests/visual-projects.html']}>
  <div className="page-container"><p role="status"><strong>ENSAYO VISUAL · Datos ficticios · No escribe en PostgreSQL</strong></p><nav aria-label="Escenarios de ensayo"><Link to="/tests/visual-projects.html">Mis proyectos</Link>{' · '}<Link to="/tests/visual-projects.html/admin">Revisión administrativa</Link>{' · '}{(['normal', 'empty', 'error', 'forbidden'] as const).map(value => <button key={value} onClick={() => { parameters.set('case', value); window.location.search = parameters.toString() }}>{value}</button>)}</nav>
    <div style={{ marginTop: 80 }}><Routes><Route path="/tests/visual-projects.html" element={<ProjectsPage />} /><Route path="/tests/visual-projects.html/admin" element={<ProjectsPage admin />} /><Route path="/mis-proyectos" element={<ProjectsPage />} /><Route path="/administracion/campanas" element={<ProjectsPage admin />} /><Route path="/mis-proyectos/:id" element={<ProjectsPage />} /><Route path="/administracion/campanas/:id" element={<ProjectsPage admin />} /></Routes></div>
  </div>
</MemoryRouter>)
