import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('BG-02 explica el recorrido y distingue acceso real de campañas y pagos simulados', () => {
  const source = readFileSync(new URL('../src/features/public/how-it-works/HowItWorksPage.tsx', import.meta.url), 'utf8')
  for (const step of ['Descubre proyectos', 'Conoce la campaña', 'Apoya una iniciativa', 'Acompaña el avance', 'Consulta los resultados']) assert.ok(source.includes(step))
  assert.ok(source.includes('Los objetivos publicados no equivalen a resultados ya alcanzados'))
  assert.ok(source.includes('están conectados a la base de pruebas'))
  assert.ok(source.includes('no recibe aportes ni procesa pagos'))
  assert.ok(!source.includes('ni crea sesiones reales'))
})

test('BG-03 explica modalidades y revisión sin prometer publicación ni verificación automática', () => {
  const source = readFileSync(new URL('../src/features/public/for-creators/ForCreatorsPage.tsx', import.meta.url), 'utf8')
  for (const text of ['Donación', 'Recompensa', 'Preventa', 'verificación y revisión', 'reglas de aprobación se confirmarán', '/registro?perfil=creador', '/iniciar-sesion']) assert.ok(source.includes(text))
})
