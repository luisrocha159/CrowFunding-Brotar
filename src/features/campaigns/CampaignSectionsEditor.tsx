import { useEffect, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { DraftFieldError } from './campaignsClient'
import styles from '../access/access.module.css'
import { budgetTotal, readBudget, readFunding, readPlan, readRewards, readSectionCatalogs, saveBudget, saveFunding, savePlan, saveRewards,
  type BudgetInput, type FundingInput, type PlanInput, type RewardInput, type SectionCatalogs } from './sectionsClient'

const newActivity = () => ({ name: '', responsibleName: '', plannedStartOn: '', plannedEndOn: '' })
const newMilestone = () => ({ ...newActivity(), activityIndex: null as number | null })
const newItem = () => ({ categoryId: '', description: '', quantity: 1, unitPrice: 0, plannedAmount: 0, notes: '' })
const newRisk = () => ({ title: '', description: '', likelihood: '', impact: '', mitigation: '' })
const newReward = () => ({ title: '', description: '', rewardKind: '', minAmount: 0, quantityTotal: null as number | null, estimatedDeliveryOn: null as string | null })
const day = (value: string | null) => value?.slice(0, 10) ?? ''
const instant = (value: string) => value ? `${value}T00:00:00.000Z` : null

interface Props { id: string; step: number; editable: boolean; campaignType: string; onBusyChange: (busy: boolean) => void }

/** Edición progresiva de las secciones persistidas del constructor. */
export function CampaignSectionsEditor({ id, step, editable, campaignType, onBusyChange }: Props) {
  const [plan, setPlan] = useState<PlanInput | null>(null)
  const [budget, setBudget] = useState<BudgetInput | null>(null)
  const [funding, setFunding] = useState<FundingInput | null>(null)
  const [rewards, setRewards] = useState<RewardInput[] | null>(null)
  const [catalogs, setCatalogs] = useState<SectionCatalogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([readPlan(id, controller.signal), readBudget(id, controller.signal), readFunding(id, controller.signal),
      readRewards(id, controller.signal), readSectionCatalogs(id, controller.signal)])
      .then(([nextPlan, nextBudget, nextFunding, nextRewards, nextCatalogs]) => {
        if (controller.signal.aborted) return
        setPlan(nextPlan); setBudget(nextBudget); setFunding(nextFunding); setRewards(nextRewards); setCatalogs(nextCatalogs); setLoading(false)
      })
      .catch(() => { if (!controller.signal.aborted) { setError('No se pudieron cargar las secciones.'); setLoading(false) } })
    return () => controller.abort()
  }, [id])

  async function persist(action: () => Promise<void>) {
    if (saving || !editable) return
    setSaving(true); onBusyChange(true); setSaved(false); setError(''); setFields({})
    try { await action(); setSaved(true) }
    catch (cause) {
      if (cause instanceof DraftFieldError) { setFields(cause.fields); setError('Revisa los campos señalados.') }
      else setError('No se confirmó el guardado. Conservamos tus datos para reintentar.')
    } finally { setSaving(false); onBusyChange(false) }
  }

  if (loading) return <p role="status">Cargando datos guardados…</p>
  if (!plan || !budget || !funding || !rewards || !catalogs) return <Message tone="error" title="Secciones no disponibles">{error}</Message>

  return <section aria-label="Configuración de campaña" onChange={() => setSaved(false)}>
    {saved && <Message tone="success" title="Sección guardada">Los datos quedaron persistidos.</Message>}
    {error && <Message tone="error" title="No se pudo guardar">{error}</Message>}
    <fieldset disabled={saving || !editable} style={{ border: 0, padding: 0, margin: 0 }}>

    {step === 4 && <>
      <h3>Actividades e hitos</h3>
      <form className={styles.form} onSubmit={event => { event.preventDefault(); void persist(async () => setPlan(await savePlan(id, plan))) }}>
        {plan.activities.map((activity, index) => <fieldset key={index}><legend>Actividad {index + 1}</legend>
          <FormField id={`activity-name-${index}`} label="Actividad" error={fields[`activities.${index}.name`]}><input id={`activity-name-${index}`} value={activity.name} maxLength={200} disabled={!editable} onChange={event => setPlan({ ...plan, activities: plan.activities.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></FormField>
          <FormField id={`activity-responsible-${index}`} label="Responsable" error={fields[`activities.${index}.responsibleName`]}><input id={`activity-responsible-${index}`} value={activity.responsibleName} maxLength={160} disabled={!editable} onChange={event => setPlan({ ...plan, activities: plan.activities.map((item, i) => i === index ? { ...item, responsibleName: event.target.value } : item) })} /></FormField>
          <FormField id={`activity-start-${index}`} label="Inicio previsto" error={fields[`activities.${index}.plannedStartOn`]}><input id={`activity-start-${index}`} type="date" value={activity.plannedStartOn} disabled={!editable} onChange={event => setPlan({ ...plan, activities: plan.activities.map((item, i) => i === index ? { ...item, plannedStartOn: event.target.value } : item) })} /></FormField>
          <FormField id={`activity-end-${index}`} label="Fin previsto" error={fields[`activities.${index}.plannedEndOn`]}><input id={`activity-end-${index}`} type="date" value={activity.plannedEndOn} disabled={!editable} onChange={event => setPlan({ ...plan, activities: plan.activities.map((item, i) => i === index ? { ...item, plannedEndOn: event.target.value } : item) })} /></FormField>
          <Button variant="secondary" disabled={!editable} onClick={() => setPlan({ ...plan, activities: plan.activities.filter((_, i) => i !== index), milestones: plan.milestones.map(milestone => ({ ...milestone, activityIndex: milestone.activityIndex === index ? null : milestone.activityIndex !== null && milestone.activityIndex > index ? milestone.activityIndex - 1 : milestone.activityIndex })) })}>Quitar actividad</Button>
        </fieldset>)}
        {fields.activities && <p role="alert">{fields.activities}</p>}
        <Button variant="secondary" disabled={!editable || plan.activities.length >= 50} onClick={() => setPlan({ ...plan, activities: [...plan.activities, newActivity()] })}>Añadir actividad</Button>
        {plan.milestones.map((milestone, index) => <fieldset key={index}><legend>Hito {index + 1}</legend>
          <FormField id={`milestone-name-${index}`} label="Hito" error={fields[`milestones.${index}.name`]}><input id={`milestone-name-${index}`} value={milestone.name} maxLength={200} disabled={!editable} onChange={event => setPlan({ ...plan, milestones: plan.milestones.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></FormField>
          <FormField id={`milestone-responsible-${index}`} label="Responsable" error={fields[`milestones.${index}.responsibleName`]}><input id={`milestone-responsible-${index}`} value={milestone.responsibleName} maxLength={160} disabled={!editable} onChange={event => setPlan({ ...plan, milestones: plan.milestones.map((item, i) => i === index ? { ...item, responsibleName: event.target.value } : item) })} /></FormField>
          <FormField id={`milestone-activity-${index}`} label="Actividad relacionada" error={fields[`milestones.${index}.activityIndex`]}><select id={`milestone-activity-${index}`} value={milestone.activityIndex ?? ''} disabled={!editable} onChange={event => setPlan({ ...plan, milestones: plan.milestones.map((item, i) => i === index ? { ...item, activityIndex: event.target.value === '' ? null : Number(event.target.value) } : item) })}><option value="">Sin relación</option>{plan.activities.map((activity, i) => <option key={i} value={i}>{activity.name || `Actividad ${i + 1}`}</option>)}</select></FormField>
          {(['plannedStartOn', 'plannedEndOn'] as const).map(field => <FormField key={field} id={`milestone-${field}-${index}`} label={field === 'plannedStartOn' ? 'Inicio previsto' : 'Fin previsto'} error={fields[`milestones.${index}.${field}`]}><input id={`milestone-${field}-${index}`} type="date" value={milestone[field]} disabled={!editable} onChange={event => setPlan({ ...plan, milestones: plan.milestones.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item) })} /></FormField>)}
          <Button variant="secondary" disabled={!editable} onClick={() => setPlan({ ...plan, milestones: plan.milestones.filter((_, i) => i !== index) })}>Quitar hito</Button>
        </fieldset>)}
        <Button variant="secondary" disabled={!editable || plan.milestones.length >= 50} onClick={() => setPlan({ ...plan, milestones: [...plan.milestones, newMilestone()] })}>Añadir hito</Button>
        <Button type="submit" disabled={!editable || saving}>Guardar planificación</Button>
      </form>

      <h3>Presupuesto y riesgos</h3>
      <form className={styles.form} onSubmit={event => { event.preventDefault(); void persist(async () => setBudget(await saveBudget(id, budget))) }}>
        {budget.items.map((item, index) => <fieldset key={index}><legend>Partida {index + 1}</legend>
          <FormField id={`item-category-${index}`} label="Categoría de gasto" error={fields[`items.${index}.categoryId`]}><select id={`item-category-${index}`} value={item.categoryId} disabled={!editable} onChange={event => setBudget({ ...budget, items: budget.items.map((row, i) => i === index ? { ...row, categoryId: event.target.value } : row) })}><option value="">Selecciona una categoría</option>{catalogs.expenseCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormField>
          <FormField id={`item-description-${index}`} label="Descripción" error={fields[`items.${index}.description`]}><input id={`item-description-${index}`} value={item.description} maxLength={300} disabled={!editable} onChange={event => setBudget({ ...budget, items: budget.items.map((row, i) => i === index ? { ...row, description: event.target.value } : row) })} /></FormField>
          {(['quantity', 'unitPrice', 'plannedAmount'] as const).map(field => <FormField key={field} id={`item-${field}-${index}`} label={field === 'quantity' ? 'Cantidad' : field === 'unitPrice' ? 'Precio unitario' : 'Importe planificado'} error={fields[`items.${index}.${field}`]}><input id={`item-${field}-${index}`} type="number" min="0.01" step="0.01" value={item[field]} disabled={!editable} onChange={event => setBudget({ ...budget, items: budget.items.map((row, i) => i === index ? { ...row, [field]: Number(event.target.value) } : row) })} /></FormField>)}
          <Button variant="secondary" disabled={!editable} onClick={() => setBudget({ ...budget, items: budget.items.filter((_, i) => i !== index) })}>Quitar partida</Button>
        </fieldset>)}
        {fields.items && <p role="alert">{fields.items}</p>}
        <Button variant="secondary" disabled={!editable || budget.items.length >= 50} onClick={() => setBudget({ ...budget, items: [...budget.items, newItem()] })}>Añadir partida</Button>
        <p>Total planificado: {budgetTotal(budget).toFixed(2)}</p>
        {budget.risks.map((risk, index) => <fieldset key={index}><legend>Riesgo {index + 1}</legend>
          {(['title', 'description', 'likelihood', 'impact', 'mitigation'] as const).map(field => <FormField key={field} id={`risk-${field}-${index}`} label={{ title: 'Riesgo', description: 'Descripción', likelihood: 'Probabilidad', impact: 'Impacto', mitigation: 'Mitigación' }[field]} error={fields[`risks.${index}.${field}`]}><input id={`risk-${field}-${index}`} value={risk[field]} disabled={!editable} onChange={event => setBudget({ ...budget, risks: budget.risks.map((row, i) => i === index ? { ...row, [field]: event.target.value } : row) })} /></FormField>)}
          <Button variant="secondary" disabled={!editable} onClick={() => setBudget({ ...budget, risks: budget.risks.filter((_, i) => i !== index) })}>Quitar riesgo</Button>
        </fieldset>)}
        <Button variant="secondary" disabled={!editable || budget.risks.length >= 50} onClick={() => setBudget({ ...budget, risks: [...budget.risks, newRisk()] })}>Añadir riesgo</Button>
        <Button type="submit" disabled={!editable || saving}>Guardar presupuesto y riesgos</Button>
      </form>
    </>}

    {step === 5 && <form className={styles.form} onSubmit={event => { event.preventDefault(); void persist(async () => setFunding(await saveFunding(id, funding))) }}>
      <h3>Financiamiento</h3><p>Configura la meta y el periodo. Esta etapa no activa pagos.</p>
      <FormField id="funding-goal" label="Meta" error={fields.goalAmount}><input id="funding-goal" type="number" min="0.01" step="0.01" value={funding.goalAmount ?? ''} disabled={!editable} onChange={event => setFunding({ ...funding, goalAmount: event.target.value ? Number(event.target.value) : null })} /></FormField>
      <FormField id="funding-currency" label="Moneda" error={fields.currencyCode}><select id="funding-currency" value={funding.currencyCode} disabled={!editable} onChange={event => setFunding({ ...funding, currencyCode: event.target.value })}><option value="">Selecciona una moneda</option>{catalogs.currencies.map(currency => <option key={currency.code} value={currency.code}>{currency.name} ({currency.code})</option>)}</select></FormField>
      <FormField id="funding-duration" label="Duración (días)" error={fields.durationDays}><input id="funding-duration" type="number" min="1" step="1" value={funding.durationDays ?? ''} disabled={!editable} onChange={event => setFunding({ ...funding, durationDays: event.target.value ? Number(event.target.value) : null })} /></FormField>
      <FormField id="funding-model" label="Modelo" error={fields.fundingModel}><select id="funding-model" value={funding.fundingModel} disabled={!editable} onChange={event => setFunding({ ...funding, fundingModel: event.target.value })}><option value="">Selecciona un modelo</option><option value="ALL_OR_NOTHING">Todo o nada</option><option value="FLEXIBLE">Flexible</option></select></FormField>
      {(['startsAt', 'endsAt'] as const).map(field => <FormField key={field} id={`funding-${field}`} label={field === 'startsAt' ? 'Fecha de inicio (opcional)' : 'Fecha de fin (opcional)'} error={fields[field]}><input id={`funding-${field}`} type="date" value={day(funding[field])} disabled={!editable} onChange={event => setFunding({ ...funding, [field]: instant(event.target.value) })} /></FormField>)}
      <Button type="submit" disabled={!editable || saving}>Guardar financiamiento</Button>
    </form>}

    {step === 6 && <>
      <h3>Recompensas y preventas</h3>
      {campaignType === 'DONATION' ? <p>La modalidad donación omite este paso. Las recompensas anteriores se conservan si cambias de modalidad.</p> : <form className={styles.form} onSubmit={event => { event.preventDefault(); void persist(async () => setRewards(await saveRewards(id, rewards))) }}>
        {rewards.map((reward, index) => <fieldset key={index}><legend>Recompensa {index + 1}</legend>
          {(['title', 'description', 'rewardKind'] as const).map(field => <FormField key={field} id={`reward-${field}-${index}`} label={{ title: 'Título', description: 'Descripción', rewardKind: 'Tipo' }[field]} error={fields[`rewards.${index}.${field}`]}><input id={`reward-${field}-${index}`} value={reward[field]} disabled={!editable} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, [field]: event.target.value } : row))} /></FormField>)}
          <FormField id={`reward-min-${index}`} label="Aporte mínimo" error={fields[`rewards.${index}.minAmount`]}><input id={`reward-min-${index}`} type="number" min="0.01" step="0.01" value={reward.minAmount} disabled={!editable} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, minAmount: Number(event.target.value) } : row))} /></FormField>
          <FormField id={`reward-quantity-${index}`} label="Disponibilidad (vacío = sin límite)" error={fields[`rewards.${index}.quantityTotal`]}><input id={`reward-quantity-${index}`} type="number" min="0" step="1" value={reward.quantityTotal ?? ''} disabled={!editable} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, quantityTotal: event.target.value === '' ? null : Number(event.target.value) } : row))} /></FormField>
          <FormField id={`reward-date-${index}`} label="Entrega estimada" error={fields[`rewards.${index}.estimatedDeliveryOn`]}><input id={`reward-date-${index}`} type="date" value={reward.estimatedDeliveryOn ?? ''} disabled={!editable} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, estimatedDeliveryOn: event.target.value || null } : row))} /></FormField>
          <Button variant="secondary" disabled={!editable} onClick={() => setRewards(rewards.filter((_, i) => i !== index))}>Quitar recompensa</Button>
        </fieldset>)}
        {fields.rewards && <p role="alert">{fields.rewards}</p>}
        <Button variant="secondary" disabled={!editable || rewards.length >= 50} onClick={() => setRewards([...rewards, newReward()])}>Añadir recompensa</Button>
        <Button type="submit" disabled={!editable || saving}>Guardar recompensas</Button>
      </form>}
    </>}
    </fieldset>
  </section>
}
