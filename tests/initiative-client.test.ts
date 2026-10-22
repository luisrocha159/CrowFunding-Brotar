import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initiativeStageFrom } from '../src/features/campaigns/identityClient'
import { SessionError } from '../src/shared/api/sessionError'

test('declaraciones históricas: el detalle administrativo valida texto y fechas antes de mostrarlos', () => {
  const stage = { id: 'stage', initiativeId: 'initiative', initiativeName: 'Bosque Ñandú', purpose: 'Restauración comunitaria.', siteReference: 'Parcela norte', countryCode: 'BO', locality: 'Samaipata', stageName: 'Primera restauración', objective: 'Plantar árboles nativos.', startsOn: '2027-01-01', endsOn: '2027-12-31' }
  assert.deepEqual(initiativeStageFrom(stage),stage)
  for (const invalid of [null,{}, { ...stage,purpose: 10 }, { ...stage,startsOn: '2027-02-30' }]) assert.throws(() => initiativeStageFrom(invalid), SessionError)
})
