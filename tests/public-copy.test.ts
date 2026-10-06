import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('BG-02 explica el recorrido y distingue campañas publicadas de pagos todavía no implementados', () => {
  const source = readFileSync(new URL('../src/features/public/how-it-works/HowItWorksPage.tsx', import.meta.url), 'utf8')
  for (const step of ['Descubre proyectos', 'Conoce la campaña', 'Apoya una iniciativa', 'Acompaña el avance', 'Consulta los resultados']) assert.ok(source.includes(step))
  assert.ok(source.includes('Los objetivos publicados no equivalen a resultados ya alcanzados'))
  assert.ok(source.includes('consulta sus datos desde la API'))
  assert.ok(source.includes('Esta etapa no procesa aportes ni pagos'))
  assert.ok(!source.includes('ni crea sesiones reales'))
})

test('BG-03 explica modalidades y revisión sin prometer publicación ni verificación automática', () => {
  const source = readFileSync(new URL('../src/features/public/for-creators/ForCreatorsPage.tsx', import.meta.url), 'utf8')
  for (const text of ['Donación', 'Recompensa', 'Preventa', 'verificación y revisión', 'reglas de aprobación se confirmarán', 'CreatorAccessActions']) assert.ok(source.includes(text))
  assert.ok(!source.includes('El editor y el panel privado del creador no forman parte de esta entrega'))
})
