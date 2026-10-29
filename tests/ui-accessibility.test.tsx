import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AccessShell } from '../src/features/access/AccessComponents'
import { CoverDraftEditor } from '../src/features/campaign-drafts/CoverDraftPage'
import { OrganizationInvitationsPage } from '../src/features/verifications/OrganizationInvitationsPage'
import { PublicationAdministrationPage } from '../src/features/campaign-progress/PublicationAdministrationPage'
import { EmptyState, ErrorState } from '../src/shared/components/Feedback'
import {supportCategoryLabel} from '../src/features/support-cases/supportClient'
import { noticeBody } from '../src/features/access/session/contactClient'
import { FormField } from '../src/shared/components/FormField'

test('QA: las páginas dentro del layout no crean otro landmark principal', () => {
  for (const page of [<OrganizationInvitationsPage />, <PublicationAdministrationPage />]) {
    const html = renderToStaticMarkup(<MemoryRouter><main>{page}</main></MemoryRouter>)
    assert.equal((html.match(/<main[\s>]/g) ?? []).length, 1)
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1)
  }
})

test('QA: la portada embebida no compite con el título principal del asistente', () => {
  const html = renderToStaticMarkup(<MemoryRouter><main><h1>Crear campaña</h1><h2>Mi borrador</h2><CoverDraftEditor embedded campaignId="00000000-0000-4000-8000-000000000001" /></main></MemoryRouter>)
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1)
  assert.match(html, /<h3>Portada del borrador<\/h3>/)
  const standalone = renderToStaticMarkup(<MemoryRouter><CoverDraftEditor campaignId="00000000-0000-4000-8000-000000000001" /></MemoryRouter>)
  assert.match(standalone, /<h1>Portada del borrador<\/h1>/)
})

test('QA: estados vacíos y de error no saltan del encabezado principal al tercer nivel', () => {
  const html = renderToStaticMarkup(<><h1>Campaña</h1><EmptyState title="Sin registros" description="Todavía no hay datos." /><ErrorState /></>)
  assert.match(html, /<h2>Sin registros<\/h2>/)
  assert.doesNotMatch(html, /<h3/)
})

test('QA: el aviso genérico de acceso no niega las sesiones o correos conectados', () => {
  const html = renderToStaticMarkup(<AccessShell centered title="Comprobando tu sesión" subtitle="Espera al servidor."><p>Consultando…</p></AccessShell>)
  assert.match(html, /La cuenta y los permisos se comprueban con el servidor/)
  assert.doesNotMatch(html, /no inicia sesiones|no envía correos|no envia correos/)
})

test('QA: avisos históricos muestran estados conocidos en español sin alterar otros textos', () => {
  assert.equal(noticeBody('Estado registrado: DISPUTED. Consulta el detalle.'), 'Estado registrado: En disputa. Consulta el detalle.')
  assert.equal(noticeBody('Estado registrado: FUTURE_STATE. Consulta el detalle.'), 'Estado registrado: FUTURE_STATE. Consulta el detalle.')
  assert.equal(noticeBody('Mensaje que menciona DISPUTED.'), 'Mensaje que menciona DISPUTED.')
  assert.equal(supportCategoryLabel('INCORRECT_INFORMATION'), 'Información incorrecta')
  assert.equal(supportCategoryLabel(null), 'Sin categoría')
  assert.equal(supportCategoryLabel('FUTURE_CATEGORY'), 'FUTURE_CATEGORY')
})

test('QA: obligatoriedad nativa y asterisco visible sin añadir una etiqueta ARIA a un span genérico', () => {
  const html = renderToStaticMarkup(<FormField id="qa-name" label="Nombre" required />)
  assert.match(html, /<label[^>]*for="qa-name"/)
  assert.match(html, /<span aria-hidden="true"> \*<\/span>/)
  assert.match(html, /<input[^>]*required=""/)
  assert.doesNotMatch(html, /aria-label="obligatorio"/)
})
