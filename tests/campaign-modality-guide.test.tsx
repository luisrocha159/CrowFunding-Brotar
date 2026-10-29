import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { CampaignModalityGuide } from '../src/features/campaigns/CampaignModalityGuide'
import type { Modality } from '../src/features/campaigns/campaignsClient'

const render = (campaignType: Modality['campaignType'], rewardCount: number) => renderToStaticMarkup(<CampaignModalityGuide modality={{ campaignType, rewardCount, rewardsApply: campaignType !== 'DONATION', fundingModel: null }} />)

test('modalidad: tres definiciones separadas, selección textual y estado vacío explicado', () => {
  const markup = render('REWARD', 0)
  assert.equal((markup.match(/<dt>/g) ?? []).length, 3)
  for (const title of ['Donación', 'Recompensa', 'Preventa']) assert.ok(markup.includes(title))
  assert.match(markup, /<dt>Recompensa<span[^>]*>Actual<\/span><\/dt>/)
  assert.equal((markup.match(/>Actual</g) ?? []).length, 1)
  assert.ok(markup.includes('Aún no hay recompensas guardadas.'))
  assert.ok(markup.includes('>0</span>'))
  assert.ok(markup.includes('role="status"'))
  assert.equal(markup.includes('<button'), false, 'Las tarjetas informan; no duplican el selector ni ejecutan cambios.')
})

test('modalidad: cantidades reales, preventa y recompensas conservadas en donación', () => {
  assert.ok(render('PRESALE', 2).includes('>2</span>'))
  assert.ok(render('PRESALE', 2).match(/<dt>Preventa<span[^>]*>Actual<\/span><\/dt>/))
  assert.ok(render('DONATION', 0).includes('Sin etapa de recompensas'))
  assert.ok(render('DONATION', 0).includes('esa etapa se omite.'))
  assert.ok(render('DONATION', 3).includes('se conservan, pero no se utilizan en donación.'))
  assert.ok(render('DONATION', 3).includes('>3</span>'))
})
