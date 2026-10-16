import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Message } from '../src/shared/components/Feedback'
test('avisos: admiten párrafos, listas y acciones sin anidar bloques dentro de un párrafo', () => {
  const markup = renderToStaticMarkup(<Message tone="error" title="Revisar"><p>Detalle del error</p><ul><li>Campo obligatorio</li></ul><div><button>Reintentar</button></div></Message>)
  assert.ok(markup.includes('role="alert"')); assert.ok(markup.includes('Detalle del error')); assert.ok(markup.includes('Reintentar'))
  assert.ok(!/<p[^>]*>\s*<(p|ul|div)\b/.test(markup))
  assert.ok(renderToStaticMarkup(<Message title="Guardado">Texto sencillo</Message>).includes('Texto sencillo'))
})
