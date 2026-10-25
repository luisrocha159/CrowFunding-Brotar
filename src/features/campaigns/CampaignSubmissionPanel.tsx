import { useEffect, useRef, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { Message } from '../../shared/components/Feedback'
import { SessionError } from '../access/session/sessionClient'
import { readCoverDraft, coverImageUrl, type CoverDraft } from '../campaign-drafts/coverDraftClient'
import { readDraft, readGeneral, readStory, type Category, type Draft, type GeneralInput, type IndicatorInput, type StoryInput } from './campaignsClient'
import { budgetTotal, readBudget, readFunding, readPlan, readRewards, type BudgetInput, type FundingInput, type PlanInput, type RewardInput } from './sectionsClient'
import { observationStep, readSubmission, submitCampaign, SubmissionIncompleteError, type SubmissionReport } from './submissionClient'

interface Props { id: string; categories: Category[]; onGoTo: (step: number) => void; onStatusChange: (status: string) => void; onBusyChange: (busy: boolean) => void }
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

/** Usa exclusivamente respuestas persistidas; el servidor calcula los faltantes. */
export function CampaignSubmissionPanel({ id, categories, onGoTo, onStatusChange, onBusyChange }: Props) {
  const [saved, setSaved] = useState<Saved | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [retry, setRetry] = useState(0)
  const active = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; onBusyChange(false) } }, [onBusyChange])
  useEffect(() => {
    let mounted = true
    void Promise.all([readDraft(id), readGeneral(id), readStory(id), readCoverDraft(id), readPlan(id), readBudget(id), readFunding(id), readRewards(id), readSubmission(id)])
      .then(([draft, general, story, cover, plan, budget, funding, rewards, report]) => {
        if (mounted) setSaved({ draft, general, story: story.story, indicators: story.indicators, cover, plan, budget, funding, rewards, report })
      })
      .catch(() => { if (mounted) setError('No se pudo cargar la revisión. Reintenta al volver a este paso.') })
    return () => { mounted = false }
  }, [id, retry])

  async function submit() {
    if (!saved || active.current || saved.report.missing.length) return
    active.current = true
    setSending(true); onBusyChange(true); setError('')
    try {
      const report = await submitCampaign(id)
      if (!mounted.current) return
      setSaved({ ...saved, report }); onStatusChange(report.status)
    } catch (cause) {
      if (!mounted.current) return
      if (cause instanceof SubmissionIncompleteError) {
        setSaved({ ...saved, report: { ...saved.report, missing: cause.missing } })
        setError('La campaña no se envió. Completa los campos señalados.')
      } else if (cause instanceof SessionError && cause.status === 429) {
        setError('Demasiados intentos. Espera un minuto antes de volver a enviar; tu borrador se conserva.')
      } else if (cause instanceof SessionError && cause.status === 403) {
        setError('Tu cuenta necesita CREATOR para enviar la campaña. Solicita al administrador la habilitación provisional en Administración → Usuarios. Tu borrador sigue guardado y editable; elegir Creador al registrarte no concede ese permiso.')
      } else if (cause instanceof SessionError && cause.status === 409) {
        const latest = await readSubmission(id).catch(() => null)
        if (!mounted.current) return
        if (latest) { setSaved({ ...saved, report: latest }); onStatusChange(latest.status) }
        setError(latest?.status === 'IN_REVIEW' ? '' : 'El estado de la campaña cambió. Revisa la información actual antes de intentar otra vez.')
      } else setError('No se confirmó el envío. Comprueba la conexión e inténtalo de nuevo.')
    } finally { active.current = false; if (mounted.current) { setSending(false); onBusyChange(false) } }
  }

  if (error && !saved) return <><Message tone="error" title="Revisión no disponible">{error}</Message><Button onClick={() => { setError(''); setRetry(value => value + 1) }}>Reintentar</Button></>
  if (!saved) return <p role="status">Cargando campaña guardada…</p>
  const { draft, general, story, indicators, cover, plan, budget, funding, rewards, report } = saved
  const editable = report.status === 'DRAFT' || report.status === 'CHANGES_REQUESTED'
  const modality = { DONATION: 'Donación', REWARD: 'Recompensas', PRESALE: 'Preventa' }[draft.campaignType] ?? draft.campaignType
  const difference = funding.goalAmount === null ? null : budgetTotal(budget) - funding.goalAmount
  return <section aria-label="Revisión y envío de campaña">
    <h3>Revisión de datos guardados</h3>
    <p>Modalidad: {modality}</p>
    <p><strong>{general.title}</strong> · {general.summary}</p>
    <p>Categoría: {categories.find(category => category.id === draft.categoryId)?.name ?? 'Sin categoría activa'}</p>
    <p>{general.location.locality} · {general.location.countryCode}</p>
    {cover && <img src={coverImageUrl(cover)} alt={cover.altText} style={{ maxWidth: '100%', maxHeight: 260 }} />}
    <h4>Historia e impacto</h4>
    <p><strong>Problema:</strong> {story.problem}</p><p><strong>Solución:</strong> {story.solution}</p><p><strong>Beneficiarios:</strong> {story.beneficiaries}</p><p><strong>Resultados esperados:</strong> {story.expectedResults}</p>
    <ul>{indicators.map((indicator, index) => <li key={index}>{indicator.name}: meta {indicator.targetValue ?? 'sin definir'} {indicator.unit} · línea base {indicator.baselineValue ?? 'sin definir'}{indicator.description && <p>{indicator.description}</p>}</li>)}</ul>
    <h4>Plan y presupuesto</h4>
    <ul>{plan.activities.map((activity, index) => <li key={index}>{activity.name} · {activity.responsibleName} · {activity.plannedStartOn} a {activity.plannedEndOn}</li>)}</ul>
    {plan.milestones.length > 0 && <><h5>Hitos</h5><ul>{plan.milestones.map((milestone, index) => <li key={index}>{milestone.name} · {milestone.responsibleName} · {milestone.plannedStartOn} a {milestone.plannedEndOn} · actividades: {milestone.activityIndexes.length ? milestone.activityIndexes.map(activityIndex => plan.activities[activityIndex]?.name ?? 'no disponible').join(', ') : 'sin vínculo'}</li>)}</ul></>}
    <h5>Partidas</h5><ul>{budget.items.map((item, index) => <li key={index}>{item.description} · {item.quantity} × {item.unitPrice} · importe {item.plannedAmount}{item.notes && <p>Notas: {item.notes}</p>}</li>)}</ul>
    <p>Total planificado: {budgetTotal(budget).toFixed(2)}</p>
    {difference !== null && Math.abs(difference) >= 0.01 && <p role="note">El presupuesto {difference > 0 ? 'supera' : 'está por debajo de'} la meta por {Math.abs(difference).toFixed(2)} {funding.currencyCode}. Esta diferencia no impide el envío.</p>}
    {budget.risks.length > 0 && <><h5>Riesgos</h5><ul>{budget.risks.map((risk, index) => <li key={index}>{risk.title} · {risk.description} · probabilidad {risk.likelihood || 'sin especificar'} · impacto {risk.impact || 'sin especificar'} · mitigación {risk.mitigation}</li>)}</ul></>}
    <h4>Financiamiento</h4>
    <p>Meta: {funding.goalAmount ?? 'sin definir'} {funding.currencyCode} · {funding.durationDays ?? 'sin definir'} días · {{ FLEXIBLE: 'Flexible', ALL_OR_NOTHING: 'Todo o nada' }[funding.fundingModel] || 'sin modelo'}</p>
    {(funding.startsAt || funding.endsAt) && <p>Periodo: {funding.startsAt?.slice(0, 10)} a {funding.endsAt?.slice(0, 10)}</p>}
    {draft.campaignType !== 'DONATION' && rewards.length > 0 && <><h4>Recompensas y preventas</h4><ul>{rewards.map((reward, index) => <li key={index}>{reward.title} · {reward.description} · tipo {reward.rewardKind} · mínimo {reward.minAmount} {funding.currencyCode} · disponibilidad {reward.quantityTotal ?? 'sin límite'} · entrega {reward.estimatedDeliveryOn ?? 'sin fecha'}</li>)}</ul></>}

    {report.status === 'CHANGES_REQUESTED' && <section aria-label="Observaciones del revisor">
      <h4>Cambios solicitados</h4>
      {report.observations.length ? <ul>{report.observations.map((observation, index) => <li key={index}>
        {observation.message} <Button variant="secondary" onClick={() => onGoTo(observationStep(observation.section))}>Corregir sección</Button>
      </li>)}</ul> : <p>El revisor solicitó cambios. Consulta las secciones y vuelve a enviar cuando estén completas.</p>}
    </section>}
    {report.missing.length > 0 && <section aria-label="Faltantes de la campaña"><h4>Falta completar</h4>
      <ul>{report.missing.map(item => <li key={item.field}>{item.label} <Button variant="secondary" onClick={() => onGoTo(item.step)}>Ir al paso {item.step + 1}</Button></li>)}</ul>
    </section>}
    {report.duplicateWarning && <Message tone="info" title="Aviso orientativo de semejanzas">{report.duplicateWarning}</Message>}
    {error && <Message tone="error" title="No se pudo enviar">{error}</Message>}
    {report.status === 'IN_REVIEW' && <Message tone="success" title="Campaña recibida">Tu campaña está pendiente de revisión.</Message>}
    {editable && <Button disabled={sending || report.missing.length > 0} onClick={() => { void submit() }}>
      {sending ? 'Enviando…' : report.status === 'CHANGES_REQUESTED' ? 'Reenviar a revisión' : 'Enviar a revisión'}
    </Button>}
  </section>
}
