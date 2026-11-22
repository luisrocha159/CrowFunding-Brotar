import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { CreatorCampaignCard } from '../src/features/campaign-progress/CreatorDashboardPage'
import type { DashboardItem } from '../src/features/campaign-progress/creatorDashboardClient'

const campaign: DashboardItem = {
  id: 'huerto', title: 'Huerto comunitario', status: 'PUBLISHED', organizationId: null,
  organizationName: null, currencyCode: 'BOB', goalAmount: '500.00', amountRaised: '0.00',
  fundingPercent: '0', demoAmountRaised: '600.00', demoFundingPercent: '120', activityProgress: '35',
  updateCount: 2, pendingActivities: 1, pendingRewards: 0, pendingCases: 0, reportStatus: null,
  verificationStatus: 'APPROVED', legalStatus: null, representativeStatus: null,
}

function card(changes: Partial<DashboardItem> = {}) {
  return renderToStaticMarkup(<MemoryRouter><CreatorCampaignCard item={{ ...campaign, ...changes }} /></MemoryRouter>)
}

test('el avance conserva el porcentaje superior a la meta y separa los importes simulados y reales', () => {
  const html = card()
  assert.match(html, /<progress[^>]+aria-label="Financiamiento simulado de Huerto comunitario"[^>]+value="100"/)
  assert.match(html, /120 % de la meta de 500,00 BOB/)
  assert.match(html, /600,00 BOB/)
  assert.match(html, /Recaudación real · 0,00 BOB/)
  assert.match(html, /href="\/mis-campanas\/ciclo\/huerto"/)
})

test('una campaña sin meta conserva su recaudación, sin mostrar una barra de avance falsa', () => {
  const html = card({ goalAmount: null })
  assert.match(html, /Meta pendiente de definir/)
  assert.match(html, /600,00 BOB/)
  assert.doesNotMatch(html, /<progress/)
})
