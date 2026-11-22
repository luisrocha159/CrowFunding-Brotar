import { test } from 'node:test'
import assert from 'node:assert/strict'
import { money, LedgerInvalid, LedgerConflict, nextPaymentState } from '../backend/src/contributions/domain/payment'
import type { PaymentState, IncomingState } from '../backend/src/contributions/domain/payment'
import { getProgressPercentage } from '../src/shared/utils/project'

// Práctica 3: se prueban funciones existentes, sin base de datos ni red.
const validAmounts = [
  ['U1-01', '25.50', 2550n],
  ['U1-07', '0.01', 1n],
  ['U1-08', '999999999999.99', 99999999999999n],
] as const
for (const [id, value, expected] of validAmounts) {
  test(`${id} importe válido ${value}`, () => assert.equal(money(value), expected))
}
const invalidAmounts = [
  ['U1-02', '', 'vacío'],
  ['U1-03', '-5.00', 'negativo'],
  ['U1-04', '1000000000000.00', 'fuera de rango'],
  ['U1-05', '10,50', 'formato incorrecto'],
  ['U1-06', '0.00', 'cero'],
  ['U1-09', '1.001', 'más de dos decimales'],
] as const
for (const [id, value, label] of invalidAmounts) {
  test(`${id} rechaza importe ${label}`, () => assert.throws(() => money(value), LedgerInvalid))
}

// Fórmula de producción: round(max(0,recaudado)/meta*100).
const progressCases = [
  ['U2-01', 250, 1000, 25],
  ['U2-02', 0, 1000, 0],
  ['U2-03', 1000, 1000, 100],
  ['U2-04', 1250, 1000, 125],
  ['U2-05', 1, 3, 33],
  ['U2-06', 100, 0, 0],
] as const
for (const [id, raised, goal, expected] of progressCases) {
  test(`${id} porcentaje ${raised}/${goal} = ${expected}`, () => {
    assert.equal(getProgressPercentage({ raised, goal }), expected)
  })
}

const acceptedTransitions: readonly [string, PaymentState, IncomingState, PaymentState][] = [
  ['U3-01', 'INITIATED', 'PENDING', 'PENDING'],
  ['U3-02', 'PENDING', 'CONFIRMED', 'CONFIRMED'],
  ['U3-03', 'CONFIRMED', 'PENDING', 'CONFIRMED'],
  ['U3-04', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED'],
  ['U3-08', 'REFUNDED', 'CONFIRMED', 'REFUNDED'],
]
for (const [id, current, incoming, expected] of acceptedTransitions) {
  test(`${id} estado ${current} + ${incoming} = ${expected}`, () => {
    assert.equal(nextPaymentState(current, incoming), expected)
  })
}
test('U3-05 rechaza reactivar un pago fallido', () => {
  assert.throws(() => nextPaymentState('FAILED', 'PENDING'), LedgerConflict)
})
test('U3-06 rechaza confirmar un pago vencido', () => {
  assert.throws(() => nextPaymentState('EXPIRED', 'CONFIRMED'), LedgerConflict)
})
test('U3-07 rechaza un estado externo no admitido', () => {
  assert.throws(() => nextPaymentState('PENDING', 'REFUNDED' as IncomingState), LedgerInvalid)
})
