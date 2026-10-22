import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PhoneFields } from '../src/shared/components/PhoneFields'
test('teléfono: Bolivia tiene selector explícito, no un campo libre ambiguo; otro país conserva prefijo editable', () => {
  const normal = renderToStaticMarkup(<PhoneFields idPrefix="test" value={{ phoneCountryCode: '+591', phoneNumber: '71234567' }} onChange={() => {}} />)
  assert.ok(normal.includes('Bolivia (+591)')); assert.ok(normal.includes('Número nacional')); assert.ok(normal.includes('tel-national'))
  assert.ok(!normal.includes('customPrefix'))
  const other = renderToStaticMarkup(<PhoneFields idPrefix="test" value={{ phoneCountryCode: '+34', phoneNumber: '612345678' }} onChange={() => {}} />)
  assert.ok(other.includes('customPrefix')); assert.ok(other.includes('value="+34"')); assert.ok(other.includes('Otro país'))
})
