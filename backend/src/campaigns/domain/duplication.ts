/** Evidencia del MVP: reglas explicables, no probabilidades ni identidad verificada. */
export interface CampaignIdentity {
  id: string; title: string; summary: string; status: string; submittedAt: string | null
  country: string; locality: string; address: string
  problem: string; solution: string; beneficiaries: string; results: string
  goal: string | null; currency: string
  activities: { name: string; start: string; end: string }[]
  initiativeId?: string | null; stageId?: string | null; initiativePurpose?: string; siteReference?: string
  budget: { description: string; quantity: string; price: string | null; amount: string }[]
}
export interface DuplicateMatch { id: string; title: string; status: string; kind: 'COPY' | 'POSSIBLE'; reasons: string[] }
export interface DuplicateReport { matches: DuplicateMatch[]; reviewToken: string | null }
export interface DuplicateReviewInput { token: string; reason: string }

export function identityText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/n\u0303/g, 'ñ').replace(/\p{M}/gu, '')
    .normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Solapamiento de palabras, solo para avisos. No expresa probabilidad de duplicidad. */
export function wordOverlap(left: string, right: string): number {
  const a = new Set(identityText(left).split(' ').filter(word => word.length > 2))
  const b = new Set(identityText(right).split(' ').filter(word => word.length > 2))
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter(word => b.has(word)).length
  return intersection / (a.size + b.size - intersection)
}

function sameText(a: string, b: string) { return Boolean(identityText(a)) && identityText(a) === identityText(b) }
function money(value: string | null) { return value === null ? '' : Number(value).toFixed(2) }
function budgetKey(value: CampaignIdentity) {
  return JSON.stringify(value.budget.map(item => [identityText(item.description), money(item.quantity), money(item.price), money(item.amount)]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
}
function activityKey(value: CampaignIdentity) { return JSON.stringify(value.activities.map(item => identityText(item.name)).sort()) }
function period(value: CampaignIdentity) {
  const starts = value.activities.map(item => item.start).filter(Boolean).sort()
  const ends = value.activities.map(item => item.end).filter(Boolean).sort()
  return starts.length && ends.length ? { start: starts[0]!, end: ends.at(-1)! } : null
}

/** Evidencia orientativa: COPY significa coincidencia fuerte, nunca una prohibición. */
export function compareCampaigns(a: CampaignIdentity, b: CampaignIdentity): DuplicateMatch | null {
  if (a.id === b.id) return null
  if (a.stageId && a.stageId === b.stageId) return { id: b.id, title: b.title, status: b.status, kind: 'COPY', reasons: ['Misma iniciativa y etapa declaradas en datos anteriores: comprobar su alcance durante la revisión'] }
  const stories = ['problem', 'solution', 'beneficiaries', 'results'] as const
  const exactStory = stories.every(key => identityText(a[key]).length >= 20 && sameText(a[key], b[key]))
  const samePlace = sameText(a.country, b.country) && sameText(a.locality, b.locality)
  const differentAddress = Boolean(a.address.trim() && b.address.trim()) && !sameText(a.address, b.address)
  const sameFunding = a.goal !== null && b.goal !== null && money(a.goal) === money(b.goal) && sameText(a.currency, b.currency)
  const sameBudget = Boolean(a.budget.length && b.budget.length) && budgetKey(a) === budgetKey(b)
  const x = period(a), y = period(b)
  const overlapping = Boolean(x && y && x.start <= y.end && y.start <= x.end)
  const sameActivities = Boolean(a.activities.length && b.activities.length) && activityKey(a) === activityKey(b)
  const copy = samePlace && !differentAddress && exactStory && sameFunding && sameBudget && overlapping && sameActivities
  // Umbrales heurísticos para ampliar la revisión, nunca para bloquear por similitud.
  const similarPurpose = wordOverlap(a.solution, b.solution) >= 0.5 && wordOverlap(a.beneficiaries, b.beneficiaries) >= 0.5
    && wordOverlap(a.results, b.results) >= 0.5
  const sameInitiative = Boolean(a.initiativeId && a.initiativeId === b.initiativeId)
  const similarIdentity = samePlace && wordOverlap(a.initiativePurpose ?? '', b.initiativePurpose ?? '') >= 0.6
    && wordOverlap(a.siteReference ?? '', b.siteReference ?? '') >= 0.6
  const possible = sameInitiative || similarIdentity || exactStory || (samePlace && similarPurpose && (sameFunding || sameBudget || overlapping))
  if (!copy && !possible) return null
  const reasons: string[] = []
  if (sameInitiative) reasons.push('Misma iniciativa declarada, etapas distintas: comprobar objetivo y ausencia de doble financiación')
  if (similarIdentity) reasons.push('Propósito y referencia de ejecución semejantes en las identidades declaradas')
  if (samePlace) reasons.push('Mismo país y localidad')
  if (differentAddress) reasons.push('Direcciones diferentes: comprobar que son lugares de ejecución distintos')
  if (exactStory) reasons.push('Problema, solución, beneficiarios y resultados coincidentes')
  else if (similarPurpose) reasons.push('Propósito, beneficiarios y resultados con palabras semejantes')
  if (sameFunding) reasons.push('Misma meta y moneda')
  if (sameBudget) reasons.push('Mismas partidas, cantidades e importes (sin depender de su orden)')
  if (overlapping) reasons.push('Periodos de ejecución superpuestos')
  else if (x && y) reasons.push('Periodos distintos: comprobar si corresponde a una nueva etapa')
  if (sameActivities) reasons.push('Mismas actividades (sin depender de su orden ni del responsable)')
  return { id: b.id, title: b.title, status: b.status, kind: copy ? 'COPY' : 'POSSIBLE', reasons }
}

/** Referencias ya enviadas; un borrador privado no reserva una causa para su autor. */
export function eligibleReference(subject: CampaignIdentity, candidate: CampaignIdentity): boolean {
  if (subject.id === candidate.id || ['DRAFT', 'REJECTED', 'CANCELLED'].includes(candidate.status)) return false
  // Si llegaron copias antiguas a revisión, conserva la prioridad de la primera entrega.
  if (['IN_REVIEW', 'PENDING_VERIFICATION', 'CHANGES_REQUESTED'].includes(candidate.status)
    && !['DRAFT', 'CHANGES_REQUESTED'].includes(subject.status) && subject.submittedAt) {
    return candidate.submittedAt !== null && (candidate.submittedAt < subject.submittedAt
      || (candidate.submittedAt === subject.submittedAt && candidate.id < subject.id))
  }
  return true
}
