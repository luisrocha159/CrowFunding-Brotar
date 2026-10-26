import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { changeResponsibility, staffRoles } from '../src/features/organizations/creatorAdministrationClient'
import { StaffResponsibilitiesForm } from '../src/features/organizations/StaffResponsibilitiesForm'

test('responsabilidades cliente: confirmación, identidad y respuesta coincidente, sin éxito inventado', async () => {
  await changeResponsibility('target', 'FINANCE', 'GRANT', ' Motivo del ensayo ', undefined, async (url, options) => {
    assert.equal(String(url), '/api/admin/users/target/responsibilities')
    assert.deepEqual(JSON.parse(String(options?.body)), { role: 'FINANCE', operation: 'GRANT', reason: 'Motivo del ensayo', confirmed: true })
    return Response.json({ id: 'target', role: 'FINANCE', operation: 'GRANT', changed: true })
  })
  for (const value of [{}, { id: 'other', role: 'FINANCE', operation: 'GRANT', changed: true }, { id: 'target', role: 'ADMIN', operation: 'GRANT', changed: true }]) {
    await assert.rejects(changeResponsibility('target', 'FINANCE', 'GRANT', 'Motivo del ensayo', undefined, async () => Response.json(value)))
  }
})
test('responsabilidades interfaz: motivo, controles nativos, opciones cerradas, efecto AUDITOR y carga', () => {
  const html = renderToStaticMarkup(<StaffResponsibilitiesForm user={{ id: 'target', email: 'test@example.invalid', name: 'Ensayo', status: 'ACTIVE', locked: false, roles: [], canEnableCreator: false, provisional: true }} busy change={async () => {}} />)
  for (const role of staffRoles) assert.ok(html.includes(`value="${role}"`))
  for (const text of ['disabled', 'required', 'minLength="10"', 'maxLength="500"', 'Conceder', 'Revocar conservando historial', 'Confirmo conceder']) assert.ok(html.includes(text), text)
  assert.equal(html.includes('value="ADMIN"'), false)
})
