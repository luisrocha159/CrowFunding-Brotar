import assert from 'node:assert/strict'
import { test } from 'node:test'
import { needsBackConfirmation, validateStoryInput } from '../src/features/campaigns/campaignsClient'
test('volver: una sección incompleta ofrece descarte explícito; no obliga a completar pasos futuros ni omite la validación al avanzar', () => {
  const errors = validateStoryInput({ problem: '',solution: '',beneficiaries: '',expectedResults: '' },[])
  assert.ok(Object.keys(errors).length > 0)
  assert.equal(needsBackConfirmation(2,1,errors),true)
  assert.equal(needsBackConfirmation(2,3,errors),false,'El avance conserva su validación ordinaria; no es un descarte.')
  assert.equal(needsBackConfirmation(2,1,{}),false,'Si es válido se conserva el guardado normal antes de volver.')
})
