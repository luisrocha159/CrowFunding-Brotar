import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FormField } from '../src/shared/components/FormField'

test('FormField conserva el control hijo sin anidar hijos dentro de input', () => {
  for (const tag of ['input', 'textarea', 'select']) {
    const html = renderToStaticMarkup(createElement(FormField, { label: 'Nombre', id: 'nombre', error: 'Requerido' },
      createElement(tag, { id: 'nombre', defaultValue: tag === 'select' ? undefined : 'Prueba' })))
    assert.match(html, new RegExp(`<${tag}[^>]*id="nombre"`))
    assert.match(html, /aria-invalid="true"/)
    assert.equal((html.match(/id="nombre"/g) ?? []).length, 1)
  }
})
