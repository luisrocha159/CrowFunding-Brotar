import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getFundingGapCents } from '../src/shared/utils/funding-gap'

describe('Importe restante para la meta de una campaña, en centavos', () => {
  it('resta un aporte parcial: 1000.00 - 250.50 = 749.50', () => {
    assert.equal(getFundingGapCents(100000n, 25050n), 74950n)
  })
  it('conserva toda la meta si no se ha recaudado', () => {
    assert.equal(getFundingGapCents(100000n, 0n), 100000n)
  })
  it('devuelve cero cuando se alcanza exactamente la meta', () => {
    assert.equal(getFundingGapCents(100000n, 100000n), 0n)
  })
  it('devuelve cero en una campaña sobrefinanciada', () => {
    assert.equal(getFundingGapCents(100000n, 125000n), 0n)
  })
  it('conserva la precisión de un centavo pendiente', () => {
    assert.equal(getFundingGapCents(100000n, 99999n), 1n)
  })
  it('admite una meta mínima de un centavo', () => {
    assert.equal(getFundingGapCents(1n, 0n), 1n)
  })
  it('rechaza una meta cero', () => {
    assert.throws(() => getFundingGapCents(0n, 0n), RangeError)
  })
  it('rechaza una meta negativa', () => {
    assert.throws(() => getFundingGapCents(-100n, 0n), RangeError)
  })
  it('rechaza una recaudación negativa', () => {
    assert.throws(() => getFundingGapCents(100000n, -1n), RangeError)
  })
  it('mantiene exactitud por encima del entero seguro de Number', () => {
    assert.equal(getFundingGapCents(90071992547409931234n, 90071992547409931233n), 1n)
  })
})
