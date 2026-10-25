import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import type { ExecutionContext } from '@nestjs/common'
import { compareCampaigns, eligibleReference, identityText, wordOverlap, type CampaignIdentity } from '../src/campaigns/domain/duplication'
import { validateDuplicateReview, ReviewInvalid } from '../src/campaigns/domain/administrative-review'
import { DecisionDto, PublishDto } from '../src/campaigns/infrastructure/administrative-review.controller'
import { RegistrationLimitGuard } from '../src/users/infrastructure/http/registration-limit.guard'

const base: CampaignIdentity = {
  id: 'a', title: 'Plantación de árboles en Samaipata', summary: 'Restaurar el bosque con la comunidad local', status: 'DRAFT', submittedAt: null,
  country: 'BO', locality: 'Samaipata', address: 'Parcela comunitaria Las Palmas',
  problem: 'La erosión afecta las parcelas de las familias de Las Palmas',
  solution: 'Plantar árboles nativos y recuperar los suelos de Las Palmas',
  beneficiaries: 'Cuarenta familias agricultoras de la comunidad Las Palmas',
  results: 'Mil árboles nativos plantados en las parcelas comunitarias',
  goal: '20000.00', currency: 'BOB', activities: [{ name: 'Preparar terreno', start: '2027-01-01', end: '2027-01-10' }, { name: 'Plantar árboles nativos', start: '2027-01-11', end: '2027-01-20' }],
  budget: [{ description: 'Compra de plantines', quantity: '1000.00', price: '10.00', amount: '10000.00' }, { description: 'Transporte comunitario', quantity: '1.00', price: '500.00', amount: '500.00' }]
}
const reference: CampaignIdentity = { ...base, id: 'b', status: 'PUBLISHED', submittedAt: '2026-10-14 10:00:00+00' }

test('identidad: normaliza acentos, signos y espacios pero conserva la Ñ y los números', () => {
  assert.equal(identityText('  PLANTACIÓN—Árboles  2027! '), 'plantacion arboles 2027')
  assert.equal(identityText('CAÑA'), identityText('can\u0303a'))
  assert.notEqual(identityText('caña'), identityText('cana'))
  assert.equal(wordOverlap('', ''), 0)
})
test('copia entre cuentas: cambiar el encabezado no evita comparar el contenido y financiamiento', () => {
  const result = compareCampaigns({ ...base, title: 'Proyecto completamente renombrado', summary: 'Otro anuncio para la misma plantación' }, reference)
  assert.equal(result?.kind, 'COPY')
  assert.ok(result.reasons.includes('Misma meta y moneda'))
})
test('copia: reordenar partidas y actividades o cambiar solo signos/acentos no evita la identificación', () => {
  const result = compareCampaigns({ ...base, solution: base.solution.toUpperCase(), locality: 'SAMAIPATA',
    activities: [...base.activities].reverse(), budget: [...base.budget].reverse() }, reference)
  assert.equal(result?.kind, 'COPY')
})
test('copias y casos legítimos: conjunto etiquetado sintético de regresión, no entrenamiento ni exactitud de producción', () => {
  const cases: { name: string; patch: Partial<CampaignIdentity>; expected: 'COPY' | 'POSSIBLE' | null }[] = [
    { name: 'solo cambia título', patch: { title: 'Árboles del futuro' }, expected: 'COPY' },
    { name: 'otra localidad con la historia copiada', patch: { locality: 'Montero' }, expected: 'POSSIBLE' },
    { name: 'otro lugar específico', patch: { address: 'Parcela del colegio San José' }, expected: 'POSSIBLE' },
    { name: 'mismo contenido con distinta meta', patch: { goal: '21000.00' }, expected: 'POSSIBLE' },
    { name: 'cambio de moneda no es conversión verificada', patch: { currency: 'USD' }, expected: 'POSSIBLE' },
    { name: 'falta financiamiento', patch: { goal: null }, expected: 'POSSIBLE' },
    { name: 'faltan partidas', patch: { budget: [] }, expected: 'POSSIBLE' },
    { name: 'falta cronograma', patch: { activities: [] }, expected: 'POSSIBLE' },
    { name: 'periodo posterior puede ser otra etapa', patch: { activities: base.activities.map(a => ({ ...a, start: '2028-01-01', end: '2028-01-10' })) }, expected: 'POSSIBLE' },
    { name: 'mismo título y monto pero propósito distinto', patch: {
      problem: 'Ausencia de equipos informáticos en escuelas rurales', solution: 'Instalar un laboratorio informático para clases de programación',
      beneficiaries: 'Estudiantes adolescentes de secundaria del municipio', results: 'Veinte computadoras instaladas y docentes capacitados'
    }, expected: null },
    { name: 'misma localidad y monto sin historia suficiente', patch: { problem: '', solution: '', beneficiaries: '', results: '', title: 'Biblioteca municipal', summary: 'Lectura infantil para todos', budget: [] }, expected: null }
  ]
  for (const example of cases) assert.equal(compareCampaigns({ ...base, ...example.patch }, reference)?.kind ?? null, example.expected, example.name)
})
test('paráfrasis limitada: semejanza se deriva a revisión, nunca se vende como probabilidad ni bloqueo definitivo', () => {
  const candidate = { ...base, solution: base.solution + ' durante la primera temporada', beneficiaries: base.beneficiaries + ' beneficiadas directamente' }
  assert.equal(compareCampaigns(candidate, reference)?.kind, 'POSSIBLE')
})
test('no se compara una campaña contra sí misma y un borrador ajeno no reserva una causa', () => {
  assert.equal(compareCampaigns(base, base), null)
  for (const status of ['DRAFT', 'REJECTED', 'CANCELLED']) assert.equal(eligibleReference(base, { ...reference, status }), false)
  assert.equal(eligibleReference(base, reference), true)
  assert.equal(eligibleReference(base, { ...reference, status: 'CLOSED' }), true)
})
test('prioridad de entregas: las copias simultáneas/antiguas no bloquean a la primera campaña enviada', () => {
  const first = { ...reference, id: 'a', status: 'IN_REVIEW' }
  const second = { ...first, id: 'b' }
  assert.equal(eligibleReference(first, second), false)
  assert.equal(eligibleReference(second, first), true)
  assert.equal(eligibleReference({ ...second, submittedAt: '2026-10-15 10:00:00+00' }, first), true)
})
test('revisión: comentario de semejanzas opcional; si se envía, no acepta estructura inválida ni HTML', async () => {
  assert.equal(validateDuplicateReview(), undefined)
  const token = 'a'.repeat(64)
  assert.equal(validateDuplicateReview({ token, reason: ' Es una nueva etapa con otras parcelas y familias. ' })?.reason, 'Es una nueva etapa con otras parcelas y familias.')
  for (const input of [{ token: 'x', reason: 'Una etapa completamente nueva' }, { token, reason: 'Cambia' }, { token, reason: '<b>Justificación de campaña diferente</b>' }]) assert.throws(() => validateDuplicateReview(input), ReviewInvalid)
  for (const duplicateReview of [true, [], [{ token, reason: 'Una etapa completamente nueva' }], { token: 'x', reason: 'Una etapa completamente nueva' }, { token, reason: 'Una etapa completamente nueva', role: 'ADMIN' }]) {
    for (const [dto, input] of [[DecisionDto, { decision: 'APPROVED', comment: '', expectedRound: 1, observations: [] }], [PublishDto, { confirmed: true, expectedRound: 1 }]] as const) {
      assert.ok((await validate(plainToInstance<object, unknown>(dto, { ...input, duplicateReview }), { whitelist: true, forbidNonWhitelisted: true })).length)
    }
  }
})
test('protección local de frecuencia: IP real, 20 intentos por minuto incluso alternando cuentas', () => {
  const limiter = new RegistrationLimitGuard()
  let retry = ''
  const context = { switchToHttp: () => ({ getRequest: () => ({ ip: '192.0.2.44', headers: { 'x-forwarded-for': 'otra-ip' } }),
    getResponse: () => ({ setHeader: (_: string, value: string) => { retry = value } }) }) } as unknown as ExecutionContext
  for (let i = 0; i < 20; i++) assert.equal(limiter.canActivate(context), true)
  assert.throws(() => limiter.canActivate(context), error => (error as { getStatus(): number }).getStatus() === 429)
  assert.equal(retry, '60')
})
