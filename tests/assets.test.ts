import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const asset = (name: string) => readFileSync(new URL(`../src/shared/assets/${name}`, import.meta.url))

describe('Recursos locales de la entrega', () => {
  it('conserva los originales PNG del logo y la imagen de referencia', () => {
    for (const name of ['brotar-logo', 'proyecto-reforestacion']) {
      assert.deepEqual([...asset(`${name}.png`).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    }
  })
  it('sirve versiones WebP válidas con un presupuesto de peso reducido', () => {
    for (const [name, maxBytes] of [['brotar-logo', 20000], ['proyecto-reforestacion', 350000]] as const) {
      const data = asset(`${name}.webp`)
      assert.equal(data.toString('ascii', 0, 4), 'RIFF')
      assert.equal(data.toString('ascii', 8, 12), 'WEBP')
      assert.ok(data.length < maxBytes)
      assert.ok(data.length < asset(`${name}.png`).length)
    }
  })
  it('conserva la atribución de origen IA en el recurso de referencia', () => {
    assert.ok(asset('proyecto-reforestacion.webp').includes(Buffer.from('Made with Google AI')))
  })
  it('incluye las cinco portadas generadas como WebP locales ligeros', () => {
    for (const name of ['huertos', 'textiles', 'biblioteca', 'agua', 'cacao']) {
      const data = asset(`campaigns/${name}.webp`)
      assert.equal(data.toString('ascii', 0, 4), 'RIFF')
      assert.equal(data.toString('ascii', 8, 12), 'WEBP')
      assert.ok(data.length > 10000 && data.length < 280000, `${name}: presupuesto de imagen`)
    }
  })
})
