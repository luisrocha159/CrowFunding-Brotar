import { useEffect, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { Message } from '../../shared/components/Feedback'
import { SessionError } from '../access/session/sessionClient'
import { readCoverDraft, coverImageUrl, type CoverDraft } from '../campaign-drafts/coverDraftClient'
import { readDraft, readGeneral, readStory, type Draft, type GeneralInput, type IndicatorInput, type StoryInput } from './campaignsClient'
import { budgetTotal, readBudget, readFunding, readPlan, readRewards, type BudgetInput, type FundingInput, type PlanInput, type RewardInput } from './sectionsClient'
import { readSubmission, submitCampaign, SubmissionIncompleteError, type SubmissionReport } from './submissionClient'

interface Props { id: string; onGoTo: (step: number) => void; onStatusChange: (status: string) => void }
interface Saved {
  draft: Draft
  general: GeneralInput
  story: StoryInput
  indicators: IndicatorInput[]
  cover: CoverDraft | null
  plan: PlanInput
  budget: BudgetInput
  funding: FundingInput
  rewards: RewardInput[]
  report: SubmissionReport
}

function observationStep(section: string): number {
  const key = section.toLowerCase()
  if (key.includes('reward') || key.includes('recomp')) return 6
  if (key.includes('fund') || key.includes('financ')) return 5
  if (key.includes('plan') || key.includes('budget') || key.includes('risk') || key.includes('presupuesto')) return 4
  if (key.includes('cover') || key.includes('portada')) return 3
  if (key.includes('story') || key.includes('impact') || key.includes('historia')) return 2
  return 1
}

/** Usa exclusivamente respuestas persistidas; el servidor calcula los faltantes. */
export function CampaignSubmissionPanel({ id, onGoTo, onStatusChange }: Props) {
  const [saved, setSaved] = useState<Saved | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  useEffect(() => {
    let mounted = true
    void Promise.all([readDraft(id), readGeneral(id), readStory(id), readCoverDraft(id), readPlan(id), readBudget(id), readFunding(id), readRewards(id), readSubmission(id)])
      .then(([draft, general, story, cover, plan, budget, funding, rewards, report]) => {
        if (mounted) setSaved({ draft, general, story: story.story, indicators: story.indicators, cover, plan, budget, funding, rewards, report })
      })
      .catch(() => { if (mounted) setError('No se pudo cargar la revisión. Reintenta al volver a este paso.') })
    return () => { mounted = false }
  }, [id])

  async function submit() {
    if (!saved || sending || saved.report.missing.length) return
    setSending(true); setError('')
    try {
      const report = await submitCampaign(id)
      setSaved({ ...saved, report }); onStatusChange(report.status)
    } catch (cause) {
      if (cause instanceof SubmissionIncompleteError) {
        setSaved({ ...saved, report: { ...saved.report, missing: cause.missing } })
        setError('La campaña no se envió. Completa los campos señalados.')
      } else if (cause instanceof SessionError && cause.status === 403) {
        setError('Tu cuenta necesita el rol Creador para enviar la campaña.')
      } else if (cause instanceof SessionError && cause.status === 409) {
        const latest = await readSubmission(id).catch(() => null)
        if (latest) { setSaved({ ...saved, report: latest }); onStatusChange(latest.status) }
        setError(latest?.status === 'IN_REVIEW' ? '' : 'El estado de la campaña cambió. Revisa la información actual antes de intentar otra vez.')
      } else setError('No se confirmó el envío. Comprueba la conexión e inténtalo de nuevo.')
    } finally { setSending(false) }
  }

  if (error && !saved) return <Message tone="error" title="Revisión no disponible">{error}</Message>
  if (!saved) return <p role="status">Cargando campaña guardada…</p>
  const { draft, general, story, indicators, cover, plan, budget, funding, rewards, report } = saved
  const editable = report.status === 'DRAFT' || report.status === 'CHANGES_REQUESTED'
  const modality = { DONATION: 'Donación', REWARD: 'Recompensas', PRESALE: 'Preventa' }[draft.campaignType] ?? draft.campaignType
  const difference = funding.goalAmount === null ? null : budgetTotal(budget) - funding.goalAmount
  return <section aria-label="Revisión y envío de campaña">
    <h3>Revisión de datos guardados</h3>
    <p>Modalidad: {modality}</p>
    <p><strong>{general.title}</strong> · {general.summary}</p>
    <p>{general.location.locality} · {general.location.countryCode}</p>
    {cover && <img src={coverImageUrl(cover)} alt={cover.altText} style={{ maxWidth: '100%', maxHeight: 260 }} />}
    <h4>Historia e impacto</h4>
    <p>{story.problem}</p><p>{story.solution}</p><p>{story.beneficiaries}</p><p>{story.expectedResults}</p>
    <ul>{indicators.map((indicator, index) => <li key={index}>{indicator.name}: meta {indicator.targetValue ?? 'sin definir'} {indicator.unit}</li>)}</ul>
    <h4>Plan y presupuesto</h4>
    <ul>{plan.activities.map((activity, index) => <li key={index}>{activity.name} · {activity.responsibleName} · {activity.plannedStartOn} a {activity.plannedEndOn}</li>)}</ul>
    {plan.milestones.length > 0 && <><h5>Hitos</h5><ul>{plan.milestones.map((milestone, index) => <li key={index}>{milestone.name} · {milestone.responsibleName} · {milestone.plannedStartOn} a {milestone.plannedEndOn}</li>)}</ul></>}
    <h5>Partidas</h5><ul>{budget.items.map((item, index) => <li key={index}>{item.description} · {item.quantity} × {item.unitPrice} · importe {item.plannedAmount}</li>)}</ul>
    <p>Total planificado: {budgetTotal(budget).toFixed(2)}</p>
    {difference !== null && Math.abs(difference) >= 0.01 && <p role="note">El presupuesto {difference > 0 ? 'supera' : 'está por debajo de'} la meta por {Math.abs(difference).toFixed(2)} {funding.currencyCode}. Esta diferencia no impide el envío.</p>}
    {budget.risks.length > 0 && <><h5>Riesgos</h5><ul>{budget.risks.map((risk, index) => <li key={index}>{risk.title} · {risk.mitigation}</li>)}</ul></>}
    <h4>Financiamiento</h4>
    <p>Meta: {funding.goalAmount ?? 'sin definir'} {funding.currencyCode} · {funding.durationDays ?? 'sin definir'} días · {funding.fundingModel || 'sin modelo'}</p>
    {(funding.startsAt || funding.endsAt) && <p>Periodo: {funding.startsAt?.slice(0, 10)} a {funding.endsAt?.slice(0, 10)}</p>}
    {rewards.length > 0 && <><h4>Recompensas y preventas</h4><ul>{rewards.map((reward, index) => <li key={index}>{reward.title} · {reward.description} · mínimo {reward.minAmount} {funding.currencyCode} · disponibilidad {reward.quantityTotal ?? 'sin límite'} · entrega {reward.estimatedDeliveryOn ?? 'sin fecha'}</li>)}</ul></>}

    {report.status === 'CHANGES_REQUESTED' && <section aria-label="Observaciones del revisor">
      <h4>Cambios solicitados</h4>
      {report.observations.length ? <ul>{report.observations.map((observation, index) => <li key={index}>
        {observation.message} <Button variant="secondary" onClick={() => onGoTo(observationStep(observation.section))}>Corregir sección</Button>
      </li>)}</ul> : <p>El revisor solicitó cambios. Consulta las secciones y vuelve a enviar cuando estén completas.</p>}
    </section>}
    {report.missing.length > 0 && <section aria-label="Faltantes de la campaña"><h4>Falta completar</h4>
      <ul>{report.missing.map(item => <li key={item.field}>{item.label} <Button variant="secondary" onClick={() => onGoTo(item.step)}>Ir al paso {item.step + 1}</Button></li>)}</ul>
    </section>}
    {error && <Message tone="error" title="No se pudo enviar">{error}</Message>}
    {report.status === 'IN_REVIEW' && <Message tone="success" title="Campaña recibida">Tu campaña está pendiente de revisión.</Message>}
    {editable && <Button disabled={sending || report.missing.length > 0} onClick={() => { void submit() }}>
      {sending ? 'Enviando…' : report.status === 'CHANGES_REQUESTED' ? 'Reenviar a revisión' : 'Enviar a revisión'}
    </Button>}
  </section>
}
