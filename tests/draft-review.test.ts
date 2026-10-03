import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DraftReview } from '../src/features/campaigns/DraftReview'

test('revisión compuesta muestra metas guardadas sin publicar ni convertirlas en resultados', () => {
  const html = renderToStaticMarkup(createElement(DraftReview, {
    general: null, story: null,
    indicators: [{ name: 'Árboles', description: '', unit: 'unidades', baselineValue: null, targetValue: 50 }]
  }))
  assert.match(html, /meta 50 unidades/)
  assert.match(html, /No publica ni envía a aprobación/)
  assert.doesNotMatch(html, /<button|<form/)
})
